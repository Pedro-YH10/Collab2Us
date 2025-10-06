import * as Miro from "./miro";
import * as Trello from "./trello";

export interface ConvertOptions {
  listStrategy?: "first" | "byName" | "byTag";
  listName?: string;
  template?: "userStory" | "raw";
  miroToken?: string;
  trelloToken?: string;
}

interface StickyNoteItem {
  id: string;
  text: string;
  tags: string[];
}

interface MiroConnector {
  id: string;
  startItem: { id: string; };
  endItem: { id: string; };
}

//Helper para mapear itens por ID
function mapItemsById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map(item => [item.id, item]));
}

//Constrói um mapa de conexões entre sticky notes
function buildDirectedConnections(connectors: MiroConnector[], stickyNotesMap: Map<string, StickyNoteItem>): Map<string, string[]> {
  const connections = new Map<string, string[]>();

  for (const connector of connectors) {
    const startItemId = connector.startItem.id;
    const endItemId = connector.endItem.id;

    //Apenas pega conexões entre sticky notes:
    if (stickyNotesMap.has(startItemId) && stickyNotesMap.has(endItemId)) {
      if (!connections.has(startItemId)) {
        connections.set(startItemId, []);
      }
      connections.get(startItemId)?.push(endItemId);
    }
  }
  return connections;
}

//Identifica os sticky notes que são start de uma história de usuário:
function findStartingStickyNotes(stickyNotesMap: Map<string, StickyNoteItem>, connectionsMap: Map<string, string[]>): string[] {
  const allEndItems = new Set<string>();
  for (const connectedItems of connectionsMap.values()) {
    for (const itemId of connectedItems) {
      allEndItems.add(itemId);
    }
  }

  const startingNotes: string[] = [];
  for (const stickyId of stickyNotesMap.keys()) {
    //Um sticky note é um startItem se não é um endItem de nenhuma conexão de outro sticky note:
    if (!allEndItems.has(stickyId)) {
      startingNotes.push(stickyId);
    }
  }
  return startingNotes;
}

//Pega uma história de usuário e seus critérios de uma sequência de sticky notes conectados:
function extractStoryFromSequence(startNodeId: string, stickyNotesMap: Map<string, StickyNoteItem>, connectionsMap: Map<string, string[]>): { story: StickyNoteItem[], criteria: StickyNoteItem[], allTags: string[] } {
  const storyParts: StickyNoteItem[] = [];
  const criteriaParts: StickyNoteItem[] = [];
  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  const allTags: string[] = [];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentSticky = stickyNotesMap.get(currentId);
    if (!currentSticky) continue;
    
    //Os 3 primeiros como "Como, Quero, Para":
    if (storyParts.length < 3) {
      storyParts.push(currentSticky);
    //Os outros são critérios extras:
    } else {
      criteriaParts.push(currentSticky);
    }

    //Pega todas as tags:
    if (currentSticky.tags) {
      allTags.push(...currentSticky.tags);
    }

    const nextItems = connectionsMap.get(currentId);
    if (nextItems) {
      for (const nextId of nextItems) {
        if (!visited.has(nextId) && stickyNotesMap.has(nextId)) {
          queue.push(nextId);
        }
      }
    }
  }
  return { story: storyParts, criteria: criteriaParts, allTags: Array.from(new Set(allTags)) }; //Remove tags duplicadas
}

//Função para limpar tags HTML do texto:
function sanitizeText(text: string): string {
  //Remove tags HTML usando regex:
  return text.replace(/<[^>]*>/g, '');
}

// Formata a história e os critérios para o Trello, garantindo que o texto esteja limpo
function formatStoryForTrello(storyParts: StickyNoteItem[], criteriaParts: StickyNoteItem[], allTags: string[], template: "userStory" | "raw") {
  let title = "História de Usuário";
  let desc = "";
  const labels = allTags;

  if (template === "raw") {
    // Sanitize text for raw template title and description
    title = sanitizeText(storyParts.map(p => p.text).join(" ")).slice(0, 60);
    desc = [...storyParts, ...criteriaParts].map(p => sanitizeText(p.text)).join("\n\n");
  } else { // userStory template
    const partTexts = storyParts.map(p => sanitizeText(p.text)); // Sanitize text for each part
    const how = partTexts[0] || "";
    const what = partTexts[1] || "";
    const why = partTexts[2] || "";

    title = what.slice(0, 80) || "História de Usuário"; // O "Quero" como título

    let storyLine = "";
    if (how) storyLine += `Como ${how}`;
    if (what) storyLine += `${how ? ', ' : ''}quero ${what}`;
    if (why) storyLine += `${(how || what) ? ', ' : ''}para ${why}`;

    const descriptionParts: string[] = [];
    if (storyLine) descriptionParts.push(`**História:** ${storyLine}`);

    if (criteriaParts.length > 0) {
      descriptionParts.push(`**Critérios de Aceitação:**\n- ${criteriaParts.map(c => sanitizeText(c.text)).join("\n- ")}`);
    }
    if (labels.length > 0) {
      descriptionParts.push(`**Etiquetas:** ${labels.join(", ")}`);
    }

    desc = descriptionParts.join("\n\n");
  }

  return { title, desc, labels };
}

export async function getFormattedMiroStories(miroBoardId: string, options: Pick<ConvertOptions, "template" | "miroToken"> = {}) {
  const allStickyNotes = await Miro.listStickyNotes(miroBoardId, options.miroToken);
  const connectors = await Miro.getAllConnectors(miroBoardId, options.miroToken);

  const stickyNotesMap = mapItemsById(allStickyNotes);
  const connectionsMap = buildDirectedConnections(connectors, stickyNotesMap);
  const startingNotesIds = findStartingStickyNotes(stickyNotesMap, connectionsMap);

  const formattedStories: { id: string; title: string; desc: string; labels: string[] }[] = [];

  for (const startNodeId of startingNotesIds) {
    const { story, criteria, allTags } = extractStoryFromSequence(startNodeId, stickyNotesMap, connectionsMap);

    if (story.length === 0) {
      continue;
    }

    const { title, desc, labels } = formatStoryForTrello(story, criteria, allTags, options.template || "userStory");
    formattedStories.push({ id: startNodeId, title, desc, labels });
  }

  return formattedStories;
}

export async function convertMiroToTrello(miroBoardId: string, trelloBoardId: string, options: ConvertOptions = {}) {
  const formattedStories = await getFormattedMiroStories(miroBoardId, options);

  let lists = await Trello.getBoardLists(trelloBoardId, options.trelloToken);
  const pickDefaultList = () => (options.listStrategy === "byName" && options.listName ? lists.find((l) => l.name === options.listName) : lists[0]);
  let defaultList = pickDefaultList();
  if (!defaultList && options.listStrategy !== "byTag") throw new Error("Nenhuma lista encontrada no board do Trello");

  let created = 0;
  const details: string[] = [];

  for (const story of formattedStories) {
    let targetListId = defaultList?.id as string | undefined;
    if (options.listStrategy === "byTag") {
      const tag = story.labels.length > 0 ? story.labels[0] : "Sem Tag";
      let list = lists.find((l) => l.name === tag);
      if (!list) {
        list = await Trello.createList(trelloBoardId, tag, options.trelloToken);
        lists = await Trello.getBoardLists(trelloBoardId, options.trelloToken);
      }
      targetListId = list.id;
    }

    if (!targetListId) {
      details.push(`Could not determine target list for story: ${story.title}`);
      continue;
    }

    await Trello.createCard(targetListId as string, story.title, story.desc, story.labels, options.trelloToken);
    created++;
    details.push(`Card criado: ${story.title}`);
  }
  return { created, details };
}

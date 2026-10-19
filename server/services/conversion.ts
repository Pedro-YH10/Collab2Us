import * as Miro from "./miro";
import * as Trello from "./trello";
import { dbQuery, hasDb } from "../db";
import crypto from "node:crypto";
import type { Language } from "./ai";

export interface CuratedStory {
  miroItemId: string;
  title: string;
  desc: string;
  labels: string[];
  enabled?: boolean;
  score?: number;
  suggestions?: string[];
}

export interface StickyNoteItem {
  id: string;
  text: string;
  tags: string[];
  position?: { x: number; y: number };
}

interface MiroConnector {
  id: string;
  startItem: { id: string };
  endItem: { id: string };
}

// Gera o hash SHA-256 para detecção de divergência e rastreabilidade bidirecional
function computeContentHash(title: string, desc: string): string {
  const clean = `${title.trim()}||${desc.trim()}`.toLowerCase();
  return crypto.createHash("sha256").update(clean).digest("hex");
}

function mapItemsById<T extends { id: string }>(items: T[]): Map<string, T> {
  return new Map(items.map(item => [item.id, item]));
}

function buildDirectedConnections(connectors: MiroConnector[], stickyNotesMap: Map<string, StickyNoteItem>): Map<string, string[]> {
  const connections = new Map<string, string[]>();
  for (const connector of connectors) {
    const startId = connector.startItem?.id;
    const endId = connector.endItem?.id;

    if (startId && endId && stickyNotesMap.has(startId) && stickyNotesMap.has(endId)) {
      if (!connections.has(startId)) connections.set(startId, []);
      connections.get(startId)?.push(endId);
    }
  }
  return connections;
}

// Algoritmo DFS que percorre os conectores do Miro e agrupa notas interligadas em uma única história
function extractPaths(
  nodeId: string,
  stickyNotesMap: Map<string, StickyNoteItem>,
  connectionsMap: Map<string, string[]>,
  currentPath: string[],
  visited: Set<string>
): string[][] {
  if (visited.has(nodeId)) return [currentPath];

  const newVisited = new Set(visited);
  newVisited.add(nodeId);
  const newPath = [...currentPath, nodeId];

  const targets = connectionsMap.get(nodeId) || [];
  const validTargets = targets.filter(id => stickyNotesMap.has(id));

  if (validTargets.length === 0) return [newPath];

  const allPaths: string[][] = [];
  for (const target of validTargets) {
    const paths = extractPaths(target, stickyNotesMap, connectionsMap, newPath, newVisited);
    allPaths.push(...paths);
  }
  return allPaths;
}

// Remove tags HTML e caracteres especiais vindos do editor rico do Miro
function sanitizeText(text: string): string {
  if (!text) return "";
  let clean = text.replace(/<[^>]*>/g, "");
  clean = clean
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  return clean.trim();
}

// Identifica o papel do post-it pela palavra inicial (Como / Quero / Para)
function identifySemanticRole(text: string): "actor" | "action" | "benefit" | "situation" | "neutral" {
  const cleaned = text.toLowerCase().trim();
  if (/^(como|as a|as an)\s+/i.test(cleaned)) return "actor";
  if (/^(quero|quiero|desejo|deseo|gostaria|i want|i need|would like)\s+/i.test(cleaned)) return "action";
  if (/^(para|so that|in order to|para que|de modo a|a fin de|para eu)\s+/i.test(cleaned)) return "benefit";
  if (/^(quando|cuando|when)\s+/i.test(cleaned)) return "situation";
  return "neutral";
}

// Detecta automaticamente o idioma do conteúdo dos post-its
function detectContentLanguage(texts: string[], fallback: "pt" | "en" | "es" = "pt"): "pt" | "en" | "es" {
  const combined = texts.join(" ").toLowerCase();

  const hasPt = /\b(como|quero|desejo|gostaria|para que|de modo a|quando|usuário|cliente|comprador|sistema|cadastro|carrinho|pedidos)\b/i.test(combined);
  const hasEs = /\b(quiero|deseo|para que|a fin de|cuando|usuario|pantalla|botón)\b/i.test(combined);
  const hasEn = /\b(as a|as an|i want|i need|would like|so that|in order to|when|user|customer|buyer|checkout|cart)\b/i.test(combined);

  if (hasPt && !hasEn) return "pt";
  if (hasEs && !hasEn) return "es";
  if (hasEn && !hasPt && !hasEs) return "en";

  return fallback;
}

// Monta a estrutura da História de Usuário e anexa critérios BDD no idioma configurado
function assembleFlexibleStory(
  parts: string[], 
  criteriaList: string[], 
  templateFormat: "connextra" | "jtbd" | "custom" | "raw",
  customTemplateText?: string,
  preferredLanguage: Language = "pt"
): { title: string; desc: string } {
  const effectiveLanguage = detectContentLanguage(parts, preferredLanguage);
  const isEnglish = effectiveLanguage === "en";
  const isSpanish = effectiveLanguage === "es";

  let actor = "";
  let action = "";
  let benefit = "";
  let situation = "";
  const remaining: string[] = [];

  for (const part of parts) {
    const role = identifySemanticRole(part);
    const cleanedPart = part
      .replace(/^(como|as a|as an|quiero|deseo|quero|desejo|gostaria|i want|i need|would like|para|so that|in order to|para que|de modo a|cuando|quando|when)\s+/i, "")
      .trim();

    if (role === "actor") actor = cleanedPart;
    else if (role === "action") action = cleanedPart;
    else if (role === "benefit") benefit = cleanedPart;
    else if (role === "situation") situation = cleanedPart;
    else remaining.push(part);
  }

  if (!actor && parts[0]) actor = parts[0];
  if (!action && parts[1]) action = parts[1];
  if (!benefit && parts[2]) benefit = parts[2];
  if (!situation && parts[3]) situation = parts[3];

  const extras = remaining.filter(r => r !== actor && r !== action && r !== benefit && r !== situation);
  const finalCriteria = [...criteriaList, ...extras];

  const title = action 
    ? action.slice(0, 80) 
    : (isEnglish ? "User Story" : isSpanish ? "Historia de Usuario" : "História de Usuário");
    
  let desc = "";

  if (templateFormat === "raw") {
    desc = parts.join("\n\n");
  } else if (templateFormat === "jtbd") {
    desc = isEnglish
      ? `**Job Story:** When ${situation || "[situation]"}, I want to ${action || "[action]"}, so that I can ${benefit || "[outcome]"}`
      : isSpanish
        ? `**Job Story:** Cuando ${situation || "[situación]"}, quiero ${action || "[acción]"}, para que pueda ${benefit || "[resultado esperado]"}`
        : `**Job Story:** Quando ${situation || "[situação]"}, quero ${action || "[ação]"}, para que possa ${benefit || "[resultado esperado]"}`;
  } else if (templateFormat === "custom" && customTemplateText) {
    const customLabel = isEnglish ? "Custom Story" : isSpanish ? "Historia Personalizada" : "História Personalizada";
    desc = `**${customLabel}:** ` + customTemplateText
      .replace(/\[(ator|actor|rol)\]/gi, actor || "[actor]")
      .replace(/\[(ação|action|acción)\]/gi, action || "[action]")
      .replace(/\[(benefício|benefit|beneficio)\]/gi, benefit || "[benefit]")
      .replace(/\[(situação|situation|situación)\]/gi, situation || "[situation]");
  } else {
    desc = isEnglish
      ? `**Story:** As a ${actor || "[user]"}, I want to ${action || "[action]"}, so that ${benefit || "[benefit]"}`
      : isSpanish
        ? `**Historia:** Como ${actor || "[rol de usuario]"}, quiero ${action || "[realizar una acción]"}, para ${benefit || "[obtener un beneficio]"}`
        : `**História:** Como ${actor || "[tipo de usuário]"}, quero ${action || "[realizar uma ação]"}, para ${benefit || "[obter um benefício]"}`;
  }

  if (finalCriteria.length > 0) {
    const criteriaHeader = isEnglish 
      ? "\n\n**Acceptance Criteria:**\n- " 
      : isSpanish 
        ? "\n\n**Criterios de Aceptación:**\n- " 
        : "\n\n**Critérios de Aceitação:**\n- ";
    desc += criteriaHeader + finalCriteria.join("\n- ");
  }

  return { title, desc };
}

// Extrai e converte todas as notas do board, tratando caminhos conectados e notas soltas (órfãs)
export async function getFormattedMiroStories(
  miroBoardId: string,
  miroToken: string,
  conversionType: "auto" | "grafo" | "espacial" | "standalone",
  templateFormat: "connextra" | "jtbd" | "custom" | "raw",
  customTemplateText?: string,
  language: Language = "pt"
) {
  const allStickyNotes = await Miro.listStickyNotes(miroBoardId, miroToken);
  const connectors = await Miro.getAllConnectors(miroBoardId, miroToken);

  const stickyNotesMap = mapItemsById(allStickyNotes);
  const parsedStories: CuratedStory[] = [];
  const processedStickyIds = new Set<string>();

  const useGrafo = (conversionType === "auto" || conversionType === "grafo") && connectors.length > 0;
  if (useGrafo) {
    const connectionsMap = buildDirectedConnections(connectors, stickyNotesMap);
    const allEndItems = new Set<string>();
    for (const targets of connectionsMap.values()) {
      targets.forEach(id => allEndItems.add(id));
    }

    const startingNotes = Array.from(stickyNotesMap.keys()).filter(id => !allEndItems.has(id));

    for (const startId of startingNotes) {
      const paths = extractPaths(startId, stickyNotesMap, connectionsMap, [], new Set());
      for (const path of paths) {
        if (path.length > 1) {
          const pathStickies = path.map(id => stickyNotesMap.get(id)!).filter(Boolean);
          const rawTexts = pathStickies.map(p => sanitizeText(p.text));
          const tags = Array.from(new Set(pathStickies.flatMap(p => p.tags || [])));

          const { title, desc } = assembleFlexibleStory(rawTexts, [], templateFormat, customTemplateText, language);
          
          parsedStories.push({
            miroItemId: path.join(","),
            title,
            desc,
            labels: tags
          });

          path.forEach(id => processedStickyIds.add(id));
        }
      }
    }
  }

  // Agrupa notas por proximidade espacial (linhas horizontais) caso não haja conectores
  const orphans = allStickyNotes.filter(n => !processedStickyIds.has(n.id));

  // 1. Separa itens com posição definida dos sem posição
  const positioned = orphans.filter(n => n.position && typeof n.position.y === "number");
  const unpositioned = orphans.filter(n => !n.position || typeof n.position.y !== "number");

  // 2. Ordena por coordenada Y (de cima para baixo)
  positioned.sort((a, b) => (a.position!.y - b.position!.y));

  // 3. Clusteriza post-its que compartilham a mesma faixa horizontal (tolerância de até 140px de desvio vertical)
  const rowClusters: StickyNoteItem[][] = [];
  const ROW_Y_TOLERANCE = 140;

  for (const item of positioned) {
    let placed = false;
    for (const cluster of rowClusters) {
      const avgY = cluster.reduce((sum, el) => sum + el.position!.y, 0) / cluster.length;
      if (Math.abs(item.position!.y - avgY) <= ROW_Y_TOLERANCE) {
        cluster.push(item);
        placed = true;
        break;
      }
    }
    if (!placed) {
      rowClusters.push([item]);
    }
  }

  // 4. Para cada linha encontrada, ordena da esquerda para a direita (X) e consolida a História de Usuário
  for (const cluster of rowClusters) {
    if (cluster.length >= 2) {
      // Ordena visualmente: Ator (esquerda) -> Ação (centro) -> Benefício/Critérios (direita)
      cluster.sort((a, b) => (a.position!.x - b.position!.x));
      const rawTexts = cluster.map(p => sanitizeText(p.text));
      const tags = Array.from(new Set(cluster.flatMap(p => p.tags || [])));

      const { title, desc } = assembleFlexibleStory(rawTexts, [], templateFormat, customTemplateText, language);

      parsedStories.push({
        miroItemId: cluster.map(c => c.id).join(","),
        title,
        desc,
        labels: tags
      });

      cluster.forEach(c => processedStickyIds.add(c.id));
    }
  }

  // 5. Notas verdadeiramente isoladas (sem vizinhos na mesma linha) continuam individuais
  const trueSingles = orphans.filter(n => !processedStickyIds.has(n.id));

  for (const item of trueSingles) {
    const cleanText = sanitizeText(item.text);
    const noteLang = detectContentLanguage([cleanText], language || "pt");
    const descLabel = noteLang === "en" ? "**Description:** " : noteLang === "es" ? "**Descripción:** " : "**Descrição:** ";
    const defaultStoryTitle = noteLang === "en" ? "User Story" : noteLang === "es" ? "Historia de Usuario" : "História de Usuário";

    const title = cleanText.slice(0, 80) || defaultStoryTitle;
    const isAlreadyStory = /^(como|as a|as an|\*\*história|\*\*story|\*\*historia)/i.test(cleanText);
    const desc = templateFormat === "raw" || isAlreadyStory ? cleanText : `${descLabel}${cleanText}`;

    parsedStories.push({
      miroItemId: item.id,
      title,
      desc,
      labels: item.tags || []
    });
  }

  return parsedStories;
}

// Exporta as histórias curadas para o Trello, adiciona auditoria QUS nos comentários e salva o mapeamento no banco
export async function persistCuratedStories(
  userId: string,
  miroBoardId: string,
  trelloBoardId: string,
  listId: string,
  stories: CuratedStory[],
  trelloToken: string,
  language: Language = "pt"
) {
  let createdCount = 0;
  const logs: string[] = [];
  const jobId = crypto.randomUUID();

  if (hasDb) {
    await dbQuery(
      `insert into sync_jobs(id, user_id, source, destination, status, stats)
       values ($1, $2, 'miro', 'trello', 'running', $3)`,
      [jobId, userId, JSON.stringify({ total_to_process: stories.length })]
    ).catch(e => console.warn("[Sync Job Init Warning]", e.message));
  }

  for (const story of stories) {
    try {
      const card = await Trello.createCard(listId, story.title, story.desc, story.labels, trelloToken);
      createdCount++;
      logs.push(`Card created: ${story.title} (ID: ${card.id})`);

      const nowFormatted = new Date().toLocaleString(language === "en" ? "en-US" : language === "es" ? "es-ES" : "pt-BR");
      const scoreText = story.score !== undefined ? `${story.score}%` : "N/A";

      let commentMarkdown = "";
      if (language === "en") {
        commentMarkdown = `### 📊 Audit Trail - Collab2Us
**Export Date:** ${nowFormatted}
**QUS Quality Score:** ${scoreText}

${story.suggestions && story.suggestions.length > 0 
  ? `**Syntactic Quality Guidelines:**\n- ${story.suggestions.join("\n- ")}` 
  : "✅ **Syntactic Status:** Approved Without Pending Issues."}

---
*Generated automatically by Collab2Us (Miro ↔ Trello Integration)*`;
      } else if (language === "es") {
        commentMarkdown = `### 📊 Registro de Auditoría - Collab2Us
**Fecha de Exportación:** ${nowFormatted}
**Puntaje de Calidad QUS:** ${scoreText}

${story.suggestions && story.suggestions.length > 0 
  ? `**Directrices de Calidad Sintáctica:**\n- ${story.suggestions.join("\n- ")}` 
  : "✅ **Estado Sintáctico:** Aprobado Sin Pendientes."}

---
*Generado automáticamente por Collab2Us (Integración Miro ↔ Trello)*`;
      } else {
        commentMarkdown = `### 📊 Audit Trail - Collab2Us
**Data de Exportação:** ${nowFormatted}
**Pontuação QUS (Quality User Story):** ${scoreText}

${story.suggestions && story.suggestions.length > 0 
  ? `**Diretrizes de Qualidade Sintática:**\n- ${story.suggestions.join("\n- ")}` 
  : "✅ **Status Sintático:** Requisito Aprovado Sem Pendências."}

---
*Relatório gerado automaticamente via Collab2Us (Integração Miro ↔ Trello)*`;
      }

      try {
        await Trello.addCardComment(card.id, commentMarkdown, trelloToken);
      } catch (commentErr: any) {
        logs.push(`[Notice] Card ${card.id} created, comment failed: ${commentErr.message}`);
      }

      const firstMiroId = story.miroItemId.split(",")[0];
      const miroItemUrl = `https://miro.com/app/board/${miroBoardId}/?moveToWidget=${firstMiroId}`;
      try {
        await Trello.addCardAttachment(card.id, miroItemUrl, "Miro Board", trelloToken);
      } catch (attachErr: any) {
        logs.push(`[Notice] Card ${card.id} created, attachment failed: ${attachErr.message}`);
      }

      const contentHash = computeContentHash(story.title, story.desc);
      if (hasDb) {
        try {
          await dbQuery(
            `insert into story_mappings(user_id, miro_board_id, miro_item_id, miro_item_url, trello_board_id, trello_card_id, trello_card_url, content_hash, last_synced_at)
             values ($1, $2, $3, $4, $5, $6, $7, $8, now())
             on conflict (miro_item_id, trello_card_id) do update set
               user_id = excluded.user_id,
               miro_board_id = excluded.miro_board_id,
               miro_item_url = excluded.miro_item_url,
               trello_board_id = excluded.trello_board_id,
               trello_card_url = excluded.trello_card_url,
               content_hash = excluded.content_hash,
               last_synced_at = now(),
               updated_at = now()`,
            [userId, miroBoardId, story.miroItemId, miroItemUrl, trelloBoardId, card.id, card.url, contentHash]
          );
        } catch (dbErr: any) {
          try {
            await dbQuery(`
              alter table story_mappings add column if not exists miro_item_url text;
              alter table story_mappings add column if not exists trello_card_url text;
              alter table story_mappings add column if not exists miro_item_ids jsonb default '[]'::jsonb;
              alter table story_mappings add column if not exists content_hash text;
              alter table story_mappings add column if not exists last_synced_at timestamptz default now();
              alter table story_mappings add column if not exists updated_at timestamptz default now();
            `);
            
            await dbQuery(
              `insert into story_mappings(user_id, miro_board_id, miro_item_id, miro_item_url, trello_board_id, trello_card_id, trello_card_url, content_hash, last_synced_at)
               values ($1, $2, $3, $4, $5, $6, $7, $8, now())
               on conflict (miro_item_id, trello_card_id) do update set
                 user_id = excluded.user_id,
                 miro_board_id = excluded.miro_board_id,
                 miro_item_url = excluded.miro_item_url,
                 trello_board_id = excluded.trello_board_id,
                 trello_card_url = excluded.trello_card_url,
                 content_hash = excluded.content_hash,
                 last_synced_at = now(),
                 updated_at = now()`,
              [userId, miroBoardId, story.miroItemId, miroItemUrl, trelloBoardId, card.id, card.url, contentHash]
            );
          } catch (retryErr: any) {
            logs.push(`[DB Notice] Mapping could not be recorded: ${retryErr.message}`);
          }
        }
      }
    } catch (err: any) {
      logs.push(`Failure converting story [${story.title}]: ${err.message}`);
    }
  }

  const finalStatus = createdCount > 0 ? "success" : "failed";
  if (hasDb) {
    await dbQuery(
      `update sync_jobs set status = $1, finished_at = now(), stats = $2 where id = $3`,
      [finalStatus, JSON.stringify({ created_cards: createdCount, total: stories.length, logs }), jobId]
    ).catch(e => console.warn("[Sync Job Finish Warning]", e.message));
  }

  return { created: createdCount, details: logs };
}

// Compara o hash atual dos cards no Trello com o banco para listar itens desatualizados no Miro
export async function checkOnDemandSync(userId: string, trelloToken: string) {
  if (!hasDb) return { mappings: [] };

  const mappingsRes = await dbQuery<{
    id: string;
    miro_board_id: string;
    miro_item_id: string;
    miro_item_url: string;
    trello_board_id: string;
    trello_card_id: string;
    trello_card_url: string;
    content_hash: string;
    last_synced_at: string;
  }>(
    `select id, miro_board_id, miro_item_id, miro_item_url, trello_board_id, trello_card_id, trello_card_url, content_hash, last_synced_at
     from story_mappings where user_id = $1`,
    [userId]
  );

  const results = [];

  for (const m of mappingsRes.rows) {
    try {
      const card = await Trello.getCardById(m.trello_card_id, trelloToken);
      const currentHash = computeContentHash(card.name, card.desc || "");
      const isDivergent = currentHash !== m.content_hash;

      results.push({
        mappingId: m.id,
        trelloCardId: m.trello_card_id,
        trelloCardUrl: m.trello_card_url,
        miroItemId: m.miro_item_id,
        miroItemUrl: m.miro_item_url,
        title: card.name,
        desc: card.desc,
        isDivergent,
        lastSyncedAt: m.last_synced_at
      });
    } catch {
      results.push({
        mappingId: m.id,
        trelloCardId: m.trello_card_id,
        error: "Item archived or deleted in Trello",
        isDivergent: true
      });
    }
  }

  return { mappings: results };
}

// Atualiza o post-it no Miro com as modificações feitas diretamente no card do Trello
export async function applySyncPull(userId: string, mappingId: string, miroToken: string, trelloToken: string) {
  if (!hasDb) throw new Error("Database not configured");

  const mapRes = await dbQuery(
    `select miro_board_id, miro_item_id, trello_card_id from story_mappings where id = $1 and user_id = $2`,
    [mappingId, userId]
  );

  const mapping = mapRes.rows[0];
  if (!mapping) throw new Error("Mapping not found");

  const card = await Trello.getCardById(mapping.trello_card_id, trelloToken);
  const cleanTitle = card.name;
  const cleanDesc = (card.desc || "").trim();
  const textToMiro = `<b>${cleanTitle}</b>\n\n${cleanDesc}`;
  
  const primaryMiroId = mapping.miro_item_id.split(",")[0];
  await Miro.updateSticky(mapping.miro_board_id, primaryMiroId, textToMiro, miroToken);

  const newHash = computeContentHash(card.name, card.desc || "");
  await dbQuery(
    `update story_mappings set content_hash = $1, last_synced_at = now(), updated_at = now() where id = $2`,
    [newHash, mappingId]
  );

  return { ok: true, updatedTitle: cleanTitle };
}
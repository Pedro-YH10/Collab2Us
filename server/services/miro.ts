import { http } from "./http";

const API = "https://api.miro.com/v2";

function resolveToken(override?: string) {
  const token = override || process.env.MIRO_ACCESS_TOKEN;
  if (!token) throw new Error("Token do Miro não encontrado.");
  return token;
}

export async function listBoards(accessToken?: string) {
  const token = resolveToken(accessToken);
  const data = await http<{ data: { id: string; name: string; viewLink: string }[] }>(`${API}/boards`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data.map((b) => ({ id: b.id, name: b.name, url: b.viewLink }));
}

export async function searchBoards(query: string, accessToken?: string) {
  const boards = await listBoards(accessToken);
  const q = query.trim().toLowerCase();
  return boards.filter((b) => b.name.toLowerCase().includes(q));
}

export async function updateBoardName(boardId: string, name: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  return await http<any>(`${API}/boards/${boardId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
}

export async function deleteBoard(boardId: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  return await http<any>(`${API}/boards/${boardId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listStickyNotes(boardId: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  const items = await http<{ data: any[] }>(`${API}/boards/${boardId}/items?type=sticky_note`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return items.data.map((i: any) => ({
    id: i.id,
    text: i.data?.content || i.plainText || "",
    tags: i.tags?.map((t: any) => t.title) || [],
    position: i.position ? { x: i.position.x, y: i.position.y } : undefined
  }));
}

export async function getAllConnectors(boardId: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  const data = await http<{ data: any[] }>(`${API}/boards/${boardId}/connectors`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data.data;
}

async function calculateNextBoardOffset(boardId: string, accessToken?: string): Promise<number> {
  try {
    const notes = await listStickyNotes(boardId, accessToken);
    if (notes.length === 0) return 0;
    const maxX = Math.max(...notes.map(n => n.position?.x || 0));
    return maxX > 0 ? maxX + 1800 : 0;
  } catch {
    return 0;
  }
}

export async function createFrame(boardId: string, title: string, x: number, y: number, width: number, height: number, accessToken?: string) {
  const token = resolveToken(accessToken);
  return await http<any>(`${API}/boards/${boardId}/frames`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      data: { title },
      geometry: { width, height },
      position: { x, y }
    }),
  });
}

export async function createShape(
  boardId: string, 
  content: string, 
  x: number, 
  y: number, 
  width: number, 
  height: number, 
  fillColor: string = "light_blue", 
  parentId?: string,
  accessToken?: string
) {
  const token = resolveToken(accessToken);
  const body: any = {
    data: { content, shape: "rectangle" },
    style: { fillColor, textAlign: "center" },
    geometry: { width, height },
    position: { x, y }
  };
  if (parentId) body.parent = { id: parentId };

  return await http<any>(`${API}/boards/${boardId}/shapes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function createStickyAt(
  boardId: string, 
  text: string, 
  x: number, 
  y: number, 
  color: string = "yellow", 
  parentId?: string,
  accessToken?: string
) {
  const token = resolveToken(accessToken);
  const body: any = {
    data: { content: text },
    style: { fillColor: color },
    position: { x, y }
  };
  if (parentId) body.parent = { id: parentId };

  return await http<any>(`${API}/boards/${boardId}/sticky_notes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function createSticky(boardId: string, text: string, accessToken?: string) {
  return createStickyAt(boardId, text, 0, 0, "yellow", undefined, accessToken);
}

export async function createConnector(boardId: string, startItemId: string, endItemId: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  return await http<any>(`${API}/boards/${boardId}/connectors`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      startItem: { id: startItemId },
      endItem: { id: endItemId }
    }),
  });
}

export async function updateSticky(boardId: string, itemId: string, text: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  return await http<any>(`${API}/boards/${boardId}/sticky_notes/${itemId}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ data: { content: text } }),
  });
}

export async function instantiateStructuredCanvas(
  boardId: string, 
  templateType: "canvas" | "usm" | "discovery", 
  workflowColors: { roleColor?: string; criteriaColor?: string }, 
  accessToken?: string,
  language: "pt" | "en" | "es" = "en"
) {
  const roleColor = workflowColors.roleColor || "yellow";
  const criteriaColor = workflowColors.criteriaColor || "green";
  const xOffset = await calculateNextBoardOffset(boardId, accessToken);
  
  const isEn = language === "en";
  const isEs = language === "es";

  if (templateType === "usm") {
    const frame = await createFrame(boardId, "User Story Map - Collab2Us", xOffset, 0, 1600, 900, accessToken);
    const frameId = frame.id;

    const legend = isEn
      ? "<b>LEGEND & INSTRUCTIONS</b><br/>• Connect stickies with arrows<br/>• Top row = Activities | Bottom rows = Sprints"
      : isEs
        ? "<b>LEYENDA E INSTRUCCIONES</b><br/>• Conecte las notas con flechas<br/>• Fila superior = Actividades | Filas inferiores = Sprints"
        : "<b>LEGENDA & INSTRUÇÕES</b><br/>• Conecte as notas com setas<br/>• Linha superior = Atividades | Linhas inferiores = Sprints";

    await createShape(boardId, legend, 220, 90, 320, 80, "light_yellow", frameId, accessToken).catch(() => {});

    await createShape(boardId, isEn ? "<b>Step 1: Authentication</b>" : isEs ? "<b>Paso 1: Autenticación</b>" : "<b>Etapa 1: Autenticação</b>", 450, 180, 320, 50, "light_blue", frameId, accessToken).catch(() => {});
    await createShape(boardId, isEn ? "<b>Step 2: Product Discovery</b>" : isEs ? "<b>Paso 2: Selección de Ítems</b>" : "<b>Etapa 2: Seleção de Itens</b>", 850, 180, 320, 50, "light_blue", frameId, accessToken).catch(() => {});
    await createShape(boardId, isEn ? "<b>Step 3: Checkout & Payment</b>" : isEs ? "<b>Paso 3: Pago y Checkout</b>" : "<b>Etapa 3: Checkout & Pagamento</b>", 1250, 180, 320, 50, "light_blue", frameId, accessToken).catch(() => {});

    await createShape(boardId, "<b>MVP / Sprint 1</b>", 100, 360, 140, 200, "gray", frameId, accessToken).catch(() => {});
    await createShape(boardId, isEn ? "<b>Sprint 2 (Future)</b>" : isEs ? "<b>Sprint 2 (Futuro)</b>" : "<b>Sprint 2 (Futuro)</b>", 100, 620, 140, 220, "gray", frameId, accessToken).catch(() => {});

    const s1 = await createStickyAt(boardId, isEn ? "As a visitor, I want to create an account" : isEs ? "Como visitante, quiero crear una cuenta" : "Como visitante, quero criar conta com e-mail", 450, 360, roleColor, frameId, accessToken);
    const s2 = await createStickyAt(boardId, isEn ? "I want to browse catalog items" : isEs ? "quiero buscar productos por nombre" : "quero buscar produtos por nome", 850, 360, "cyan", frameId, accessToken);
    const s3 = await createStickyAt(boardId, isEn ? "so that I complete my purchase securely" : isEs ? "para pagar de forma segura" : "para pagar via PIX instantaneamente", 1250, 360, criteriaColor, frameId, accessToken);

    await createConnector(boardId, s1.id, s2.id, accessToken).catch(() => {});
    await createConnector(boardId, s2.id, s3.id, accessToken).catch(() => {});

    return { createdItems: 10, type: "usm" };
  }

  if (templateType === "discovery") {
    const frame = await createFrame(boardId, "Discovery Zone - Collab2Us", xOffset, 0, 1400, 800, accessToken);
    const frameId = frame.id;

    const legend = isEn 
      ? "<b>LEGEND</b><br/>Pink = Pains<br/>Cyan = Solutions" 
      : isEs 
        ? "<b>LEYENDA</b><br/>Rosa = Dolores<br/>Cian = Soluciones" 
        : "<b>LEGENDA</b><br/>Rosa = Dores<br/>Ciano = Soluções";

    await createShape(boardId, legend, 220, 80, 240, 60, "light_yellow", frameId, accessToken).catch(() => {});
    await createShape(boardId, isEn ? "<b>1. Problem Space (Pains)</b>" : isEs ? "<b>1. Espacio del Problema (Dolores)</b>" : "<b>1. Espaço do Problema (Dores)</b>", 400, 180, 450, 50, "pink", frameId, accessToken).catch(() => {});
    await createShape(boardId, isEn ? "<b>2. Solution Space (Requirements)</b>" : isEs ? "<b>2. Espacio de Solución (Requisitos)</b>" : "<b>2. Espaço da Solução (Requisitos)</b>", 1000, 180, 450, 50, "cyan", frameId, accessToken).catch(() => {});

    await createStickyAt(boardId, isEn ? "As a shopper, finding valid coupon codes is too slow" : isEs ? "Como cliente, encontrar cupones válidos es muy lento" : "Como cliente, demoro para encontrar cupons válidos", 400, 320, "pink", frameId, accessToken);
    await createStickyAt(boardId, isEn ? "I want automatic coupon application at checkout" : isEs ? "quiero aplicar cupones automáticos al pagar" : "quero aplicar cupom automático no carrinho", 1000, 320, roleColor, frameId, accessToken);

    return { createdItems: 5, type: "discovery" };
  }

  const frame = await createFrame(boardId, "User Story Canvas - Collab2Us", xOffset, 0, 1400, 750, accessToken);
  const frameId = frame.id;

  const instructions = isEn
    ? "<b>COLLAB2US INSTRUCTIONS</b><br/>Fill columns and connect with arrows:<br/>Actor → Action → Business Value"
    : isEs
      ? "<b>INSTRUCCIONES COLLAB2US</b><br/>Complete las columnas y conecte con flechas:<br/>Actor → Acción → Valor de Negocio"
      : "<b>INSTRUÇÕES COLAB2US</b><br/>Preencha as colunas e conecte com setas:<br/>Ator → Ação → Valor de Negócio";

  await createShape(boardId, instructions, 250, 80, 320, 70, "light_yellow", frameId, accessToken).catch(() => {});

  await createShape(boardId, isEn ? "<b>1. ACTOR / USER ROLE</b>" : isEs ? "<b>1. ACTOR / ROL DE USUARIO</b>" : "<b>1. ATOR / PERFIL DO USUÁRIO</b>", 250, 180, 350, 50, "yellow", frameId, accessToken).catch(() => {});
  await createShape(boardId, isEn ? "<b>2. ACTION / FEATURE</b>" : isEs ? "<b>2. ACCIÓN / FUNCIONALIDAD</b>" : "<b>2. AÇÃO / FUNCIONALIDADE</b>", 700, 180, 350, 50, "cyan", frameId, accessToken).catch(() => {});
  await createShape(boardId, isEn ? "<b>3. BUSINESS VALUE / BDD</b>" : isEs ? "<b>3. VALOR DE NEGOCIO / BDD</b>" : "<b>3. VALOR DE NEGÓCIO / BDD</b>", 1150, 180, 350, 50, "green", frameId, accessToken).catch(() => {});

  const s1 = await createStickyAt(boardId, isEn ? "As a registered mobile customer" : isEs ? "Como cliente registrado en la aplicación" : "Como cliente cadastrado no aplicativo", 250, 320, roleColor, frameId, accessToken);
  const s2 = await createStickyAt(boardId, isEn ? "I want to save favorite items to my wishlist" : isEs ? "quiero guardar productos en mi lista de favoritos" : "quero salvar produtos favoritos em uma lista", 700, 320, "cyan", frameId, accessToken);
  const s3 = await createStickyAt(boardId, isEn ? "so that I can easily find them later for purchase" : isEs ? "para comprarlos fácilmente en el futuro" : "para comprá-los futuramente sem pesquisar de novo", 1150, 320, criteriaColor, frameId, accessToken);

  await createConnector(boardId, s1.id, s2.id, accessToken).catch(() => {});
  await createConnector(boardId, s2.id, s3.id, accessToken).catch(() => {});

  return { createdItems: 8, type: "canvas" };
}

export async function createBoard(name: string, accessToken?: string) {
  const token = resolveToken(accessToken);
  return await http<any>(`${API}/boards`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, policy: { permissionsPolicy: { collaboration: "team_editors" } } }),
  });
}
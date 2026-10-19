import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFormattedMiroStories } from "./conversion";
import * as Miro from "./miro";

// Mocks do serviço de comunicação direta com a API do Miro
vi.mock("./miro", () => ({
  listStickyNotes: vi.fn(),
  getAllConnectors: vi.fn(),
}));

describe("Conversor de Grafos do Miro em Histórias de Usuário", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar um array vazio se o quadro não contiver notas adesivas", async () => {
    vi.mocked(Miro.listStickyNotes).mockResolvedValue([]);
    vi.mocked(Miro.getAllConnectors).mockResolvedValue([]);

    const result = await getFormattedMiroStories("board_vazio", "token_mock", "auto", "connextra");
    expect(result).toEqual([]);
  });

  it("deve converter corretamente um fluxo linear encadeado (Como -> Quero -> Para)", async () => {
    // Simula 3 notas representando a sequência clássica de Engenharia de Requisitos
    vi.mocked(Miro.listStickyNotes).mockResolvedValue([
      { id: "note_1", text: "Como cliente cadastrado", tags: ["usuario"], position: {x: 0, y: 0} },
      { id: "note_2", text: "quero salvar favoritos", tags: ["core"], position: {x: 0, y: 0} },
      { id: "note_3", text: "para comprá-los depois", tags: ["negocio"], position: {x: 0, y: 0} },
    ]);

    // Conecta nota_1 -> nota_2 -> nota_3
    vi.mocked(Miro.getAllConnectors).mockResolvedValue([
      { id: "conn_1", startItem: { id: "note_1" }, endItem: { id: "note_2" } },
      { id: "conn_2", startItem: { id: "note_2" }, endItem: { id: "note_3" } },
    ]);

    const result = await getFormattedMiroStories("board_linear", "token_mock", "auto", "connextra");

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("quero salvar favoritos");
    expect(result[0].desc).toContain("**História:** Como Como cliente cadastrado, quero quero salvar favoritos, para para comprá-los depois");
    // Garante a consolidação e unificação das tags de todo o fluxo
    expect(result[0].labels).toContain("usuario");
    expect(result[0].labels).toContain("core");
    expect(result[0].labels).toContain("negocio");
  });

  it("deve quebrar loops circulares de forma segura e extrair os requisitos sem travamento por estouro de pilha", async () => {
    // Simula duas notas cíclicas sem nó inicial claro (In-degree > 0 para todos)
    vi.mocked(Miro.listStickyNotes).mockResolvedValue([
      { id: "loop_1", text: "Como PO", tags: [], position: {x: 0, y: 0} },
      { id: "loop_2", text: "quero sincronia constante", tags: [], position: {x: 0, y: 0} },
    ]);

    // Cria a relação cíclica loop_1 -> loop_2 -> loop_1
    vi.mocked(Miro.getAllConnectors).mockResolvedValue([
      { id: "conn_loop_1", startItem: { id: "loop_1" }, endItem: { id: "loop_2" } },
      { id: "conn_loop_2", startItem: { id: "loop_2" }, endItem: { id: "loop_1" } },
    ]);

    // Executa e verifica se o algoritmo de quebra de ciclo contorna o loop de forma resiliênte
    const result = await getFormattedMiroStories("board_circular", "token_mock", "auto", "connextra");
    
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].desc).toContain("**História:** Como Como PO, quero quero sincronia constante");
  });
});
import { http } from "./http";

export type AIProvider = "openai" | "gemini" | "claude";
export type Language = "pt" | "en" | "es";

export interface AIModelOption {
  id: string;
  name: string;
}

export interface AIStoryRefinement {
  title: string;
  actor: string;
  action: string;
  benefit: string;
  fullStory: string;
  acceptanceCriteria: string[];
  qualityScore: number;
  suggestions: string[];
  invest?: {
    independent: boolean;
    negotiable: boolean;
    valuable: boolean;
    estimable: boolean;
    small: boolean;
    testable: boolean;
  };
}

export interface AIIdeationResult {
  concept: string;
  stickies: Array<{
    text: string;
    role: "actor" | "action" | "benefit" | "criteria";
  }>;
}

function getLanguageInstruction(lang: Language = "pt"): string {
  if (lang === "en") {
    return `OUTPUT LANGUAGE: English.
User Story Format: "As a [actor], I want [action], so that [benefit]".
BDD Acceptance Criteria Keywords: "Given [context]", "When [action]", "Then [outcome]".`;
  }
  if (lang === "es") {
    return `IDIOMA DE SALIDA: Español.
Formato de Historia de Usuario: "Como [actor], quiero [acción], para [beneficio]".
Criterios de Aceptación BDD: "Dado que [contexto]", "Cuando [acción]", "Entonces [resultado]".`;
  }
  return `IDIOMA DE SAÍDA: Português.
Formato de História de Usuário: "Como [ator], quero [ação], para [benefício]".
Critérios de Aceitação BDD: "Dado que [contexto]", "Quando [ação]", "Então [resultado]".`;
}

const DEFAULT_SYSTEM_INSTRUCTION = `Você é um Engenheiro de Requisitos especialista e Product Owner Ágil altamente qualificado.
Sua missão é analisar, sintetizar e qualificar ideias e Histórias de Usuário.
Diretrizes obrigatórias de qualidade:
1. Elimine termos ambíguos ou vagos.
2. Garanta a atomicidade (cada história representa uma única funcionalidade testável).
3. Escreva critérios de aceitação objetivos no formato BDD/Gherkin.
4. Calcule uma pontuação de qualidade sintática (0 a 100%) ponderando clareza e estrutura.`;

const POST_INSTRUCTION_JSON = `\n\nRESPOSTA OBRIGATORIAMENTE EM FORMATO JSON VÁLIDO. 
Não inclua explicações ou marcações fora do objeto JSON.`;

export async function fetchAvailableModels(provider: AIProvider, apiKeyOverride?: string): Promise<AIModelOption[]> {
  const apiKey = apiKeyOverride || process.env[`${provider.toUpperCase()}_API_KEY` || ""];
  
  if (!apiKey) {
    return [{ id: "mock-model", name: `${provider.toUpperCase()} (Modo de Demonstração / Rule-Based)` }];
  }

  if (provider === "openai") {
    const res = await http<{ data: Array<{ id: string }> }>("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` }
    });
    return res.data
      .filter(m => /^(gpt|o1|o3|chatgpt)/i.test(m.id) && !m.id.includes("realtime") && !m.id.includes("audio"))
      .map(m => ({ id: m.id, name: m.id }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await http<{ models: Array<{ name: string; displayName: string; supportedGenerationMethods: string[] }> }>(url);
    return res.models
      .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
      .map(m => {
        const cleanId = m.name.replace(/^models\//, "");
        return { id: cleanId, name: m.displayName || cleanId };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  if (provider === "claude") {
    const res = await http<{ data: Array<{ id: string; display_name?: string }> }>("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" }
    });
    return res.data.map(m => ({ id: m.id, name: m.display_name || m.id }));
  }

  return [];
}

async function callLLMProvider(
  provider: AIProvider,
  model: string | undefined,
  apiKeyOverride: string | undefined,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.2
): Promise<string> {
  const providerKey = apiKeyOverride || process.env[`${provider.toUpperCase()}_API_KEY` || ""];
  
  if (!providerKey) return "";

  if (provider === "openai") {
    const selectedModel = model || "gpt-4o-mini";
    const res = await http<any>("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${providerKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt + POST_INSTRUCTION_JSON }
        ],
        temperature,
        response_format: { type: "json_object" }
      })
    });
    return res.choices[0]?.message?.content || "{}";
  }

  if (provider === "gemini") {
    const selectedModel = model || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${providerKey}`;
    const res = await http<any>(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt + POST_INSTRUCTION_JSON }] }],
        generationConfig: { responseMimeType: "application/json", temperature }
      })
    });
    return res.candidates[0]?.content?.parts[0]?.text || "{}";
  }

  if (provider === "claude") {
    const selectedModel = model || "claude-3-5-sonnet-20240620";
    const res = await http<any>("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": providerKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt + POST_INSTRUCTION_JSON }]
      })
    });
    return res.content[0]?.text || "{}";
  }

  return "{}";
}

function parseSafeJSON<T>(rawText: string): T {
  const cleaned = rawText
    .replace(/^```json/g, "")
    .replace(/^```/g, "")
    .replace(/```$/g, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

export async function refineUserStoryWithAI(
  rawText: string,
  options?: { provider?: AIProvider; model?: string; apiKey?: string; customSystemPrompt?: string }
): Promise<AIStoryRefinement> {
  const provider = options?.provider || "openai";
  const languagePreservationInstruction = `
DIRETRIZ OBRIGATÓRIA DE IDIOMA:
Detecte o idioma do requisito fornecido e gere a resposta RIGOROSAMENTE NO MESMO IDIOMA original.
JAMAIS traduza o texto do usuário. Se o texto estiver em Português, responda em Português. Se estiver em Inglês, responda em Inglês. Se estiver em Espanhol, responda em Espanhol.
`;

  const systemPrompt = (options?.customSystemPrompt || DEFAULT_SYSTEM_INSTRUCTION) + "\n\n" + languagePreservationInstruction;

  const userPrompt = `Analise e refine o requisito a seguir no seu idioma original:
"${rawText}"

DIRETRIZES DE ENGENHARIA DE REQUISITOS:
1. FOCO ATÔMICO: Se o texto contiver mais de uma ação (ex: "criar conta e buscar produtos"), escolha APENAS A PRIMEIRA ação principal para ser o objetivo desta história. Não junte ações distintas com "e".
2. ELIMINE TERMOS VAGOS: Se encontrar palavras como "rápido", "fácil" ou "otimizado", substitua-as por critérios mensuráveis ou remova-as da descrição.
3. GERE CRITÉRIOS BDD: Crie 3 critérios no formato Dado que / Quando / Então objetivos e testáveis.

Retorne um JSON com a seguinte estrutura:
{
  "title": "Título sucinto da funcionalidade (no mesmo idioma do requisito)",
  "actor": "Papel do usuário",
  "action": "Ação específica",
  "benefit": "Valor de negócio",
  "fullStory": "História formatada",
  "acceptanceCriteria": ["Critério BDD 1", "Critério BDD 2", "Critério BDD 3"],
  "qualityScore": 85,
  "suggestions": ["Melhoria identificada"]
}`;

  const responseText = await callLLMProvider(provider, options?.model, options?.apiKey, systemPrompt, userPrompt, 0.2);
  
  if (!responseText || responseText === "{}") {
    const isEn = /\b(as an?|i want|so that)\b/i.test(rawText.toLowerCase());
    const isEs = /\b(quiero|para que)\b/i.test(rawText.toLowerCase());

    return {
      title: rawText.slice(0, 50),
      actor: isEn ? "user" : isEs ? "usuario" : "usuário",
      action: rawText,
      benefit: isEn ? "achieve the system goal" : isEs ? "alcanzar el objetivo del sistema" : "alcançar o objetivo do sistema",
      fullStory: isEn 
        ? `As a user, I want ${rawText}, so that I achieve the expected result` 
        : isEs 
          ? `Como usuario, quiero ${rawText}, para obtener el resultado esperado` 
          : `Como usuário, quero ${rawText}, para obter o resultado esperado`,
      acceptanceCriteria: [
        isEn ? "Given the user is authenticated in the system" : isEs ? "Dado que el usuario está autenticado" : "Dado que o usuário está autenticado no sistema",
        isEn ? `When triggering the ${rawText.slice(0, 30)} feature` : isEs ? `Cuando ejecute la función ${rawText.slice(0, 30)}` : `Quando acionar a funcionalidade de ${rawText.slice(0, 30)}`,
        isEn ? "Then the result must be processed successfully" : isEs ? "Entonces el resultado debe procesarse con éxito" : "Então o resultado deve ser processado com sucesso"
      ],
      qualityScore: 75,
      suggestions: [
        isEn ? "Offline demo mode active (fallback quality check)." :
        isEs ? "Modo de demostración offline activado (control sintáctico)." :
        "Modo de demonstração offline ativado (mecanismo sintático de segurança)."
      ]
    };
  }

  return parseSafeJSON<AIStoryRefinement>(responseText);
}

export async function generateIdeationStickiesWithAI(
  conceptPrompt: string,
  options?: { provider?: AIProvider; model?: string; apiKey?: string; customSystemPrompt?: string; language?: Language }
): Promise<AIIdeationResult> {
  const provider = options?.provider || "openai";
  const lang = options?.language || "pt";
  const systemPrompt = (options?.customSystemPrompt || DEFAULT_SYSTEM_INSTRUCTION) + "\n\n" + getLanguageInstruction(lang);

  const userPrompt = `Crie uma estrutura de ideação para o objetivo: "${conceptPrompt}"
Gere de 4 a 6 notas cobrindo Ator, Ação e Benefício.`;

  const responseText = await callLLMProvider(provider, options?.model, options?.apiKey, systemPrompt, userPrompt, 0.7);

  if (!responseText || responseText === "{}") {
    return {
      concept: conceptPrompt,
      stickies: [
        { text: `Ator / Actor: ${conceptPrompt}`, role: "actor" },
        { text: `Ação / Action: ${conceptPrompt}`, role: "action" },
        { text: `Benefício / Benefit`, role: "benefit" },
        { text: `Critério BDD / Acceptance Criteria`, role: "criteria" }
      ]
    };
  }

  return parseSafeJSON<AIIdeationResult>(responseText);
}

export async function splitMonolithicStoryWithAI(
  largeRequirementText: string,
  options?: { provider?: AIProvider; model?: string; apiKey?: string; customSystemPrompt?: string; language?: Language }
): Promise<{ stories: Array<{ title: string; desc: string }> }> {
  const provider = options?.provider || "openai";
  const lang = options?.language || "pt";
  const systemPrompt = (options?.customSystemPrompt || DEFAULT_SYSTEM_INSTRUCTION) + "\n\n" + getLanguageInstruction(lang);

  const userPrompt = `Divida o requisito monolítico a seguir em 2 ou mais Histórias de Usuário atômicas e independentes:
"${largeRequirementText}"

Retorne um JSON no formato:
{
  "stories": [
    {
      "title": "Título da história 1",
      "desc": "História e critérios BDD"
    }
  ]
}`;

  const responseText = await callLLMProvider(provider, options?.model, options?.apiKey, systemPrompt, userPrompt, 0.2);

  if (!responseText || responseText === "{}") {
    const parts = largeRequirementText.split(/\s+(?:e|ou|and|or|y|o)\s+/i);
    const partLabel = lang === "en" ? "Part" : "Parte";
    const storyLabel = lang === "en" ? "**Story:**" : lang === "es" ? "**Historia:**" : "**História:**";

    return {
      stories: parts.map((part, i) => ({
        title: `${partLabel} ${i + 1}`,
        desc: `${storyLabel} ${part.trim()}`
      }))
    };
  }

  return parseSafeJSON<{ stories: Array<{ title: string; desc: string }> }>(responseText);
}
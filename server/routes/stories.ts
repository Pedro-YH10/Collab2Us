import { RequestHandler } from "express";

export type SupportedLanguage = "pt" | "en" | "es";

const VAGUE_TERMS_PT = [
  "melhorar", "otimizar", "facilitar", "rápido", "rápida", "fácil", "amigável", 
  "eficiente", "fazer algo", "coisas", "apropriado", "flexível", "robusto", "limpo", "intuitivo"
];

const VAGUE_TERMS_EN = [
  "improve", "optimize", "fast", "easy", "friendly", "efficient", 
  "do something", "things", "appropriate", "flexible", "robust", "clean", "intuitive"
];

const VAGUE_TERMS_ES = [
  "mejorar", "optimizar", "facilitar", "rápido", "rápida", "fácil", "amigable",
  "eficiente", "hacer algo", "cosas", "apropiado", "flexible", "robusto", "limpio", "intuitivo"
];

export interface InvestMetrics {
  independent: boolean;
  negotiable: boolean;
  valuable: boolean;
  estimable: boolean;
  small: boolean;
  testable: boolean;
}

interface AnalysisResult {
  score: number;
  suggestions: string[];
  criteria: number;
  invest: InvestMetrics;
  metrics: {
    hasRole: boolean;
    hasGoal: boolean;
    hasReason: boolean;
    isAtomic: boolean;
    wordCount: number;
    vagueWordsFound: string[];
  };
}

// Analisa a sintaxe da história (Ator/Ação/Benefício), penaliza termos ambíguos e avalia critérios INVEST
export function analyzeUserStoryQuality(text: string, lang: SupportedLanguage = "pt"): AnalysisResult {
  const fullRaw = (text || "").trim();
  const suggestions: string[] = [];

  // O idioma dos avisos (Quality Guidelines) deve SEMPRE seguir o idioma da interface (EN, PT ou ES)
  const uiLang: SupportedLanguage = (lang === "en" || lang === "es" || lang === "pt") ? lang : "pt";

  // 1. Separa a frase da história dos critérios de aceitação BDD
  const splitParts = fullRaw.split(/(?:\*\*crit[eé]rios|\*\*acceptance|\*\*criterios)/i);
  const rawStoryPart = splitParts[0] || fullRaw;
  const rawCriteriaPart = splitParts.slice(1).join(" ");
  const storyStatement = rawStoryPart.replace(/^(\*\*[^*]+\*\*:\s*)/i, "").trim();

  // 2. Detecta o idioma do CONTEÚDO apenas para caçar palavras vagas no dicionário correto
  const isEnglishContent = /\b(as an?|i want|i need|so that|given|when|then)\b/i.test(fullRaw);
  const isSpanishContent = /\b(quiero|a fin de|para que pueda)\b/i.test(fullRaw);
  const contentLang: SupportedLanguage = isEnglishContent ? "en" : isSpanishContent ? "es" : "pt";

  // 3. Verificações sintáticas da estrutura (Ator, Ação e Benefício)
  const hasRole = /\b(como|as an?)\s+[^,\n]+/i.test(storyStatement);
  const hasGoal = /\b(quero|quiero|desejo|deseo|gostaria|i want|i need|would like)\s+[^,\n]+/i.test(storyStatement);
  const hasReason = /\b(para|so that|in order to|para que|de modo a|a fin de)\s+[^,\n]+/i.test(storyStatement);

  let baseScore = 0;
  if (hasRole) {
    baseScore += 20;
  } else {
    suggestions.push(
      uiLang === "en" ? "❌ Syntax: Missing user role/persona ('As a [user]' or 'Como [usuário]')." :
      uiLang === "es" ? "❌ Sintaxis: Falta definir el rol de usuario ('Como [usuario]')." :
      "❌ Sintaxe: Falta definir o papel/ator ('Como [tipo de usuário]')."
    );
  }

  if (hasGoal) {
    baseScore += 20;
  } else {
    suggestions.push(
      uiLang === "en" ? "❌ Syntax: Missing action/goal ('I want [action]' or 'quero [ação]')." :
      uiLang === "es" ? "❌ Sintaxis: Falta definir el objetivo/acción ('quiero [acción]')." :
      "❌ Sintaxe: Falta definir o objetivo/ação ('quero [realizar ação]')."
    );
  }

  if (hasReason) {
    baseScore += 20;
  } else {
    suggestions.push(
      uiLang === "en" ? "❌ Syntax: Missing business benefit ('so that [benefit]' or 'para [benefício]')." :
      uiLang === "es" ? "❌ Sintaxis: Falta definir el beneficio de negocio ('para [beneficio]')." :
      "❌ Sintaxe: Falta definir o benefício/justificativa de valor ('para [obter benefício]')."
    );
  }

  // 4. Verificação de Atomicidade (Avaliada apenas no objetivo da história)
  let isAtomic = true;
  let atomicityScore = 10;
  
  const goalMatch = storyStatement.match(/(?:quero|quiero|desejo|i want|i need)\s+([\s\S]+?)(?=\s+para|\s+so that|\s+in order to|$)/i);
  if (goalMatch) {
    const goalText = goalMatch[1].toLowerCase();
    const multipleVerbs = (goalText.match(/\b(quero|quiero|desejo|i want)\b/gi) || []).length;
    const coupledActions = /\b(criar|buscar|fazer|pagar|cadastrar|excluir|editar|listar)\b.*\s+(e|ou|y|and)\s+.*\b(criar|buscar|fazer|pagar|cadastrar|excluir|editar|listar)\b/i.test(goalText);

    if (multipleVerbs > 0 || coupledActions) {
      isAtomic = false;
      atomicityScore = 0;
      suggestions.push(
        uiLang === "en" ? "⚠️ Atomicity: Multiple goals detected in story statement. Consider using the 'Split with AI' button." :
        uiLang === "es" ? "⚠️ Atomicidad: Múltiples objetivos detectados en la acción de la historia. Considere usar el botón 'Dividir con IA'." :
        "⚠️ Atomicidade: Múltiplos objetivos detectados na ação da história. Considere usar o botão 'Dividir com IA'."
      );
    }
  }

  // 5. Verificação de termos vagos / ambíguos no idioma do conteúdo
  const vagueWordsFound: string[] = [];
  const checkTerms = contentLang === "en" ? VAGUE_TERMS_EN : contentLang === "es" ? VAGUE_TERMS_ES : VAGUE_TERMS_PT;
  for (const term of checkTerms) {
    const regex = new RegExp(`\\b${term}\\b`, "i");
    if (regex.test(fullRaw)) {
      vagueWordsFound.push(term);
    }
  }

  const clarityPenalty = Math.min(20, vagueWordsFound.length * 5);
  const clarityScore = 20 - clarityPenalty;

  if (vagueWordsFound.length > 0) {
    suggestions.push(
      uiLang === "en" ? `⚠️ Clarity: Avoid subjective/vague terms: [${vagueWordsFound.join(", ")}]. Specify objective criteria.` :
      uiLang === "es" ? `⚠️ Claridad: Evite términos ambiguos o vagos: [${vagueWordsFound.join(", ")}]. Especifique criterios objetivos.` :
      `⚠️ Clareza: Evite termos subjetivos: [${vagueWordsFound.join(", ")}]. Especifique critérios objetivos.`
    );
  }

  // 6. Extensão da frase da história (Medida apenas na frase, não nos critérios)
  const storyWords = storyStatement.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const storyWordCount = storyWords.length;
  let lengthScore = 10;

  if (storyWordCount < 6) {
    lengthScore = 5;
    suggestions.push(
      uiLang === "en" ? "⚠️ Length: Story statement is too brief. Essential context may be missing." :
      uiLang === "es" ? "⚠️ Extensión: Requisito muy breve. Puede faltar contexto esencial." :
      "⚠️ Extensão: Frase da história muito concisa. Pode faltar contexto essencial."
    );
  } else if (storyWordCount > 35) {
    lengthScore = 5;
    suggestions.push(
      uiLang === "en" ? "⚠️ Length: Story statement is too long (> 35 words). Consider segmenting." :
      uiLang === "es" ? "⚠️ Extensión: Requisito muy extenso (> 35 palabras). Considere segmentar." :
      "⚠️ Extensão: Frase da história muito longa (> 35 palavras). Considere segmentar."
    );
  }

  // 7. Presença de critérios de aceitação BDD
  const criteriaKeywords = fullRaw.match(/(Given|When|Then|Dado\s+que|Quando|Cuando|Ent[aã]o|Entonces)/gim)?.length || 0;
  const hasBulletPoints = (fullRaw.match(/^-\s+.+/gm)?.length || 0) > 0;
  const hasAcceptanceCriteria = criteriaKeywords >= 3 || hasBulletPoints;

  const criteriaScore = hasAcceptanceCriteria ? 10 : 0;
  if (!hasAcceptanceCriteria) {
    suggestions.push(
      uiLang === "en" ? "💡 Validation: Define objective acceptance criteria (e.g., Given / When / Then)." :
      uiLang === "es" ? "💡 Validación: Especifique criterios objetivos de aceptación (ej: Dado que / Cuando / Entonces)." :
      "💡 Validação: Descreva critérios objetivos de aceitação (ex: Dado que / Quando / Então)."
    );
  }

  const finalScore = Math.max(0, Math.min(100, baseScore + atomicityScore + clarityScore + lengthScore + criteriaScore));

  const invest: InvestMetrics = {
    independent: isAtomic,
    negotiable: !fullRaw.toLowerCase().includes("sql") && !fullRaw.toLowerCase().includes("database"),
    valuable: hasReason,
    estimable: vagueWordsFound.length === 0 && storyWordCount >= 6,
    small: storyWordCount <= 35 && isAtomic,
    testable: hasAcceptanceCriteria
  };

  return {
    score: finalScore,
    suggestions,
    criteria: criteriaKeywords,
    invest,
    metrics: {
      hasRole,
      hasGoal,
      hasReason,
      isAtomic,
      wordCount: storyWordCount,
      vagueWordsFound
    }
  };
}

// Endpoint POST que recebe o texto do card e devolve a pontuação QUS (0 a 100%) em tempo real
export const analyzeStory: RequestHandler = (req, res) => {
  const { text, language } = (req.body || {}) as { text: string; language?: SupportedLanguage };
  if (!text) {
    return res.status(400).json({ error: "Informe o texto da História de Usuário." });
  }
  
  const analysis = analyzeUserStoryQuality(text, language || "pt");
  return res.status(200).json(analysis);
};
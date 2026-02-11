const crypto = require("crypto");

const OAB_TOPICS = [
  "Ética Profissional",
  "Direito Constitucional",
  "Direito Civil",
  "Processo Civil",
  "Direito Penal",
  "Processo Penal",
  "Direito do Trabalho",
  "Processo do Trabalho",
  "Direito Administrativo",
  "Direito Tributário"
];

const DIFFICULTY_PROMPTS = {
  1: "iniciante absoluto, conceitos essenciais",
  2: "iniciante, aplicação simples",
  3: "intermediário, interpretação contextual",
  4: "intermediário-avançado, pegadinhas leves",
  5: "avançado, maior precisão técnica"
};

function hashQuestion(question) {
  const normalized = JSON.stringify({
    statement: question.statement,
    options: question.options,
    correctOptionIndex: question.correctOptionIndex,
    topic: question.topic
  });

  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function normalizeQuestion(raw, fallbackTopic, difficulty) {
  const safeOptions = Array.isArray(raw.options) && raw.options.length >= 3
    ? raw.options.slice(0, 3)
    : ["Alternativa A", "Alternativa B", "Alternativa C"];

  const correctIndex = Number.isInteger(raw.correctOptionIndex) && raw.correctOptionIndex >= 0 && raw.correctOptionIndex < 3
    ? raw.correctOptionIndex
    : 0;

  const question = {
    topic: raw.topic || fallbackTopic,
    difficulty,
    statement: raw.statement || "Qual alternativa está correta?",
    options: safeOptions,
    correctOptionIndex: correctIndex,
    explanation:
      raw.explanation ||
      "A alternativa correta resume a regra principal de forma simples e direta."
  };

  question.id = hashQuestion(question);
  return question;
}

function buildMockQuestion(topic, difficulty) {
  const bank = {
    "Ética Profissional": {
      statement: "Segundo o Estatuto da OAB, qual conduta é permitida ao advogado?",
      options: [
        "Divulgar serviços com promessa de resultado garantido.",
        "Manter sigilo profissional sobre informações do cliente, salvo justa causa legal.",
        "Captação ativa de clientes em hospitais e delegacias."
      ],
      correctOptionIndex: 1,
      explanation:
        "O sigilo profissional é regra central da advocacia. Publicidade com promessa e captação ativa são vedadas."
    },
    "Direito Constitucional": {
      statement: "No controle de constitucionalidade, a ADI no STF serve para:",
      options: [
        "Declarar inconstitucionalidade de lei em tese, com efeitos gerais.",
        "Resolver apenas conflito contratual entre particulares.",
        "Anular sentença penal de primeira instância."
      ],
      correctOptionIndex: 0,
      explanation:
        "A ADI é ação de controle concentrado, analisando lei em abstrato com efeito erga omnes."
    },
    default: {
      statement: `Em ${topic}, qual alternativa está de acordo com a regra mais aceita na prática forense?`,
      options: [
        "A alternativa que viola princípio básico da área.",
        "A alternativa que respeita princípios e procedimento legal adequado.",
        "A alternativa que ignora garantia fundamental para acelerar o processo."
      ],
      correctOptionIndex: 1,
      explanation:
        "A resposta correta costuma ser a que equilibra legalidade, devido processo e proteção de direitos."
    }
  };

  const base = bank[topic] || bank.default;
  const adaptedStatement = `${base.statement} (Nível ${difficulty})`;

  return normalizeQuestion(
    {
      ...base,
      statement: adaptedStatement,
      topic
    },
    topic,
    difficulty
  );
}

function getTopic({ weaknessByTopic }) {
  if (!weaknessByTopic || weaknessByTopic.length === 0) {
    return OAB_TOPICS[Math.floor(Math.random() * OAB_TOPICS.length)];
  }

  const weighted = weaknessByTopic
    .slice(0, 4)
    .flatMap((item, idx) => Array(5 - idx).fill(item.topic));

  if (weighted.length === 0) {
    return OAB_TOPICS[Math.floor(Math.random() * OAB_TOPICS.length)];
  }

  return weighted[Math.floor(Math.random() * weighted.length)];
}

function getDifficulty(userStats) {
  const accuracy = userStats.totalAnswered > 0
    ? userStats.totalCorrect / userStats.totalAnswered
    : 0;

  if (userStats.level >= 10 && accuracy > 0.78) return 5;
  if (userStats.level >= 7 && accuracy > 0.68) return 4;
  if (userStats.level >= 4 && accuracy > 0.58) return 3;
  if (accuracy > 0.45) return 2;
  return 1;
}

async function createWithOpenAI({ topic, difficulty, exclusions }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const prompt = `Você é um elaborador de questões estilo FGV para OAB. Gere exatamente 1 questão em JSON puro, sem markdown.
Regras:
- Tema: ${topic}
- Dificuldade: ${DIFFICULTY_PROMPTS[difficulty]}
- 3 alternativas objetivas (A, B, C)
- Só 1 correta
- Linguagem amigável para iniciantes
- Explicação curta (máximo 280 caracteres)
- Evite repetir ideias de IDs já dominados: ${exclusions.join(", ") || "nenhum"}
Formato JSON obrigatório:
{
  "topic": "...",
  "statement": "...",
  "options": ["...","...","..."],
  "correctOptionIndex": 0,
  "explanation": "..."
}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content:
            "Você cria questões fiéis ao estilo OAB/FGV com linguagem clara e didática."
        },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI provider error: ${response.status}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI provider returned empty content.");

  const cleaned = content.trim().replace(/^```json|```$/g, "").trim();
  const parsed = JSON.parse(cleaned);
  return normalizeQuestion(parsed, topic, difficulty);
}

async function generateQuestion({ userStats, masteredQuestionIds, weaknessByTopic }) {
  const topic = getTopic({ weaknessByTopic });
  const difficulty = getDifficulty(userStats);

  try {
    const aiQuestion = await createWithOpenAI({
      topic,
      difficulty,
      exclusions: masteredQuestionIds
    });

    if (aiQuestion && !masteredQuestionIds.includes(aiQuestion.id)) {
      return aiQuestion;
    }
  } catch (error) {
    console.warn("AI provider unavailable, using mock fallback.", error.message);
  }

  let attempts = 0;
  while (attempts < 12) {
    const question = buildMockQuestion(topic, difficulty);
    if (!masteredQuestionIds.includes(question.id)) return question;
    attempts += 1;
  }

  return buildMockQuestion(OAB_TOPICS[Math.floor(Math.random() * OAB_TOPICS.length)], difficulty);
}

module.exports = {
  generateQuestion,
  OAB_TOPICS
};

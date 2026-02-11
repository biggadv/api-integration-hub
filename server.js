const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { generateQuestion, OAB_TOPICS } = require("./aiEngine");
const { buildAuthRouter, authMiddleware, safeUser } = require("./auth");
const { buildPaymentRouter } = require("./payment");

const app = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, "users.json");
const FREE_DAILY_LIMIT = Number(process.env.FREE_DAILY_LIMIT || 15);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

function readUsers() {
  try {
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

function getUserById(userId) {
  const users = readUsers();
  const index = users.findIndex((user) => user.id === userId);
  return { users, index, user: users[index] };
}

function ensureProgress(user) {
  user.progress = user.progress || {};
  user.progress.xp = user.progress.xp || 0;
  user.progress.level = user.progress.level || 1;
  user.progress.streak = user.progress.streak || 0;
  user.progress.lastActiveDate = user.progress.lastActiveDate || null;
  user.progress.totalAnswered = user.progress.totalAnswered || 0;
  user.progress.totalCorrect = user.progress.totalCorrect || 0;
  user.progress.dailyAnswered = user.progress.dailyAnswered || {};
  user.progress.masteredQuestionIds = user.progress.masteredQuestionIds || [];
  user.progress.topicStats = user.progress.topicStats || {};
  user.progress.pendingQuestion = user.progress.pendingQuestion || null;
}

function sameDay(a, b) {
  return a === b;
}

function yesterday(dateString) {
  const date = new Date(dateString);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function getWeaknessByTopic(progress) {
  return Object.entries(progress.topicStats)
    .map(([topic, stat]) => {
      const answered = stat.answered || 0;
      const correct = stat.correct || 0;
      const accuracy = answered > 0 ? correct / answered : 0;
      return { topic, accuracy, answered };
    })
    .sort((a, b) => a.accuracy - b.accuracy);
}

function updateStreak(progress, today) {
  if (!progress.lastActiveDate) {
    progress.streak = 1;
    progress.lastActiveDate = today;
    return;
  }

  if (sameDay(progress.lastActiveDate, today)) return;

  if (progress.lastActiveDate === yesterday(today)) {
    progress.streak += 1;
  } else {
    progress.streak = 1;
  }

  progress.lastActiveDate = today;
}

function computeLevel(xp) {
  return Math.floor(xp / 120) + 1;
}

app.use("/api/auth", buildAuthRouter({ readUsers, writeUsers }));

app.use("/api", authMiddleware, (req, res, next) => {
  const { users, index, user } = getUserById(req.userId);
  if (index < 0 || !user) {
    return res.status(404).json({ error: "Usuário não encontrado." });
  }

  ensureProgress(user);
  req.user = user;
  req.users = users;
  req.userIndex = index;
  next();
});

app.get("/api/session/profile", (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const answeredToday = req.user.progress.dailyAnswered[today] || 0;

  res.json({
    user: safeUser(req.user),
    limits: {
      freeDailyLimit: FREE_DAILY_LIMIT,
      answeredToday,
      remainingToday:
        req.user.plan === "premium" ? null : Math.max(0, FREE_DAILY_LIMIT - answeredToday)
    }
  });
});

app.post("/api/questions/next", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const answeredToday = req.user.progress.dailyAnswered[today] || 0;

  if (req.user.plan !== "premium" && answeredToday >= FREE_DAILY_LIMIT) {
    return res.status(402).json({
      error: "Limite diário do plano Free atingido.",
      code: "FREE_LIMIT_REACHED"
    });
  }

  if (req.user.progress.pendingQuestion) {
    return res.json({ question: req.user.progress.pendingQuestion, reused: true });
  }

  const weaknessByTopic = getWeaknessByTopic(req.user.progress);
  const question = await generateQuestion({
    userStats: {
      level: req.user.progress.level,
      totalAnswered: req.user.progress.totalAnswered,
      totalCorrect: req.user.progress.totalCorrect
    },
    masteredQuestionIds: req.user.progress.masteredQuestionIds,
    weaknessByTopic
  });

  req.user.progress.pendingQuestion = {
    id: question.id,
    topic: question.topic,
    difficulty: question.difficulty,
    statement: question.statement,
    options: question.options,
    explanation: question.explanation,
    correctOptionIndex: question.correctOptionIndex
  };

  req.users[req.userIndex] = req.user;
  writeUsers(req.users);

  return res.json({
    question: {
      id: question.id,
      topic: question.topic,
      difficulty: question.difficulty,
      statement: question.statement,
      options: question.options
    },
    topicPoolSize: OAB_TOPICS.length
  });
});

app.post("/api/questions/answer", (req, res) => {
  const { answerIndex } = req.body;
  const pending = req.user.progress.pendingQuestion;

  if (!pending) {
    return res.status(400).json({ error: "Nenhuma questão pendente para responder." });
  }

  if (![0, 1, 2].includes(answerIndex)) {
    return res.status(400).json({ error: "Resposta inválida." });
  }

  const isCorrect = pending.correctOptionIndex === answerIndex;
  const today = new Date().toISOString().slice(0, 10);

  req.user.progress.totalAnswered += 1;
  if (isCorrect) req.user.progress.totalCorrect += 1;

  req.user.progress.dailyAnswered[today] = (req.user.progress.dailyAnswered[today] || 0) + 1;
  updateStreak(req.user.progress, today);

  const xpGained = isCorrect ? 12 + pending.difficulty * 3 : 3;
  req.user.progress.xp += xpGained;
  req.user.progress.level = computeLevel(req.user.progress.xp);

  if (!req.user.progress.topicStats[pending.topic]) {
    req.user.progress.topicStats[pending.topic] = { answered: 0, correct: 0 };
  }

  req.user.progress.topicStats[pending.topic].answered += 1;
  if (isCorrect) {
    req.user.progress.topicStats[pending.topic].correct += 1;
    if (!req.user.progress.masteredQuestionIds.includes(pending.id)) {
      req.user.progress.masteredQuestionIds.push(pending.id);
    }
  }

  const feedback = isCorrect
    ? "Mandou bem! Você está evoluindo no ritmo da aprovação."
    : "Boa tentativa! Errar faz parte: revise a explicação e tente novamente mais tarde.";

  req.user.progress.pendingQuestion = null;
  req.users[req.userIndex] = req.user;
  writeUsers(req.users);

  const accuracy = req.user.progress.totalAnswered > 0
    ? ((req.user.progress.totalCorrect / req.user.progress.totalAnswered) * 100).toFixed(1)
    : "0.0";

  return res.json({
    result: isCorrect ? "correct" : "incorrect",
    correctOptionIndex: pending.correctOptionIndex,
    explanation: pending.explanation,
    feedback,
    xpGained,
    progress: {
      xp: req.user.progress.xp,
      level: req.user.progress.level,
      streak: req.user.progress.streak,
      accuracy
    }
  });
});

app.use("/api/payment", authMiddleware, buildPaymentRouter({ readUsers, writeUsers }));

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "OAB Quest" });
});

app.listen(PORT, () => {
  console.log(`OAB Quest running at http://localhost:${PORT}`);
});

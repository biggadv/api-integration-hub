const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

function buildAuthRouter({ readUsers, writeUsers }) {
  const router = express.Router();

  router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Preencha nome, e-mail e senha." });
    }

    const users = readUsers();
    const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      return res.status(409).json({ error: "E-mail já cadastrado." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();

    const user = {
      id: uuidv4(),
      name,
      email,
      passwordHash,
      plan: "free",
      createdAt: now,
      progress: {
        xp: 0,
        level: 1,
        streak: 0,
        lastActiveDate: null,
        totalAnswered: 0,
        totalCorrect: 0,
        dailyAnswered: {},
        masteredQuestionIds: [],
        topicStats: {},
        pendingQuestion: null
      }
    };

    users.push(user);
    writeUsers(users);

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    return res.status(201).json({
      token,
      user: safeUser(user)
    });
  });

  router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Informe e-mail e senha." });
    }

    const users = readUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: safeUser(user) });
  });

  return router;
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Token ausente." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    progress: user.progress
  };
}

module.exports = {
  buildAuthRouter,
  authMiddleware,
  safeUser
};

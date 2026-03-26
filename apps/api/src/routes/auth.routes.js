const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { pool } = require("../config/db");

const router = express.Router();

router.post("/login", async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(6) });
  const validation = schema.safeParse(req.body);
  if (!validation.success) return res.status(400).json(validation.error.flatten());

  const { email, password } = validation.data;
  const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  const user = userResult.rows[0];
  if (!user) return res.status(401).json({ error: "Credenciais inválidas" });

  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) return res.status(401).json({ error: "Credenciais inválidas" });

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: "1d"
  });

  return res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

module.exports = { authRoutes: router };

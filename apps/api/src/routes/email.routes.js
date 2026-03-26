const express = require("express");
const { pool } = require("../config/db");
const { auth } = require("../middleware/auth");
const { parseTribunalEmail } = require("../services/emailParser");

const router = express.Router();

router.post("/webhook", async (req, res) => {
  const { subject, body, sender } = req.body;
  const parsed = parseTribunalEmail({ subject, body });

  const processResult = parsed.processNumber
    ? await pool.query("SELECT id FROM processes WHERE process_number = $1", [parsed.processNumber])
    : { rowCount: 0, rows: [] };

  if (processResult.rowCount === 0) {
    await pool.query(
      `INSERT INTO parser_alerts (sender_email, subject, raw_body, reason, status)
       VALUES ($1, $2, $3, $4, 'pendente')`,
      [sender, subject, body, "Processo não encontrado"]
    );

    return res.status(202).json({
      message: "E-mail recebido, aguardando validação da equipe",
      parsed
    });
  }

  const processId = processResult.rows[0].id;
  await pool.query(
    `INSERT INTO process_events (process_id, event_type, title, event_date, status, description)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [processId, parsed.type, `Evento criado por e-mail: ${parsed.type}`, parsed.deadlineDate, parsed.reviewStatus, parsed.description]
  );

  return res.status(201).json({ message: "Evento jurídico criado automaticamente", parsed });
});

router.get("/alerts", auth(["admin", "operador"]), async (req, res) => {
  const alerts = await pool.query("SELECT * FROM parser_alerts ORDER BY created_at DESC");
  return res.json(alerts.rows);
});

module.exports = { emailRoutes: router };

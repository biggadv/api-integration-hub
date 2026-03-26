const express = require("express");
const { z } = require("zod");
const { pool } = require("../config/db");
const { auth } = require("../middleware/auth");
const { addAuditLog } = require("../middleware/audit");

const router = express.Router();

router.get("/", auth(), async (req, res) => {
  const result = await pool.query(`
    SELECT p.*, c.name as client_name
    FROM processes p
    JOIN clients c ON c.id = p.client_id
    ORDER BY p.created_at DESC
  `);
  return res.json(result.rows);
});

router.post("/", auth(["admin", "operador"]), async (req, res) => {
  const schema = z.object({
    processNumber: z.string().min(10),
    parties: z.string().min(3),
    court: z.string().min(2),
    state: z.string().length(2),
    clientId: z.string().uuid()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const { processNumber, parties, court, state, clientId } = parsed.data;

  const duplicate = await pool.query(
    `SELECT id FROM processes WHERE process_number = $1 OR parties = $2`,
    [processNumber, parties]
  );

  if (duplicate.rowCount > 0) {
    return res.status(409).json({
      error: "Este processo já se encontra cadastrado no sistema."
    });
  }

  const created = await pool.query(
    `INSERT INTO processes (process_number, parties, court, state, client_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [processNumber, parties, court, state, clientId]
  );

  await addAuditLog({
    userId: req.user.id,
    actionType: "create",
    entityType: "process",
    entityId: created.rows[0].id,
    changes: created.rows[0]
  });

  return res.status(201).json(created.rows[0]);
});

router.get("/:id", auth(), async (req, res) => {
  const process = await pool.query("SELECT * FROM processes WHERE id = $1", [req.params.id]);
  if (process.rowCount === 0) return res.status(404).json({ error: "Processo não encontrado" });

  const timeline = await pool.query(
    "SELECT * FROM process_events WHERE process_id = $1 ORDER BY event_date ASC",
    [req.params.id]
  );
  const history = await pool.query(
    "SELECT * FROM audit_logs WHERE entity_id = $1 AND entity_type = 'process' ORDER BY created_at DESC",
    [req.params.id]
  );

  return res.json({ process: process.rows[0], events: timeline.rows, history: history.rows });
});

module.exports = { processRoutes: router };

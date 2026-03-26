const { pool } = require("../config/db");

async function addAuditLog({ userId, actionType, entityType, entityId, changes }) {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, changes)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, actionType, entityType, entityId, JSON.stringify(changes ?? {})]
  );
}

module.exports = { addAuditLog };

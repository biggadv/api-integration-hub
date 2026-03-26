const express = require("express");
const { auth } = require("../middleware/auth");
const { pool } = require("../config/db");

const router = express.Router();

router.get("/summary", auth(), async (req, res) => {
  const [urgent, hearings, notifications] = await Promise.all([
    pool.query("SELECT COUNT(*)::int as total FROM process_events WHERE event_type='prazo' AND event_date <= CURRENT_DATE + INTERVAL '3 day'"),
    pool.query("SELECT COUNT(*)::int as total FROM process_events WHERE event_type='audiencia' AND event_date <= CURRENT_DATE + INTERVAL '7 day'"),
    pool.query("SELECT COUNT(*)::int as total FROM process_events WHERE event_type='intimacao' AND created_at >= CURRENT_DATE - INTERVAL '7 day'")
  ]);

  const upcoming = await pool.query(
    `SELECT pe.*, p.process_number
      FROM process_events pe
      JOIN processes p ON p.id = pe.process_id
      ORDER BY pe.event_date ASC
      LIMIT 20`
  );

  return res.json({
    cards: {
      urgentDeadlines: urgent.rows[0].total,
      upcomingHearings: hearings.rows[0].total,
      recentNotifications: notifications.rows[0].total
    },
    list: upcoming.rows
  });
});

module.exports = { dashboardRoutes: router };

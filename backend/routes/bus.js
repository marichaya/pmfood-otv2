// backend/routes/bus.js
const express = require('express');
const router  = express.Router();
const { qAll, qRun } = require('../config/database');
const { requireLogin } = require('../middleware/auth');

router.get('/routes', requireLogin, async (req, res) => {
  try {
    const routes = await qAll('SELECT * FROM bus_routes ORDER BY sort_order');
    res.json({ success: true, data: routes });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/schedule', requireLogin, async (req, res) => {
  const { date, bus_route_id, color_status, note_1600, note_1900 } = req.body;
  const today = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  try {
    await qRun(
      `INSERT INTO bus_schedule (work_date, bus_route_id, color_status, note_1600, note_1900, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now','localtime'))
       ON CONFLICT(work_date, bus_route_id)
       DO UPDATE SET
         color_status = excluded.color_status,
         note_1600    = excluded.note_1600,
         note_1900    = excluded.note_1900,
         updated_at   = excluded.updated_at`,
      [today, bus_route_id, color_status || 'none', note_1600 || '', note_1900 || '']
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/schedule/bulk', requireLogin, async (req, res) => {
  const { date, updates } = req.body;
  const today = date || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  try {
    for (const u of updates) {
      await qRun(
        `INSERT INTO bus_schedule (work_date, bus_route_id, color_status, note_1600, note_1900, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now','localtime'))
         ON CONFLICT(work_date, bus_route_id)
         DO UPDATE SET
           color_status = excluded.color_status,
           note_1600    = excluded.note_1600,
           note_1900    = excluded.note_1900,
           updated_at   = excluded.updated_at`,
        [today, u.bus_route_id, u.color_status || 'none', u.note_1600 || '', u.note_1900 || '']
      );
    }
    res.json({ success: true, message: 'บันทึกทั้งหมดสำเร็จ' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;

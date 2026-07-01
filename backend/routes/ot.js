// backend/routes/ot.js
const express = require('express');
const router  = express.Router();
const { qAll, qGet, qRun } = require('../config/database');
const { requireLogin } = require('../middleware/auth');

// helper: วันที่ปัจจุบัน timezone ไทย
function thaiToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

// GET /api/ot/dept-data?date=YYYY-MM-DD&dept_id=N
// ดึงข้อมูลสำหรับหน้ากรอก OT (ทุกสายรถ + ค่าที่กรอกไว้ถ้ามี)
router.get('/dept-data', requireLogin, async (req, res) => {
  const date   = req.query.date || thaiToday();
  const user   = req.session.user;
  const deptId = user.role === 'department' ? user.department_id : parseInt(req.query.dept_id);
  try {
    const rows = await qAll(
      `SELECT b.id as bus_route_id, b.route_number, b.route_name, b.job_zone, b.sort_order,
              COALESCE(e.ot_count, 0)     as ot_count,
              COALESCE(e.non_ot_count, 0) as non_ot_count,
              e.recorder_name
       FROM bus_routes b
       LEFT JOIN ot_entries e
         ON b.id = e.bus_route_id AND e.department_id = ? AND e.work_date = ?
       ORDER BY b.sort_order`,
      [deptId, date]
    );
    const recorder = rows.find(r => r.recorder_name)?.recorder_name || '';
    res.json({ success: true, data: rows, recorder_name: recorder });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /api/ot/save-dept
// บันทึกข้อมูล OT ทั้งแผนก (bulk upsert)
router.post('/save-dept', requireLogin, async (req, res) => {
  const user = req.session.user;
  const { date, department_id, rows, recorder_name } = req.body;
  const deptId = user.role === 'department' ? user.department_id : parseInt(department_id);

  if (!deptId) return res.status(400).json({ success: false, message: 'ไม่ระบุแผนก' });
  if (user.role === 'department' && user.department_id !== deptId)
    return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์' });

  const workDate = date || thaiToday();
  try {
    for (const r of rows) {
      await qRun(
        `INSERT INTO ot_entries
           (department_id, work_date, bus_route_id, ot_count, non_ot_count, recorder_name, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))
         ON CONFLICT(department_id, work_date, bus_route_id)
         DO UPDATE SET
           ot_count      = excluded.ot_count,
           non_ot_count  = excluded.non_ot_count,
           recorder_name = excluded.recorder_name,
           updated_at    = excluded.updated_at`,
        [deptId, workDate, r.bus_route_id, r.ot_count || 0, r.non_ot_count || 0, recorder_name || '']
      );
    }
    res.json({ success: true, message: 'บันทึกสำเร็จ' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/ot/summary-ot?date=YYYY-MM-DD
// ชีท "รวมจำนวน OT" — สรุปรายแผนก
router.get('/summary-ot', requireLogin, async (req, res) => {
  const date = req.query.date || thaiToday();
  try {
    const rows = await qAll(
      `SELECT d.id, d.name_th, d.sort_order,
              COALESCE(SUM(e.ot_count), 0)     as ot_total,
              COALESCE(SUM(e.non_ot_count), 0) as non_ot_total
       FROM departments d
       LEFT JOIN ot_entries e ON d.id = e.department_id AND e.work_date = ?
       GROUP BY d.id
       ORDER BY d.sort_order`,
      [date]
    );
    const grand_ot     = rows.reduce((s, r) => s + Number(r.ot_total), 0);
    const grand_non_ot = rows.reduce((s, r) => s + Number(r.non_ot_total), 0);
    res.json({ success: true, data: rows, grand_ot, grand_non_ot, grand_total: grand_ot + grand_non_ot });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/ot/summary-bus?date=YYYY-MM-DD
// ชีท "ตารางแจ้งสายรถ" — สรุปรายสายรถ
router.get('/summary-bus', requireLogin, async (req, res) => {
  const date = req.query.date || thaiToday();
  try {
    const rows = await qAll(
      `SELECT b.id, b.route_number, b.route_name, b.job_zone, b.sort_order,
              COALESCE(SUM(e.ot_count), 0)                   as ot_total,
              COALESCE(SUM(e.non_ot_count), 0)               as non_ot_total,
              COALESCE(SUM(e.ot_count + e.non_ot_count), 0)  as total_count,
              COALESCE(bs.color_status, 'none')               as color_status,
              COALESCE(bs.note_1600, '')                      as note_1600,
              COALESCE(bs.note_1900, '')                      as note_1900
       FROM bus_routes b
       LEFT JOIN ot_entries  e  ON b.id = e.bus_route_id  AND e.work_date  = ?
       LEFT JOIN bus_schedule bs ON b.id = bs.bus_route_id AND bs.work_date = ?
       GROUP BY b.id
       ORDER BY b.sort_order`,
      [date, date]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /api/ot/history?days=30
// ดูรายการวันที่ที่มีข้อมูล (สำหรับ picker ย้อนหลัง)
router.get('/history', requireLogin, async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  try {
    const rows = await qAll(
      `SELECT DISTINCT work_date
       FROM ot_entries
       ORDER BY work_date DESC
       LIMIT ?`,
      [days]
    );
    res.json({ success: true, data: rows.map(r => r.work_date) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /api/ot/reset-today  (HR only)
// ล้างข้อมูลวันนี้ทันที
router.delete('/reset-today', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'hr')
    return res.status(403).json({ success: false, message: 'สิทธิ์ HR เท่านั้น' });
  try {
    const { resetToday } = require('../config/scheduler');
    const date = await resetToday();
    res.json({ success: true, message: `ล้างข้อมูลวันที่ ${date} สำเร็จ` });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;

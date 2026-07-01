// backend/config/scheduler.js
// รีเซ็ตข้อมูล OT และตารางสายรถทุกวัน เวลา 00:00 น. (เที่ยงคืน)
// = 12 ชั่วโมงหลังเที่ยงวัน ข้อมูลวันก่อนยังดูย้อนหลังได้เสมอ เพราะแค่เคลียร์วันปัจจุบัน

const cron = require('node-cron');
const { qRun, qAll } = require('./database');

function startScheduler() {
  // รันทุกวัน เวลา 00:00 น. (timezone Asia/Bangkok = UTC+7)
  // cron format: วินาที นาที ชั่วโมง วันเดือน เดือน วันสัปดาห์
  cron.schedule('0 0 0 * * *', async () => {
    const now = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });
    console.log(`\n🔄 [Auto Reset] เริ่มล้างข้อมูลประจำวัน — ${now}`);

    try {
      // คำนวณวันเมื่อวาน (เพื่อ log)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(7, 0, 0, 0);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // ลบข้อมูล OT ของวันเมื่อวานที่ผ่านมา (เก็บย้อนหลัง 30 วัน)
      // วันที่เก่ากว่า 30 วันจะถูกลบออก
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      const cutoff = cutoffDate.toISOString().split('T')[0];

      await qRun('DELETE FROM ot_entries WHERE work_date < ?', [cutoff]);
      await qRun('DELETE FROM bus_schedule WHERE work_date < ?', [cutoff]);

      console.log(`✅ [Auto Reset] ลบข้อมูลเก่ากว่า 30 วัน (ก่อน ${cutoff}) สำเร็จ`);
      console.log(`📂 ข้อมูลย้อนหลัง 30 วันยังคงอยู่ครบถ้วน`);
    } catch (err) {
      console.error('❌ [Auto Reset] Error:', err.message);
    }
  }, {
    timezone: 'Asia/Bangkok'
  });

  console.log('⏰ Scheduler เริ่มทำงาน — ล้างข้อมูลเก่า (>30 วัน) ทุกวันเวลา 00:00 น.');
}

// ฟังก์ชันล้างข้อมูลวันนี้ทันที (สำหรับ HR กด manual reset)
async function resetToday() {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
  await qRun('DELETE FROM ot_entries WHERE work_date = ?', [today]);
  await qRun('DELETE FROM bus_schedule WHERE work_date = ?', [today]);
  console.log(`🗑️  ล้างข้อมูลวันที่ ${today} สำเร็จ`);
  return today;
}

module.exports = { startScheduler, resetToday };

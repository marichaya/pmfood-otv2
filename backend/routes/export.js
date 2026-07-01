// backend/routes/export.js
const express = require('express');
const router  = express.Router();
const ExcelJS = require('exceljs');
const { qAll } = require('../config/database');
const { requireLogin } = require('../middleware/auth');

function thaiToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
}

router.get('/excel', requireLogin, async (req, res) => {
  const date = req.query.date || thaiToday();
  const wb   = new ExcelJS.Workbook();
  wb.creator  = 'P.M Food OT System';

  const hStyle = {
    font:      { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  };

  // Sheet 1: รวมจำนวน OT
  const ws1 = wb.addWorksheet('รวมจำนวน OT');
  ws1.columns = [
    { key: 'dept',   width: 32 },
    { key: 'ot',     width: 14 },
    { key: 'non_ot', width: 14 },
    { key: 'total',  width: 12 }
  ];
  ['หน่วยงาน (แผนก)', 'ทำ OT', 'ไม่ทำ OT', 'รวม'].forEach((h, i) => {
    const cell = ws1.getRow(1).getCell(i + 1);
    cell.value = h; Object.assign(cell, hStyle);
  });
  ws1.getRow(1).height = 28;

  const depts = await qAll(
    `SELECT d.name_th, COALESCE(SUM(e.ot_count),0) as ot, COALESCE(SUM(e.non_ot_count),0) as non_ot
     FROM departments d
     LEFT JOIN ot_entries e ON d.id=e.department_id AND e.work_date=?
     GROUP BY d.id ORDER BY d.sort_order`, [date]
  );
  let ri = 2;
  for (const d of depts) {
    const r = ws1.addRow([d.name_th, d.ot, d.non_ot, Number(d.ot) + Number(d.non_ot)]);
    r.eachCell(c => { c.alignment = { horizontal: c.col === 1 ? 'left' : 'center' }; });
    if (ri % 2 === 0) r.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFf8fafc' } }; });
    ri++;
  }
  const totOT  = depts.reduce((s, d) => s + Number(d.ot), 0);
  const totNon = depts.reduce((s, d) => s + Number(d.non_ot), 0);
  const tr = ws1.addRow(['รวมทั้งหมด', totOT, totNon, totOT + totNon]);
  tr.font = { bold: true };
  tr.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFdbeafe' } }; c.alignment = { horizontal: c.col === 1 ? 'left' : 'center' }; });

  // Sheet 2: ตารางสายรถ
  const ws2 = wb.addWorksheet('ตารางแจ้งสายรถ');
  ws2.columns = [
    { key: 'route',    width: 24 }, { key: 'zone',     width: 18 },
    { key: 'total',    width: 14 }, { key: 'ot',        width: 16 },
    { key: 'non_ot',   width: 16 }, { key: 'note1600',  width: 28 }, { key: 'note1900', width: 28 }
  ];
  ['สายรถ','จุดงาน','มาทั้งหมด','OT 19:00','เลิก 16:00','ปกติ/รวมสาย 16:00','วิ่ง OT 19:00'].forEach((h,i) => {
    const cell = ws2.getRow(1).getCell(i + 1);
    cell.value = h; Object.assign(cell, hStyle);
  });
  ws2.getRow(1).height = 28;

  const colorMap = { green: 'FFdcfce7', red: 'FFfee2e2', yellow: 'FFfef9c3', blue: 'FFdbeafe' };
  const buses = await qAll(
    `SELECT b.route_number, b.route_name, b.job_zone,
            COALESCE(SUM(e.ot_count),0) as ot, COALESCE(SUM(e.non_ot_count),0) as non_ot,
            COALESCE(bs.color_status,'none') as color_status,
            COALESCE(bs.note_1600,'') as note_1600, COALESCE(bs.note_1900,'') as note_1900
     FROM bus_routes b
     LEFT JOIN ot_entries e   ON b.id=e.bus_route_id   AND e.work_date=?
     LEFT JOIN bus_schedule bs ON b.id=bs.bus_route_id AND bs.work_date=?
     GROUP BY b.id ORDER BY b.sort_order`, [date, date]
  );
  for (const b of buses) {
    const row = ws2.addRow([
      `สาย ${b.route_number} ${b.route_name}`, b.job_zone,
      Number(b.ot) + Number(b.non_ot), b.ot, b.non_ot, b.note_1600, b.note_1900
    ]);
    const bg = colorMap[b.color_status];
    if (bg) row.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } }; });
    row.eachCell(c => { c.alignment = { horizontal: c.col <= 2 || c.col >= 6 ? 'left' : 'center' }; });
  }

  const fname = `OT_PMFood_${date.replace(/-/g, '')}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
  await wb.xlsx.write(res);
  res.end();
});

router.get('/pdf', requireLogin, async (req, res) => {
  const date = req.query.date || thaiToday();
  const PDFDoc = require('pdfkit');
  const doc    = new PDFDoc({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="OT_PMFood_${date.replace(/-/g,'')}.pdf"`);
  doc.pipe(res);

  const depts = await qAll(
    `SELECT d.name_th, COALESCE(SUM(e.ot_count),0) as ot, COALESCE(SUM(e.non_ot_count),0) as non_ot
     FROM departments d LEFT JOIN ot_entries e ON d.id=e.department_id AND e.work_date=?
     GROUP BY d.id ORDER BY d.sort_order`, [date]
  );
  const gOT  = depts.reduce((s, d) => s + Number(d.ot), 0);
  const gNon = depts.reduce((s, d) => s + Number(d.non_ot), 0);

  doc.fontSize(18).fillColor('#1e3a5f').text('P.M Food - สรุป OT ประจำวัน', { align: 'center' });
  doc.fontSize(11).fillColor('#64748b').text(`วันที่: ${date}  |  OT: ${gOT} คน  |  ไม่ OT: ${gNon} คน  |  รวม: ${gOT + gNon} คน`, { align: 'center' });
  doc.moveDown();

  doc.rect(40, doc.y, 515, 22).fill('#1e3a5f');
  const hy = doc.y - 18;
  doc.fillColor('#fff').fontSize(11)
     .text('หน่วยงาน', 50, hy).text('ทำ OT', 340, hy, { width:60, align:'center' })
     .text('ไม่ทำ OT', 400, hy, { width:70, align:'center' }).text('รวม', 475, hy, { width:60, align:'center' });
  doc.moveDown(0.3);

  for (let i = 0; i < depts.length; i++) {
    const d = depts[i];
    const y = doc.y;
    if (i % 2 === 0) doc.rect(40, y, 515, 20).fill('#f8fafc');
    doc.fillColor('#334155').fontSize(10)
       .text(d.name_th, 50, y + 4)
       .text(String(d.ot), 340, y + 4, { width:60, align:'center' })
       .text(String(d.non_ot), 400, y + 4, { width:70, align:'center' })
       .text(String(Number(d.ot) + Number(d.non_ot)), 475, y + 4, { width:60, align:'center' });
    doc.moveDown(0.7);
  }
  const ty = doc.y;
  doc.rect(40, ty, 515, 22).fill('#dbeafe');
  doc.fillColor('#1e3a5f').fontSize(11)
     .text('รวมทั้งหมด', 50, ty + 4)
     .text(String(gOT), 340, ty + 4, { width:60, align:'center' })
     .text(String(gNon), 400, ty + 4, { width:70, align:'center' })
     .text(String(gOT + gNon), 475, ty + 4, { width:60, align:'center' });
  doc.end();
});

module.exports = router;

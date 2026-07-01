// backend/config/database.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { createClient } = require('@libsql/client');

const db = createClient({
  url:       process.env.TURSO_URL       || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

// Helper: run query คืน rows[]
async function qAll(sql, params = []) {
  const r = await db.execute({ sql, args: params });
  return r.rows;
}

// Helper: run query คืน row แรก
async function qGet(sql, params = []) {
  const r = await db.execute({ sql, args: params });
  return r.rows[0] || null;
}

// Helper: run query คืน lastInsertRowid / rowsAffected
async function qRun(sql, params = []) {
  return await db.execute({ sql, args: params });
}

// Helper: run หลาย query ใน transaction
async function qBatch(statements) {
  return await db.batch(statements, 'write');
}

async function initDB() {
  console.log('📦 กำลังเชื่อมต่อฐานข้อมูล...');
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS departments (
        id      INTEGER PRIMARY KEY AUTOINCREMENT,
        name_th TEXT    NOT NULL,
        username TEXT   NOT NULL UNIQUE,
        sort_order INTEGER DEFAULT 0
      )`, args: []
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        username      TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name  TEXT NOT NULL,
        role          TEXT NOT NULL CHECK(role IN ('hr','department')),
        department_id INTEGER
      )`, args: []
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS bus_routes (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        route_number TEXT NOT NULL,
        route_name   TEXT NOT NULL,
        job_zone     TEXT DEFAULT '',
        sort_order   INTEGER DEFAULT 0
      )`, args: []
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS ot_entries (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        department_id INTEGER NOT NULL,
        work_date     TEXT    NOT NULL,
        bus_route_id  INTEGER NOT NULL,
        ot_count      INTEGER NOT NULL DEFAULT 0,
        non_ot_count  INTEGER NOT NULL DEFAULT 0,
        recorder_name TEXT    DEFAULT '',
        updated_at    TEXT    DEFAULT (datetime('now','localtime')),
        UNIQUE(department_id, work_date, bus_route_id)
      )`, args: []
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS bus_schedule (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        work_date    TEXT NOT NULL,
        bus_route_id INTEGER NOT NULL,
        color_status TEXT DEFAULT 'none',
        note_1600    TEXT DEFAULT '',
        note_1900    TEXT DEFAULT '',
        updated_at   TEXT DEFAULT (datetime('now','localtime')),
        UNIQUE(work_date, bus_route_id)
      )`, args: []
    }
  ], 'write');
  console.log('✅ ฐานข้อมูลพร้อมใช้งาน');
}

module.exports = { qAll, qGet, qRun, qBatch, initDB };

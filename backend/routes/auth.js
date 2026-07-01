// backend/routes/auth.js
const express = require('express');
const bcrypt  = require('bcrypt');
const router  = express.Router();
const { qGet } = require('../config/database');

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'กรุณากรอก Username และ Password' });

    const user = await qGet(
      `SELECT u.*, d.name_th as dept_name
       FROM users u LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.username = ?`,
      [username.trim().toLowerCase()]
    );

    if (!user) return res.status(401).json({ success: false, message: 'Username หรือ Password ไม่ถูกต้อง' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ success: false, message: 'Username หรือ Password ไม่ถูกต้อง' });

    req.session.user = {
      id: user.id, username: user.username,
      display_name: user.display_name, role: user.role,
      department_id: user.department_id, dept_name: user.dept_name
    };
    res.json({ success: true, user: req.session.user });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ success: true }); });
});

router.get('/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ success: false });
  res.json({ success: true, user: req.session.user });
});

module.exports = router;

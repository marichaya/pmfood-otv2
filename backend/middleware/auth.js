// backend/middleware/auth.js

function requireLogin(req, res, next) {
  if (!req.session?.user) {
    if (req.path.startsWith('/api/')) return res.status(401).json({ success: false, message: 'กรุณา Login ก่อน' });
    return res.redirect('/login.html');
  }
  next();
}

function requireHR(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ success: false, message: 'กรุณา Login ก่อน' });
  if (req.session.user.role !== 'hr') return res.status(403).json({ success: false, message: 'สิทธิ์ HR เท่านั้น' });
  next();
}

module.exports = { requireLogin, requireHR };

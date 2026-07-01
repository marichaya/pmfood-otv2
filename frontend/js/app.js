// frontend/js/app.js
window.App = {
  user: null,
  HR_ONLY: ['dashboard.html', 'summary-ot.html', 'bus-schedule.html'],

  async init(pageTitle, pageSubtitle) {
    try {
      const r = await fetch('/api/auth/me');
      const d = await r.json();
      if (!d.success) { location.href = '/login.html'; return false; }
      this.user = d.user;
      const cur = location.pathname.split('/').pop();
      if (this.user.role !== 'hr' && this.HR_ONLY.includes(cur)) {
        location.href = '/pages/ot-entry.html'; return false;
      }
      this._shell(pageTitle || 'Dashboard', pageSubtitle || '');
      return true;
    } catch { location.href = '/login.html'; return false; }
  },

  _shell(title, subtitle) {
    const u  = this.user;
    const hr = u.role === 'hr';
    const av = u.display_name.charAt(0).toUpperCase();
    const cur = location.pathname.split('/').pop();
    const nl = (href, icon, label) => {
      const a = cur === href ? 'background:rgba(255,255,255,.2);color:#fff' : 'color:#94a3b8';
      return `<a href="/pages/${href}" style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;text-decoration:none;font-size:14px;transition:all .2s;${a}" onmouseover="this.style.background='rgba(255,255,255,.1)';this.style.color='#fff'" onmouseout="if('${cur}'!=='${href}'){this.style.background='';this.style.color='#94a3b8'}">
        <i class="${icon}" style="width:18px;text-align:center"></i><span>${label}</span></a>`;
    };
    document.body.insertAdjacentHTML('afterbegin', `
      <aside id="sb" style="position:fixed;top:0;left:0;height:100%;width:256px;z-index:40;display:flex;flex-direction:column;
        background:linear-gradient(180deg,#0f172a,#1e3a5f);box-shadow:4px 0 20px rgba(0,0,0,.3);transition:transform .3s">
        <div style="padding:20px;border-bottom:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:12px">
          <div style="width:40px;height:40px;background:#2563eb;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="fas fa-industry" style="color:#fff"></i></div>
          <div><p style="font-weight:700;color:#fff;font-size:18px;line-height:1">P.M Food</p>
            <p style="color:#60a5fa;font-size:12px">OT Management</p></div>
        </div>
        <div style="margin:16px;padding:12px;background:rgba(255,255,255,.1);border-radius:12px;display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;flex-shrink:0">${av}</div>
          <div style="overflow:hidden"><p style="color:#fff;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.display_name}</p>
            <p style="color:#60a5fa;font-size:12px">${hr ? 'HR / Admin' : (u.dept_name || 'แผนก')}</p></div>
        </div>
        <nav style="flex:1;padding:8px 12px;overflow-y:auto;display:flex;flex-direction:column;gap:2px">
          <p style="color:rgba(148,163,184,.6);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;padding:4px 12px;margin-top:4px">เมนูหลัก</p>
          ${hr ? nl('dashboard.html','fas fa-chart-pie','Dashboard') : ''}
          ${nl('ot-entry.html','fas fa-pen-to-square','ลงข้อมูล OT')}
          ${hr ? nl('summary-ot.html','fas fa-table-list','รวมจำนวน OT') : ''}
          ${hr ? nl('bus-schedule.html','fas fa-bus','ตารางแจ้งสายรถ') : ''}
          ${hr ? `<div style="margin-top:12px">
            <p style="color:rgba(148,163,184,.6);font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;padding:4px 12px">Export</p>
            <button onclick="App.exportExcel()" style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:none;border:none;cursor:pointer;font-size:14px;color:#86efac;font-family:inherit;transition:all .2s" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='none'">
              <i class="fas fa-file-excel" style="width:18px;text-align:center"></i><span>Export Excel</span></button>
            <button onclick="App.exportPDF()" style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:none;border:none;cursor:pointer;font-size:14px;color:#fca5a5;font-family:inherit;transition:all .2s" onmouseover="this.style.background='rgba(255,255,255,.1)'" onmouseout="this.style.background='none'">
              <i class="fas fa-file-pdf" style="width:18px;text-align:center"></i><span>Export PDF</span></button>
          </div>` : ''}
        </nav>
        <div style="padding:16px;border-top:1px solid rgba(255,255,255,.1)">
          <button onclick="App.logout()" style="width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:12px;background:none;border:none;cursor:pointer;font-size:14px;color:#fca5a5;font-family:inherit" onmouseover="this.style.background='rgba(239,68,68,.15)'" onmouseout="this.style.background='none'">
            <i class="fas fa-right-from-bracket" style="width:18px;text-align:center"></i><span>ออกจากระบบ</span></button>
        </div>
      </aside>
      <div id="sbOv" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:30" onclick="App.closeSb()"></div>
      <div style="margin-left:256px;min-height:100vh;display:flex;flex-direction:column;background:#f8fafc" id="mainWrap">
        <header style="position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.05)">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;gap:12px">
            <div style="display:flex;align-items:center;gap:12px">
              <button onclick="App.toggleSb()" style="display:none;padding:8px;border-radius:8px;background:none;border:none;cursor:pointer;color:#64748b" id="menuBtn">
                <i class="fas fa-bars" style="font-size:18px"></i></button>
              <div>
                <h2 id="pageTitle" style="font-size:18px;font-weight:700;color:#1e293b;line-height:1">${title}</h2>
                <p id="pageSub" style="font-size:12px;color:#94a3b8;margin-top:2px">${subtitle}</p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="display:flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:6px 12px">
                <i class="fas fa-calendar-day" style="color:#3b82f6;font-size:13px"></i>
                <input type="date" id="globalDate" style="font-size:13px;color:#334155;background:transparent;border:none;outline:none;font-family:inherit">
              </div>
              <div style="display:flex;align-items:center;gap:8px;background:#eff6ff;border-radius:8px;padding:6px 12px">
                <div style="width:26px;height:26px;background:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;font-weight:700">${av}</div>
                <span style="font-size:13px;font-weight:500;color:#1d4ed8">${u.display_name}</span>
              </div>
            </div>
          </div>
        </header>
        <main style="flex:1;padding:20px 24px" id="pageContent"></main>
      </div>
    `);

    const dateEl = document.getElementById('globalDate');
    const today  = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' });
    dateEl.value = today;
    dateEl.max   = today; // ไม่ให้เลือกวันในอนาคต
    dateEl.addEventListener('change', () => { if (window._onDateChange) window._onDateChange(dateEl.value); });

    this._responsive();
    window.addEventListener('resize', () => this._responsive());
  },

  _responsive() {
    const sb  = document.getElementById('sb');
    const btn = document.getElementById('menuBtn');
    const mw  = document.getElementById('mainWrap');
    if (!sb) return;
    if (window.innerWidth < 1024) {
      sb.style.transform = sb.classList.contains('open') ? '' : 'translateX(-100%)';
      if (btn) btn.style.display = 'block';
      if (mw)  mw.style.marginLeft = '0';
    } else {
      sb.style.transform = '';
      if (btn) btn.style.display = 'none';
      if (mw)  mw.style.marginLeft = '256px';
    }
  },

  toggleSb() {
    const sb = document.getElementById('sb');
    const ov = document.getElementById('sbOv');
    const open = sb.classList.toggle('open');
    sb.style.transform = open ? '' : 'translateX(-100%)';
    ov.style.display   = open ? 'block' : 'none';
  },
  closeSb() {
    const sb = document.getElementById('sb');
    sb.classList.remove('open');
    sb.style.transform = 'translateX(-100%)';
    document.getElementById('sbOv').style.display = 'none';
  },

  getDate() { return document.getElementById('globalDate')?.value || new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Bangkok' }); },

  async logout() {
    if (!confirm('ต้องการออกจากระบบ?')) return;
    await fetch('/api/auth/logout', { method: 'POST' });
    location.href = '/login.html';
  },

  exportExcel() { window.open(`/api/export/excel?date=${this.getDate()}`, '_blank'); },
  exportPDF()   { window.open(`/api/export/pdf?date=${this.getDate()}`, '_blank'); },

  toast(msg, type = 'success') {
    const c = { success:'#22c55e', error:'#ef4444', warning:'#f59e0b', info:'#3b82f6' };
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;top:16px;right:16px;z-index:999;background:${c[type]};color:#fff;padding:12px 20px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.2);font-size:14px;font-weight:500;display:flex;align-items:center;gap:8px;transform:translateX(120%);transition:transform .3s;font-family:'Sarabun',sans-serif`;
    t.innerHTML = `<span>${msg}</span>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.style.transform = 'translateX(0)');
    setTimeout(() => { t.style.transform = 'translateX(120%)'; setTimeout(() => t.remove(), 300); }, 3000);
  },

  loading(show = true) {
    let el = document.getElementById('_ld');
    if (show && !el) {
      el = document.createElement('div');
      el.id = '_ld';
      el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.3);z-index:998;display:flex;align-items:center;justify-content:center';
      el.innerHTML = `<div style="background:#fff;border-radius:16px;padding:24px 32px;display:flex;align-items:center;gap:12px;box-shadow:0 20px 40px rgba(0,0,0,.2)">
        <div style="width:28px;height:28px;border:3px solid #3b82f6;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></div>
        <span style="color:#334155;font-weight:500;font-family:'Sarabun',sans-serif">กำลังโหลด...</span></div>`;
      if (!document.getElementById('_spin')) {
        const s = document.createElement('style');
        s.id = '_spin'; s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
      }
      document.body.appendChild(el);
    } else if (!show && el) el.remove();
  },

  dateThLong(d) {
    return new Date(d + 'T00:00:00').toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  }
};

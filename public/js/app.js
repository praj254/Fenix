/* ═══════════════════════════════════════════════════════════
   FENIX — Frontend App
   ═══════════════════════════════════════════════════════════ */

const API = {
  base: '/api',

  token() { return localStorage.getItem('cp_token'); },
  user() { return JSON.parse(localStorage.getItem('cp_user') || 'null'); },

  headers() {
    return {
      'Content-Type': 'application/json',
      ...(this.token() ? { Authorization: `Bearer ${this.token()}` } : {})
    };
  },

  async _handleResponse(r) {
    if (r.status === 401 || r.status === 403) {
      if (!window.location.pathname.includes('/login.html')) {
        this.clearSession();
        window.location.href = '/login.html';
        return;
      }
    }
    return r.json();
  },

  async get(path) {
    const r = await fetch(this.base + path, { headers: this.headers() });
    return this._handleResponse(r);
  },

  async post(path, body) {
    const r = await fetch(this.base + path, {
      method: 'POST', headers: this.headers(),
      body: JSON.stringify(body)
    });
    return this._handleResponse(r);
  },

  async put(path, body) {
    const r = await fetch(this.base + path, {
      method: 'PUT', headers: this.headers(),
      body: JSON.stringify(body)
    });
    return this._handleResponse(r);
  },

  async delete(path) {
    const r = await fetch(this.base + path, {
      method: 'DELETE', headers: this.headers()
    });
    return this._handleResponse(r);
  },

  async uploadForm(path, formData) {
    const r = await fetch(this.base + path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token()}` },
      body: formData
    });
    return this._handleResponse(r);
  },

  setSession(token, user) {
    localStorage.setItem('cp_token', token);
    localStorage.setItem('cp_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_user');
  },

  isLoggedIn() { return !!this.token(); }
};

/* ─── Theme Manager ─────────────────────────────────────────── */
const Theme = {
  init() {
    const saved = localStorage.getItem('cp_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  },

  toggle() {
    const curr = document.documentElement.getAttribute('data-theme');
    const next = curr === 'dark' ? 'light' : 'dark';

    const btn = document.getElementById('theme-toggle');
    const rect = btn?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    // Ripple
    const ripple = document.createElement('div');
    ripple.className = `theme-ripple ${next}`;
    ripple.style.cssText = `width:40px;height:40px;left:${x - 20}px;top:${y - 20}px`;
    document.body.appendChild(ripple);

    // Flash
    const flash = document.createElement('div');
    flash.className = `theme-flash to-${next}`;
    document.body.appendChild(flash);

    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('cp_theme', next);

    setTimeout(() => { ripple.remove(); flash.remove(); }, 800);
  }
};

/* ─── Loading Overlay ───────────────────────────────────────── */
const Loader = {
  show(msg = 'Loading...') {
    let el = document.getElementById('global-loader');
    if (!el) {
      el = document.createElement('div');
      el.id = 'global-loader';
      el.innerHTML = `
        <div class="loader-inner">
          <div class="loader-spinner"></div>
          <div class="loader-text" id="loader-text">${msg}</div>
        </div>`;
      document.body.appendChild(el);
    }
    document.getElementById('loader-text').textContent = msg;
    el.classList.add('active');
  },
  hide() {
    const el = document.getElementById('global-loader');
    if (el) el.classList.remove('active');
  }
};

/* ─── Toast Notifications ───────────────────────────────────── */
const Toast = {
  container: null,

  _ICONS: {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  },

  _TITLES: {
    success: 'Success',
    error: 'Error',
    info: 'Info',
    warning: 'Warning',
  },

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.init();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    toast.innerHTML = `
      <div class="toast-accent"></div>
      <div class="toast-icon-wrap">
        ${this._ICONS[type] || this._ICONS.info}
      </div>
      <div class="toast-body">
        <div class="toast-title">${this._TITLES[type] || type}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" aria-label="Dismiss">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="toast-progress"><div class="toast-progress-bar" style="animation-duration:${duration}ms"></div></div>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    const dismiss = () => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 380);
    };
    closeBtn.addEventListener('click', dismiss);

    this.container.appendChild(toast);

    // Pause progress on hover
    toast.addEventListener('mouseenter', () => {
      toast.querySelector('.toast-progress-bar').style.animationPlayState = 'paused';
    });
    toast.addEventListener('mouseleave', () => {
      toast.querySelector('.toast-progress-bar').style.animationPlayState = 'running';
    });

    setTimeout(dismiss, duration);
  },

  success(msg, dur) { this.show(msg, 'success', dur); },
  error(msg, dur) { this.show(msg, 'error', dur); },
  info(msg, dur) { this.show(msg, 'info', dur); },
  warning(msg, dur) { this.show(msg, 'warning', dur); },
};

/* ─── Auth ──────────────────────────────────────────────────── */
const Auth = {
  async register(name, email, password) {
    const data = await API.post('/auth/register', { name, email, password });
    if (data.token) {
      API.setSession(data.token, data.user);
      Toast.success('Account created! Welcome 🎉');
      setTimeout(() => window.location.href = '/dashboard', 800);
    } else {
      throw new Error(data.error || data.errors?.[0]?.msg || 'Registration failed');
    }
  },

  async login(email, password) {
    const data = await API.post('/auth/login', { email, password });
    if (data.twofa_required) return data;
    throw new Error(data.error || 'Login failed');
  },

  logout() {
    API.clearSession();
    window.location.href = '/login';
  },

  guard() {
    if (!API.isLoggedIn()) window.location.href = '/login';
  }
};

/* ─── Applications ──────────────────────────────────────────── */
const Applications = {
  async getAll(filters = {}) {
    const q = new URLSearchParams(filters).toString();
    return API.get(`/applications${q ? '?' + q : ''}`);
  },
  async create(data) { return API.post('/applications', data); },
  async update(id, data) { return API.put(`/applications/${id}`, data); },
  async delete(id) { return API.delete(`/applications/${id}`); },
  async getStats() { return API.get('/applications/stats'); }
};

/* ─── Dashboard ─────────────────────────────────────────────── */
const Dashboard = {
  async load() { return API.get('/dashboard'); }
};

/* ─── Animate Numbers ───────────────────────────────────────── */
function animateNumber(el, target, duration = 1200) {
  if (!el) return;
  const startTime = performance.now();
  const isPercent = el.dataset.suffix === '%';
  function update(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(target * ease) + (isPercent ? '%' : '');
    if (progress < 1) requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
}

/* ─── Scroll Animations ─────────────────────────────────────── */
function initScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-in').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

/* ─── Modal Manager ─────────────────────────────────────────── */
const Modal = {
  open(id) { document.getElementById(id)?.classList.add('open'); },
  close(id) { document.getElementById(id)?.classList.remove('open'); },
  closeAll() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
  }
};

/* ─── Helpers ───────────────────────────────────────────────── */
function statusBadge(status) {
  const map = {
    Applied: 'badge-applied',
    Interview: 'badge-interview',
    Assessment: 'badge-interview',
    Offer: 'badge-offer',
    Rejected: 'badge-rejected',
    Ghosted: 'badge-ghosted',
    'Under Review': 'badge-applied'
  };
  return `<span class="badge ${map[status] || ''}">${status}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/* ─── Avatar ────────────────────────────────────────────────── */
const Avatar = {
  set(dataUrl) {
    localStorage.setItem('cp_avatar', dataUrl);
    this.apply();
  },
  get() { return localStorage.getItem('cp_avatar'); },
  apply() {
    const url = this.get();
    const user = API.user();
    const initials = user ? getInitials(user.name) : '?';
    document.querySelectorAll('.avatar, #nav-avatar, #dropdown-avatar, #hero-avatar, #profile-avatar-img').forEach(el => {
      if (url) {
        el.style.backgroundImage = `url(${url})`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
      } else if (user) {
        el.style.backgroundImage = `url('https://ui-avatars.com/api/?name=${user.name}&background=random&color=fff&size=128')`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
      } else {
        el.textContent = initials;
      }
    });
  }
};

/* ─── Notifications ─────────────────────────────────────────── */
async function loadNotificationCount() {
  try {
    const data = await API.get('/notifications');
    const unread = (data.notifications || []).filter(n => !n.is_read).length;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unread;
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
  } catch (e) { console.error('Notification count failed', e); }
}

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  if (!list) return;

  list.innerHTML = '<div class="notif-empty"><div class="loader-spinner" style="margin:0 auto"></div></div>';

  try {
    const data = await API.get('/notifications');
    const notifications = data.notifications || [];

    if (!notifications.length) {
      list.innerHTML = '<div class="notif-empty">🔔 No notifications yet</div>';
      return;
    }

    const icons = { reminder: '⏰', ghosted: '👻', status_change: '📋', recommendation: '💡' };

    list.innerHTML = notifications.slice(0, 15).map(n => `
      <div class="notif-item ${!n.is_read ? 'unread' : ''}" data-id="${n.id}">
        <div class="notif-icon">${icons[n.type] || '🔔'}</div>
        <div style="flex:1">
          <div class="notif-text">${n.message}</div>
          <div class="notif-time">${formatDate(n.created_at)}</div>
        </div>
        ${!n.is_read ? '<div style="width:8px;height:8px;border-radius:50%;background:var(--accent-primary);flex-shrink:0"></div>' : ''}
      </div>`).join('');

    list.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', async () => {
        const id = item.dataset.id;
        await API.put(`/notifications/${id}/read`, {});
        item.classList.remove('unread');
        item.querySelector('[style*="border-radius:50%"]')?.remove();
        loadNotificationCount();
      });
    });

  } catch (e) {
    list.innerHTML = '<div class="notif-empty">Failed to load</div>';
  }
}

async function markAllRead() {
  try {
    const data = await API.get('/notifications');
    const unread = (data.notifications || []).filter(n => !n.is_read);
    if (!unread.length) { Toast.info('No unread notifications'); return; }
    await Promise.all(unread.map(n => API.put(`/notifications/${n.id}/read`, {})));
    const badge = document.getElementById('notif-badge');
    if (badge) badge.style.display = 'none';
    await loadNotifications();
    Toast.success('All marked as read ✅');
  } catch (e) {
    Toast.error('Failed to mark as read');
  }
}

/* ─── Navbar Init ───────────────────────────────────────────── */
function initNavbar() {
  const user = API.user();
  if (!user) return;

  // Set initials on all avatar elements via background image
  document.querySelectorAll('#nav-avatar, #dropdown-avatar').forEach(el => {
    if (el) {
      el.style.backgroundImage = `url('https://ui-avatars.com/api/?name=${user.name}&background=random&color=fff&size=128')`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.textContent = '';
    }
  });
  Avatar.apply();

  const nameEl = document.getElementById('dropdown-name');
  const emailEl = document.getElementById('dropdown-email');
  if (nameEl) nameEl.textContent = user.name;
  if (emailEl) emailEl.textContent = user.email;

  // Elements
  const profileBtn = document.getElementById('profile-btn');
  const profileDropdown = document.getElementById('profile-dropdown');
  const notifBtn = document.getElementById('notif-btn');
  const notifDropdown = document.getElementById('notif-dropdown');
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');

  // Profile dropdown
  profileBtn?.addEventListener('click', e => {
    e.stopPropagation();
    profileDropdown?.classList.toggle('open');
    notifDropdown?.classList.remove('open');
  });

  // Notifications dropdown
  notifBtn?.addEventListener('click', e => {
    e.stopPropagation();
    notifDropdown?.classList.toggle('open');
    profileDropdown?.classList.remove('open');
    if (notifDropdown?.classList.contains('open')) loadNotifications();
  });

  // Close on outside click
  document.addEventListener('click', () => {
    profileDropdown?.classList.remove('open');
    notifDropdown?.classList.remove('open');
  });

  // Mobile sidebar
  if (mobileBtn && sidebar && sidebarOverlay) {
    mobileBtn.addEventListener('click', () => {
      mobileBtn.classList.toggle('open');
      sidebar.classList.toggle('open');
      sidebarOverlay.classList.toggle('open');
    });
    sidebarOverlay.addEventListener('click', () => {
      mobileBtn.classList.remove('open');
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('open');
    });
  }

  loadNotificationCount();
}

/* ─── Global Init ───────────────────────────────────────────── */
function initApp() {
  Theme.init();
  Toast.init();
  initScrollAnimations();

  // Theme toggles (navbar + profile + any others)
  document.querySelectorAll('.theme-btn, .theme-toggle').forEach(btn => {
    btn.addEventListener('click', Theme.toggle);
  });

  // ALL logout buttons (navbar + sidebar + profile dropdown)
  document.querySelectorAll('#logout-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) Modal.closeAll();
    });
  });

  // Init navbar if logged in
  if (API.isLoggedIn()) initNavbar();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
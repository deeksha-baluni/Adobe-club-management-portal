/**
 * profile-panel.js — OG-style profile drawer content for logged-in users.
 */

const AVATAR_BASE = '/assets/images/avatar/';
const AVAILABLE_AVATARS = [
  `${AVATAR_BASE}9434619.jpg`,
  `${AVATAR_BASE}9439678.jpg`,
  `${AVATAR_BASE}9440461.jpg`,
  `${AVATAR_BASE}9441909.jpg`,
  `${AVATAR_BASE}9720029.jpg`,
  `${AVATAR_BASE}10491829.jpg`,
  `${AVATAR_BASE}10491830.jpg`,
  `${AVATAR_BASE}10491845.jpg`,
  `${AVATAR_BASE}11475206.jpg`,
  `${AVATAR_BASE}11475207.jpg`,
  `${AVATAR_BASE}11475209.jpg`,
  `${AVATAR_BASE}11475211.jpg`,
  `${AVATAR_BASE}11475215.jpg`,
  `${AVATAR_BASE}11475221.jpg`,
  `${AVATAR_BASE}11475227.jpg`,
];

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getAuth() {
  return window.AdobeClubsAuth || {
    isAuthenticated: () => false,
    getCurrentUser: () => null,
    getSession: () => null,
    isAdmin: () => false,
    isClubAdmin: () => false,
    getJoinedClubs: () => [],
    getRsvpedEvents: () => [],
    mergePublishedEvents: (events) => events || [],
    getAvatar: () => '',
    setAvatar: () => {},
    clearSession: () => {},
    loginUrlWithNext: () => '/login',
  };
}

function getInitials(name) {
  return (name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';
}

function setAvatarEl(el, initials, src) {
  if (!el) return;
  if (src) {
    const img = document.createElement('img');
    img.className = 'profile-avatar-img';
    img.alt = '';
    img.src = src;
    img.addEventListener('error', () => { el.textContent = initials; }, { once: true });
    el.replaceChildren(img);
  } else {
    el.textContent = initials;
  }
}

function getProfileIdentity() {
  const auth = getAuth();
  const user = auth.getCurrentUser?.();
  if (!user) {
    return { name: 'Guest User', email: 'Not signed in', company: 'Guest' };
  }
  return {
    name: user.displayName || user.username,
    email: user.email,
    company: user.company || 'Adobe Inc.',
    role: user.role,
    username: user.username,
  };
}

async function getProfileStats(loggedIn) {
  try {
    const auth = getAuth();
    const res = await fetch('/data/data.json');
    if (!res.ok) throw new Error('stats unavailable');
    const data = await res.json();
    const joinedClubIds = loggedIn ? auth.getJoinedClubs?.() || [] : [];
    const rsvpedEventIds = loggedIn ? auth.getRsvpedEvents?.() || [] : [];
    const joinedClubsDetail = (data.clubs || [])
      .filter((club) => joinedClubIds.includes(club.id))
      .map((club) => ({
        id: club.id,
        name: club.name,
        tag: club.tag,
        accent: club.accent,
      }));
    const allEvents = auth.mergePublishedEvents?.(data.events || []) || (data.events || []);
    const rsvpedEventsDetail = allEvents
      .filter((event) => rsvpedEventIds.includes(event.id))
      .map((event) => ({
        id: event.id,
        title: event.title,
        day: event.day,
        month: event.month,
        time: event.time,
        club: event.club,
      }));
    return {
      joinedClubs: joinedClubIds.length,
      joinedEvents: rsvpedEventIds.length,
      joinedClubsDetail,
      rsvpedEventsDetail,
    };
  } catch {
    return {
      joinedClubs: 0,
      joinedEvents: 0,
      joinedClubsDetail: [],
      rsvpedEventsDetail: [],
    };
  }
}

function renderJoinedClubs(clubs) {
  if (!clubs.length) {
    return '<p class="profile-card-copy profile-card-copy--meta">No clubs joined yet.</p>';
  }
  return `
    <div class="profile-club-list">
      ${clubs.map((club) => `
        <a class="profile-club-item" href="/club?id=${esc(club.id)}" style="--club-accent: ${esc(club.accent || '#1473e6')}">
          <span class="profile-club-icon" aria-hidden="true">${esc((club.name || 'C').charAt(0))}</span>
          <div class="profile-club-info">
            <span class="profile-club-name">${esc(club.name)}</span>
            ${club.tag ? `<span class="profile-club-tag">${esc(club.tag)}</span>` : ''}
          </div>
        </a>
      `).join('')}
    </div>`;
}

function renderRsvpSection(stats, loggedIn) {
  if (!loggedIn) {
    return '<p class="profile-card-copy profile-card-copy--meta">Sign in to RSVP for events.</p>';
  }
  const events = stats.rsvpedEventsDetail || [];
  if (!events.length) {
    return `
      <div class="profile-rsvp-empty">
        <p class="profile-card-copy profile-card-copy--meta">No events RSVPed yet.</p>
        <a class="profile-rsvp-btn" href="/events">Browse events</a>
      </div>`;
  }
  const months = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11,
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = events.filter((ev) => {
    const m = months[String(ev.month || '').toUpperCase()];
    if (m == null) return true;
    const d = parseInt(ev.day, 10);
    if (Number.isNaN(d)) return true;
    const dt = new Date(today.getFullYear(), m, d);
    dt.setHours(0, 0, 0, 0);
    return dt >= today;
  });
  const sorted = [...upcoming].sort((a, b) => {
    const ma = months[String(a.month || '').toUpperCase()];
    const mb = months[String(b.month || '').toUpperCase()];
    const da = ma != null ? new Date(today.getFullYear(), ma, parseInt(a.day, 10) || 0) : null;
    const db = mb != null ? new Date(today.getFullYear(), mb, parseInt(b.day, 10) || 0) : null;
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });
  return `
    <div class="profile-rsvp-preview">
      ${sorted.slice(0, 5).map((ev) => `
        <a class="profile-rsvp-item profile-rsvp-item--link" href="/event?id=${esc(ev.id)}">
          <span class="profile-rsvp-date">${esc(ev.month)}<br>${esc(ev.day)}</span>
          <span class="profile-rsvp-item-body">
            <span class="profile-rsvp-title">${esc(ev.title)}</span>
            <span class="profile-rsvp-meta">${esc(ev.club)}${ev.time ? ` · ${esc(ev.time)}` : ''}</span>
          </span>
        </a>
      `).join('')}
    </div>
    <a class="profile-rsvp-link" href="/events?rsvp=mine">View all RSVP'd events (${events.length})</a>`;
}

function renderManageSection(isClubScoped = false) {
  return `
    <div class="profile-manage-list">
      <a class="profile-manage-item" href="/home"><span>${isClubScoped ? 'My club dashboard' : 'Admin dashboard'}</span><span>›</span></a>
      <a class="profile-manage-item" href="/events"><span>Add an event</span><span>+</span></a>
      <a class="profile-manage-item" href="/resources"><span>Add a resource</span><span>+</span></a>
      <a class="profile-manage-item" href="/events"><span>Post an event recap</span><span>›</span></a>
      <a class="profile-manage-item" href="/clubs"><span>${isClubScoped ? 'View my clubs' : 'Manage clubs'}</span><span>›</span></a>
    </div>`;
}

export async function renderProfilePanel({ trigger } = {}) {
  const auth = getAuth();
  const loggedIn = Boolean(auth.isAuthenticated?.());
  const isAdmin = Boolean(auth.isAdmin?.());
  const isClubAdmin = Boolean(auth.isClubAdmin?.());
  const isAnyAdmin = isAdmin || isClubAdmin;
  const roleLabel = isAdmin ? 'Administrator' : isClubAdmin ? 'Club admin' : 'Member';
  const identity = getProfileIdentity();
  const initials = getInitials(identity.name);
  const storedAvatar = auth.getAvatar?.() || '';
  const selectedAvatar = loggedIn
    ? (AVAILABLE_AVATARS.includes(storedAvatar) ? storedAvatar : AVAILABLE_AVATARS[0])
    : '';
  const stats = await getProfileStats(loggedIn);

  if (trigger) setAvatarEl(trigger, initials, selectedAvatar);

  const content = document.getElementById('profile-content');
  if (!content) return;

  const roleChip = !loggedIn
    ? ''
    : isAnyAdmin
      ? `<span class="profile-role-chip profile-role-chip--admin">${roleLabel}</span>`
      : '<span class="profile-role-chip">Member</span>';

  const guestBody = `
    <section class="profile-section">
      <h3>Why sign in</h3>
      <div class="profile-card">
        <ul class="profile-why-list">
          <li>Join clubs that match your interests</li>
          <li>RSVP to events and track them in one place</li>
          <li>Get recommendations picked for you</li>
        </ul>
      </div>
    </section>
    <div class="profile-divider"></div>
    <div class="profile-actions">
      <a class="profile-action-btn profile-action-btn--link profile-action-btn--primary" href="${esc(auth.loginUrlWithNext?.() || '/login')}">Sign in</a>
      <a class="profile-action-btn profile-action-btn--link profile-action-btn--secondary" href="/login#signup">Create account</a>
    </div>`;

  const memberBody = `
    <section class="profile-section">
      <h3>Account</h3>
      <div class="profile-card">
        <p class="profile-card-title">${esc(identity.company)}</p>
        <p class="profile-card-copy profile-card-copy--meta">Signed in as ${roleLabel} · @${esc(identity.username || '')}</p>
        <p class="profile-stat"><strong>${stats.joinedClubs}</strong> clubs joined</p>
        <p class="profile-stat"><strong>${stats.joinedEvents}</strong> events joined</p>
        <button type="button" class="profile-create-club" id="profile-create-club" disabled aria-disabled="true" title="Club proposals coming soon">+ Create a club</button>
      </div>
    </section>
    ${isAnyAdmin ? `
    <section class="profile-section">
      <h3>Manage</h3>
      <div class="profile-card">
        ${renderManageSection(isClubAdmin && !isAdmin)}
      </div>
    </section>` : ''}
    <section class="profile-section">
      <h3>Joined Clubs</h3>
      <div class="profile-card">
        ${renderJoinedClubs(stats.joinedClubsDetail || [])}
      </div>
    </section>
    <section class="profile-section">
      <h3>RSVP'd Events</h3>
      <div class="profile-card">
        ${renderRsvpSection(stats, loggedIn)}
      </div>
    </section>
    <section class="profile-section">
      <h3>Avatar</h3>
      <div class="profile-card">
        <div class="profile-avatar-grid">
          ${AVAILABLE_AVATARS.map((src) => `
            <button type="button" class="profile-avatar-option ${src === selectedAvatar ? 'is-active' : ''}" data-avatar-src="${esc(src)}" aria-label="Choose avatar">
              <img src="${esc(src)}" alt="" loading="lazy" decoding="async" />
            </button>
          `).join('')}
        </div>
      </div>
    </section>
    <div class="profile-divider"></div>
    <div class="profile-actions">
      <button type="button" class="profile-action-btn profile-action-btn--signout" id="profile-signout-btn">Sign out</button>
    </div>`;

  content.innerHTML = `
    <div class="profile-head">
      <div class="profile-avatar" id="profile-avatar-main">${initials}</div>
      <div class="profile-identity">
        <h2>${esc(identity.name)}</h2>
        <p>${esc(identity.email)}</p>
        ${roleChip}
      </div>
    </div>
    <div class="profile-divider"></div>
    ${loggedIn ? memberBody : guestBody}
  `;

  setAvatarEl(document.getElementById('profile-avatar-main'), initials, selectedAvatar);

  document.getElementById('profile-signout-btn')?.addEventListener('click', () => {
    auth.clearSession?.();
    window.location.href = '/?logout=1';
  });

  content.querySelectorAll('.profile-avatar-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      const src = btn.getAttribute('data-avatar-src') || '';
      auth.setAvatar?.(src);
      renderProfilePanel({ trigger });
    });
  });
}

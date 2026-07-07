/**
 * auth-guard.js — shared auth state helper (non-blocking)
 * Admins: preloaded from data.json · Users: signup stored in localStorage
 */
'use strict';

/* Clear session via ?logout=1 — works without user-view code */
(function handleLogoutQuery() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('logout') === '1') {
      localStorage.removeItem('adobeClubsAuth');
      window.location.replace(window.location.pathname || '/');
    }
  } catch (err) { /* ignore */ }
})();

(function initAuthGuard() {
  const AUTH_STORAGE_KEY = 'adobeClubsAuth';
  const USERS_REGISTRY_KEY = 'adobeClubsUsersRegistry';
  const USER_PROFILE_PREFIX = 'adobeClubsUserProfile:';
  const LOGIN_PAGE = '/login';
  const JOINED_CLUBS_KEY = 'adobeClubsJoinedClubs';
  const RSVP_EVENTS_KEY = 'adobeClubsRsvpedEvents';
  const CUSTOM_EVENTS_KEY = 'adobeClubsCustomEvents';
  const CUSTOM_ARTICLES_KEY = 'adobeClubsCustomArticles';
  const AVATAR_KEY = 'adobeClubsAvatar';
  const THEME_SESSION_KEY = 'theme';
  const LEGACY_JOINED_KEY = 'adobeClubsJoinedClubs';
  const LEGACY_RSVP_KEY = 'adobeClubsRsvpedEvents';
  const LEGACY_AVATAR_KEY = 'adobeClubsAvatar';
  const MEMBER_DELTAS_KEY = 'adobeClubsMemberDeltas';
  const EVENT_RECAPS_KEY = 'adobeClubsEventRecaps';
  const DELETED_EVENTS_KEY = 'adobeClubsDeletedEvents';
  const DELETED_ARTICLES_KEY = 'adobeClubsDeletedArticles';
  const DELETED_RECAPS_KEY = 'adobeClubsDeletedRecaps';
  const EVENT_OVERRIDES_KEY = 'adobeClubsEventOverrides';
  const ARTICLE_OVERRIDES_KEY = 'adobeClubsArticleOverrides';
  const PUBLISHED_CONTENT_KEYS = [
    CUSTOM_EVENTS_KEY,
    CUSTOM_ARTICLES_KEY,
    EVENT_RECAPS_KEY,
    DELETED_EVENTS_KEY,
    DELETED_ARTICLES_KEY,
    DELETED_RECAPS_KEY,
    EVENT_OVERRIDES_KEY,
    ARTICLE_OVERRIDES_KEY,
  ];

  let legacyStorageMigrated = false;
  let adminsCache = null;

  function normalizeIdentity(value) {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  }

  function isAdobeEmail(value) {
    return /^[^\s@]+@adobe\.com$/i.test(normalizeIdentity(value));
  }

  const ADOBE_EMAIL_ERROR = 'Email must end with @adobe.com.';

  function getSession() {
    try {
      return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || 'null');
    } catch (err) {
      return null;
    }
  }

  function isAuthenticated() {
    const session = getSession();
    return Boolean(session && session.isAuthenticated);
  }

  function getActiveUsername() {
    const session = getSession();
    return session?.isAuthenticated ? session.username : null;
  }

  function scopedKey(baseKey) {
    const username = getActiveUsername();
    return username ? `${baseKey}:${username}` : null;
  }

  function profileKey(username) {
    return `${USER_PROFILE_PREFIX}${username}`;
  }

  function loginUrlWithNext() {
    const target = `${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`;
    return `${LOGIN_PAGE}?next=${encodeURIComponent(target)}`;
  }

  function redirectToLogin() {
    window.location.href = loginUrlWithNext();
  }

  function readArray(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (err) {
      return [];
    }
  }

  function writeArray(key, value) {
    localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
  }

  function readMemberDeltas() {
    try {
      const parsed = JSON.parse(localStorage.getItem(MEMBER_DELTAS_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function writeMemberDeltas(deltas) {
    localStorage.setItem(MEMBER_DELTAS_KEY, JSON.stringify(deltas || {}));
  }

  function getClubMemberCount(clubId, baseMembers = 0) {
    if (!clubId) return Math.max(0, Number(baseMembers) || 0);
    const deltas = readMemberDeltas();
    const base = Number(baseMembers) || 0;
    const delta = Number(deltas[clubId]) || 0;
    return Math.max(0, base + delta);
  }

  function adjustClubMemberDelta(clubId, delta) {
    if (!clubId || !delta) return;
    const deltas = readMemberDeltas();
    const next = Math.max(0, (Number(deltas[clubId]) || 0) + delta);
    if (next === 0) delete deltas[clubId];
    else deltas[clubId] = next;
    writeMemberDeltas(deltas);
    window.dispatchEvent(new CustomEvent('adobe-club-members-changed', { detail: { clubId } }));
  }

  function enrichClubMembers(club) {
    if (!club?.id) return club;
    return {
      ...club,
      members: getClubMemberCount(club.id, club.members),
    };
  }

  function enrichClubs(clubs) {
    return (clubs || []).map(enrichClubMembers);
  }

  async function loadAuthConfig() {
    if (adminsCache) return adminsCache;
    try {
      const res = await fetch('./data/data.json');
      if (!res.ok) throw new Error('config unavailable');
      const data = await res.json();
      adminsCache = Array.isArray(data.auth?.admins)
        ? data.auth.admins.map(admin => {
            const username = admin.username || 'admin';
            return {
              ...admin,
              username,
              email: username === 'admin' ? 'admin@adobe.com' : normalizeIdentity(admin.email || ''),
            };
          })
        : [];
    } catch (err) {
      adminsCache = [];
    }
    return adminsCache;
  }

  function getUsersRegistry() {
    try {
      const raw = JSON.parse(localStorage.getItem(USERS_REGISTRY_KEY) || '{"users":[]}');
      return Array.isArray(raw.users) ? raw : { users: [] };
    } catch (err) {
      return { users: [] };
    }
  }

  function saveUsersRegistry(registry) {
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
  }

  function getUserProfile(username) {
    const uname = username || getActiveUsername();
    if (!uname) return null;
    try {
      return JSON.parse(localStorage.getItem(profileKey(uname)) || 'null');
    } catch (err) {
      return null;
    }
  }

  function saveUserProfile(username, profile) {
    if (!username || !profile) return;
    localStorage.setItem(profileKey(username), JSON.stringify(profile));
  }

  function initUserStorage(username) {
    if (!username) return;

    const joinedKey = `${JOINED_CLUBS_KEY}:${username}`;
    const rsvpKey = `${RSVP_EVENTS_KEY}:${username}`;

    if (!localStorage.getItem(joinedKey)) writeArray(joinedKey, []);
    if (!localStorage.getItem(rsvpKey)) writeArray(rsvpKey, []);

    const existing = getUserProfile(username);
    if (!existing) {
      saveUserProfile(username, {
        username,
        joinedClubs: [],
        rsvpedEvents: [],
        avatar: '',
        updatedAt: Date.now(),
      });
    }
  }

  function createSession(account, options = {}) {
    const session = {
      isAuthenticated: true,
      role: account.role || 'user',
      username: account.username,
      email: account.email,
      displayName: account.displayName || account.username,
      company: account.company || 'Adobe Inc.',
      manages: Array.isArray(account.manages) ? account.manages : [],
      loggedInAt: Date.now(),
      isNewSignup: Boolean(options.isNewSignup),
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    initUserStorage(account.username);

    const profile = getUserProfile(account.username) || { username: account.username };
    saveUserProfile(account.username, {
      ...profile,
      username: account.username,
      email: account.email,
      displayName: session.displayName,
      company: session.company,
      role: session.role,
      lastLoginAt: Date.now(),
    });

    migrateLegacyStorage();
    return session;
  }

  function registerUser({ username, email, password, displayName, company }) {
    const uname = normalizeUsername(username);
    const mail = normalizeIdentity(email);
    const pass = String(password || '');

    if (!uname || uname.length < 3) {
      return { ok: false, error: 'Username must be at least 3 characters (letters, numbers, . _ -).' };
    }
    if (!mail || !isAdobeEmail(mail)) {
      return { ok: false, error: ADOBE_EMAIL_ERROR };
    }
    if (pass.length < 6) {
      return { ok: false, error: 'Password must be at least 6 characters.' };
    }

    const registry = getUsersRegistry();
    const admins = adminsCache || [];

    if (registry.users.some(u => u.username === uname)) {
      return { ok: false, error: 'That username is already taken.' };
    }
    if (registry.users.some(u => u.email === mail)) {
      return { ok: false, error: 'That email is already registered.' };
    }
    if (admins.some(a => normalizeIdentity(a.username) === uname || normalizeIdentity(a.email) === mail)) {
      return { ok: false, error: 'This identity is reserved. Choose a different username or email.' };
    }

    const userRecord = {
      username: uname,
      email: mail,
      password: pass,
      displayName: String(displayName || '').trim() || uname,
      company: String(company || '').trim() || 'Adobe Inc.',
      role: 'user',
      createdAt: Date.now(),
    };

    registry.users.push(userRecord);
    saveUsersRegistry(registry);
    initUserStorage(uname);
    saveUserProfile(uname, {
      username: uname,
      email: mail,
      displayName: userRecord.displayName,
      company: userRecord.company,
      role: 'user',
      createdAt: userRecord.createdAt,
      joinedClubs: [],
      rsvpedEvents: [],
      avatar: '',
    });

    return { ok: true, account: userRecord };
  }

  async function authenticate(identity, password) {
    const id = normalizeIdentity(identity);
    const pass = String(password || '');
    if (!id || !pass) return null;

    if (id.includes('@') && !isAdobeEmail(id)) {
      return null;
    }

    const admins = await loadAuthConfig();
    const adminHit = admins.find(
      item => (id === normalizeIdentity(item.username) || id === normalizeIdentity(item.email)) && pass === item.password
    );
    if (adminHit) {
      return {
        role: adminHit.role === 'clubAdmin' ? 'clubAdmin' : 'admin',
        username: adminHit.username,
        email: adminHit.email,
        displayName: adminHit.displayName || adminHit.username,
        company: adminHit.company || 'Adobe Inc.',
        manages: Array.isArray(adminHit.manages) ? adminHit.manages : [],
      };
    }

    const registry = getUsersRegistry();
    const userHit = registry.users.find(
      item => (id === item.username || id === item.email) && pass === item.password
    );
    if (userHit) {
      return {
        role: 'user',
        username: userHit.username,
        email: userHit.email,
        displayName: userHit.displayName || userHit.username,
        company: userHit.company || 'Adobe Inc.',
      };
    }

    return null;
  }

  function migrateLegacyStorage() {
    if (legacyStorageMigrated) return;
    legacyStorageMigrated = true;

    const username = getActiveUsername();
    if (!username) return;

    const joinedScoped = scopedKey(JOINED_CLUBS_KEY);
    const rsvpScoped = scopedKey(RSVP_EVENTS_KEY);
    const avatarScoped = scopedKey(AVATAR_KEY);

    if (joinedScoped && !localStorage.getItem(joinedScoped)) {
      const legacyJoined = readArray(LEGACY_JOINED_KEY);
      if (legacyJoined.length && username === 'admin') {
        writeArray(joinedScoped, legacyJoined);
      }
    }

    if (rsvpScoped && !localStorage.getItem(rsvpScoped)) {
      const legacyRsvp = readArray(LEGACY_RSVP_KEY);
      if (legacyRsvp.length && username === 'admin') {
        writeArray(rsvpScoped, legacyRsvp);
      }
    }

    if (avatarScoped && !localStorage.getItem(avatarScoped)) {
      const legacyAvatar = localStorage.getItem(LEGACY_AVATAR_KEY);
      if (legacyAvatar && username === 'admin') {
        localStorage.setItem(avatarScoped, legacyAvatar);
      }
    }
  }

  function getRole() {
    return getSession()?.role || 'guest';
  }

  function isAdmin() {
    return isAuthenticated() && getRole() === 'admin';
  }

  function isClubAdmin() {
    return isAuthenticated() && getRole() === 'clubAdmin';
  }

  /** Either an overall admin or a club-scoped admin. */
  function isAnyAdmin() {
    return isAdmin() || isClubAdmin();
  }

  /** Club ids a club-admin manages. Overall admins are unrestricted → returns []. */
  function getManagedClubIds() {
    const session = getSession();
    if (!session?.isAuthenticated) return [];
    return Array.isArray(session.manages) ? session.manages : [];
  }

  /**
   * True when the active user may manage the given club.
   * Overall admins can manage every club; club-admins only their own.
   */
  function canManageClub(clubId) {
    if (isAdmin()) return true;
    if (!clubId || !isClubAdmin()) return false;
    return getManagedClubIds().includes(clubId);
  }

  /**
   * Clubs the user is the admin *of* (used to disable self-join etc.).
   * Overall admins return [] so they keep normal member interactions.
   */
  function getAdminOf() {
    return isClubAdmin() ? getManagedClubIds() : [];
  }

  /** Preloaded admin directory (from data.json), available after loadAuthConfig(). */
  function getAdminDirectory() {
    return Array.isArray(adminsCache) ? adminsCache : [];
  }

  /** Usernames of overall (unrestricted) admins. Falls back to ['admin']. */
  function getOverallAdminUsernames() {
    const list = getAdminDirectory()
      .filter(a => (a.role || 'admin') === 'admin')
      .map(a => a.username);
    return list.length ? list : ['admin'];
  }

  /** Usernames of club-admins who manage the given club. */
  function getClubAdminUsernames(clubId) {
    if (!clubId) return [];
    return getAdminDirectory()
      .filter(a => a.role === 'clubAdmin' && Array.isArray(a.manages) && a.manages.includes(clubId))
      .map(a => a.username);
  }

  function getCurrentUser() {
    const session = getSession();
    if (!session?.isAuthenticated) return null;
    return {
      username: session.username,
      email: session.email,
      displayName: session.displayName || session.username,
      company: session.company || 'Adobe Inc.',
      role: session.role,
    };
  }

  function getJoinedClubs() {
    migrateLegacyStorage();
    const key = scopedKey(JOINED_CLUBS_KEY);
    if (!key) return [];
    return readArray(key);
  }

  function isClubJoined(clubId) {
    return getJoinedClubs().includes(clubId);
  }

  function toggleClubJoin(clubId) {
    const key = scopedKey(JOINED_CLUBS_KEY);
    if (!key) return false;
    const list = readArray(key);
    const wasJoined = list.includes(clubId);
    let next;
    if (wasJoined) {
      next = list.filter(id => id !== clubId);
    } else {
      next = [...list, clubId];
    }
    writeArray(key, next);

    if (!wasJoined && next.includes(clubId)) {
      adjustClubMemberDelta(clubId, 1);
    } else if (wasJoined && !next.includes(clubId)) {
      adjustClubMemberDelta(clubId, -1);
    }

    const username = getActiveUsername();
    if (username) {
      const profile = getUserProfile(username) || { username };
      saveUserProfile(username, { ...profile, joinedClubs: next, updatedAt: Date.now() });
    }
    window.dispatchEvent(new CustomEvent('adobe-club-members-changed', { detail: { clubId } }));
    return !wasJoined;
  }

  function getRsvpedEvents() {
    migrateLegacyStorage();
    const key = scopedKey(RSVP_EVENTS_KEY);
    if (!key) return [];
    return readArray(key);
  }

  function isEventRsvped(eventId) {
    return getRsvpedEvents().includes(eventId);
  }

  function toggleEventRsvp(eventId) {
    const key = scopedKey(RSVP_EVENTS_KEY);
    if (!key) return false;
    const list = readArray(key);
    let next;
    if (list.includes(eventId)) {
      next = list.filter(id => id !== eventId);
    } else {
      next = [...list, eventId];
    }
    writeArray(key, next);

    window.dispatchEvent(new CustomEvent('adobe-rsvp-changed', { detail: { eventId } }));

    const username = getActiveUsername();
    if (username) {
      const profile = getUserProfile(username) || { username };
      saveUserProfile(username, { ...profile, rsvpedEvents: next, updatedAt: Date.now() });
    }
    return !list.includes(eventId);
  }

  function readEventRecapsStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(EVENT_RECAPS_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function recapHasSummary(recap) {
    if (!recap) return false;
    if (typeof recap === 'string') return recap.trim().length > 0;
    return Boolean(String(recap.summary || recap.body || '').trim());
  }

  function readDeletedIds(key) {
    return new Set(readArray(key));
  }

  function readOverrides(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function writeOverrides(key, obj) {
    localStorage.setItem(key, JSON.stringify(obj && typeof obj === 'object' ? obj : {}));
  }

  function isEventDeleted(eventId) {
    return Boolean(eventId && readDeletedIds(DELETED_EVENTS_KEY).has(eventId));
  }

  function isArticleDeleted(articleId) {
    return Boolean(articleId && readDeletedIds(DELETED_ARTICLES_KEY).has(articleId));
  }

  function isRecapDeleted(eventId) {
    return Boolean(eventId && readDeletedIds(DELETED_RECAPS_KEY).has(eventId));
  }

  function clearRecapDeletedFlag(eventId) {
    if (!eventId) return;
    writeArray(DELETED_RECAPS_KEY, readArray(DELETED_RECAPS_KEY).filter(id => id !== eventId));
  }

  function mergeRecapsIntoEvents(events) {
    const stored = readEventRecapsStore();
    const deletedRecaps = readDeletedIds(DELETED_RECAPS_KEY);
    return (events || []).map(ev => {
      if (!ev?.id) return ev;
      if (deletedRecaps.has(ev.id)) {
        const next = { ...ev };
        delete next.recap;
        return next;
      }
      if (recapHasSummary(ev.recap)) return ev;
      if (stored[ev.id]) return { ...ev, recap: stored[ev.id] };
      return ev;
    });
  }

  function notifyPublishedContentChanged(detail = {}) {
    window.dispatchEvent(new CustomEvent('adobe-published-content-changed', { detail }));
  }

  function onPublishedContentChange(callback) {
    if (typeof callback !== 'function') return () => {};
    const handler = () => callback();
    window.addEventListener('adobe-published-content-changed', handler);
    const onStorage = (e) => {
      if (PUBLISHED_CONTENT_KEYS.includes(e.key)) handler();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('adobe-published-content-changed', handler);
      window.removeEventListener('storage', onStorage);
    };
  }

  function getEventRecap(eventId, eventObj) {
    if (isRecapDeleted(eventId)) return null;
    if (eventObj?.recap && recapHasSummary(eventObj.recap)) return eventObj.recap;
    if (!eventId) return null;
    return readEventRecapsStore()[eventId] || null;
  }

  function readAllCustomEvents() {
    return readArray(CUSTOM_EVENTS_KEY);
  }

  function ownerOf(item) {
    return item?.createdBy || 'admin';
  }

  function getCustomEvents() {
    const username = getActiveUsername();
    if (!username) return [];
    return readAllCustomEvents().filter(event => ownerOf(event) === username);
  }

  function getAllCustomEvents() {
    return readAllCustomEvents();
  }

  function getAllCustomArticles() {
    return readAllCustomArticles();
  }

  function parseEventDateForFilter(ev) {
    const MONTH_INDEX = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
    if (!ev?.month || !ev?.day || ev.day === '—') return null;
    const month = MONTH_INDEX[String(ev.month).toUpperCase()];
    const day = parseInt(ev.day, 10);
    if (month == null || Number.isNaN(day)) return null;
    const d = new Date(new Date().getFullYear(), month, day);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** Drop past events older than one month; keep upcoming and recent past. */
  function filterStalePastEvents(events = []) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setMonth(cutoff.getMonth() - 1);
    return events.filter((ev) => {
      const dt = parseEventDateForFilter(ev);
      if (!dt) return true;
      if (dt >= today) return true;
      return dt >= cutoff;
    });
  }

  function mergePublishedEvents(baseEvents = []) {
    const deleted = readDeletedIds(DELETED_EVENTS_KEY);
    const overrides = readOverrides(EVENT_OVERRIDES_KEY);
    const byId = new Map();
    [...readAllCustomEvents(), ...(baseEvents || [])].forEach(ev => {
      if (ev?.id && !deleted.has(ev.id)) byId.set(ev.id, ev);
    });
    Object.entries(overrides).forEach(([id, patch]) => {
      if (deleted.has(id) || !patch) return;
      byId.set(id, { ...(byId.get(id) || {}), ...patch, id });
    });
    const merged = mergeRecapsIntoEvents([...byId.values()]);
    const withRecaps = window.AdobeUserFeatures?.mergePublishedRecaps?.(merged) || merged;
    return filterStalePastEvents(withRecaps);
  }

  function mergePublishedArticles(baseArticles = []) {
    const deleted = readDeletedIds(DELETED_ARTICLES_KEY);
    const overrides = readOverrides(ARTICLE_OVERRIDES_KEY);
    const byId = new Map();
    [...readAllCustomArticles(), ...(baseArticles || [])].forEach(art => {
      if (art?.id && !deleted.has(art.id)) byId.set(art.id, art);
    });
    Object.entries(overrides).forEach(([id, patch]) => {
      if (deleted.has(id) || !patch) return;
      byId.set(id, { ...(byId.get(id) || {}), ...patch, id });
    });
    return [...byId.values()];
  }

  function updateCustomEvent(eventId, patch) {
    if (!eventId || !patch) return;
    const all = readAllCustomEvents();
    const idx = all.findIndex(ev => ev.id === eventId);
    if (idx === -1) return;
    all[idx] = { ...all[idx], ...patch };
    writeArray(CUSTOM_EVENTS_KEY, all);
  }

  function savePublishedEvent(event, meta = {}) {
    if (!isAnyAdmin() || !event?.id) return false;
    if (isClubAdmin() && !canManageClub(event.clubId || meta.clubId)) return false;
    const payload = { ...event, id: event.id };
    const custom = readAllCustomEvents();
    const idx = custom.findIndex(ev => ev.id === payload.id);
    if (idx >= 0) {
      custom[idx] = {
        ...custom[idx],
        ...payload,
        createdBy: custom[idx].createdBy || getActiveUsername() || 'admin',
      };
      writeArray(CUSTOM_EVENTS_KEY, custom);
    } else {
      const overrides = readOverrides(EVENT_OVERRIDES_KEY);
      overrides[payload.id] = { ...(overrides[payload.id] || {}), ...payload, id: payload.id };
      writeOverrides(EVENT_OVERRIDES_KEY, overrides);
    }
    notifyPublishedContentChanged({ type: 'event', id: payload.id, action: 'update', meta });
    return true;
  }

  function deletePublishedEvent(eventId, meta = {}) {
    if (!isAnyAdmin() || !eventId) return false;
    if (isClubAdmin() && meta.clubId && !canManageClub(meta.clubId)) return false;
    const custom = readAllCustomEvents();
    if (custom.some(ev => ev.id === eventId)) {
      writeArray(CUSTOM_EVENTS_KEY, custom.filter(ev => ev.id !== eventId));
    } else {
      writeArray(DELETED_EVENTS_KEY, [...readDeletedIds(DELETED_EVENTS_KEY), eventId]);
    }
    const eventOverrides = readOverrides(EVENT_OVERRIDES_KEY);
    delete eventOverrides[eventId];
    writeOverrides(EVENT_OVERRIDES_KEY, eventOverrides);
    deleteEventRecap(eventId, { silent: true });
    notifyPublishedContentChanged({ type: 'event', id: eventId, action: 'delete', meta });
    return true;
  }

  function savePublishedArticle(article, meta = {}) {
    if (!isAnyAdmin() || !article?.id) return false;
    if (isClubAdmin() && !canManageClub(article.clubId || meta.clubId)) return false;
    const payload = { ...article, id: article.id };
    const custom = readAllCustomArticles();
    const idx = custom.findIndex(art => art.id === payload.id);
    if (idx >= 0) {
      custom[idx] = {
        ...custom[idx],
        ...payload,
        createdBy: custom[idx].createdBy || getActiveUsername() || 'admin',
      };
      writeArray(CUSTOM_ARTICLES_KEY, custom);
    } else {
      const overrides = readOverrides(ARTICLE_OVERRIDES_KEY);
      overrides[payload.id] = { ...(overrides[payload.id] || {}), ...payload, id: payload.id };
      writeOverrides(ARTICLE_OVERRIDES_KEY, overrides);
    }
    notifyPublishedContentChanged({ type: 'article', id: payload.id, action: 'update', meta });
    return true;
  }

  function deletePublishedArticle(articleId, meta = {}) {
    if (!isAnyAdmin() || !articleId) return false;
    if (isClubAdmin() && meta.clubId && !canManageClub(meta.clubId)) return false;
    const custom = readAllCustomArticles();
    if (custom.some(art => art.id === articleId)) {
      writeArray(CUSTOM_ARTICLES_KEY, custom.filter(art => art.id !== articleId));
    } else {
      writeArray(DELETED_ARTICLES_KEY, [...readDeletedIds(DELETED_ARTICLES_KEY), articleId]);
    }
    const articleOverrides = readOverrides(ARTICLE_OVERRIDES_KEY);
    delete articleOverrides[articleId];
    writeOverrides(ARTICLE_OVERRIDES_KEY, articleOverrides);
    notifyPublishedContentChanged({ type: 'article', id: articleId, action: 'delete', meta });
    return true;
  }

  function saveEventRecap(eventId, recap, meta = {}) {
    if (!isAnyAdmin() || !eventId || !recap) return false;
    if (isClubAdmin() && meta.clubId && !canManageClub(meta.clubId)) return false;
    clearRecapDeletedFlag(eventId);
    const store = readEventRecapsStore();
    store[eventId] = recap;
    localStorage.setItem(EVENT_RECAPS_KEY, JSON.stringify(store));
    updateCustomEvent(eventId, { recap });
    notifyPublishedContentChanged({
      type: 'recap',
      id: eventId,
      action: meta.action || 'update',
      meta,
    });
    return true;
  }

  function deleteEventRecap(eventId, options = {}) {
    if (!isAnyAdmin() || !eventId) return false;
    if (isClubAdmin() && options.meta?.clubId && !canManageClub(options.meta.clubId)) return false;
    const store = readEventRecapsStore();
    delete store[eventId];
    localStorage.setItem(EVENT_RECAPS_KEY, JSON.stringify(store));
    updateCustomEvent(eventId, { recap: null });
    writeArray(DELETED_RECAPS_KEY, [...readDeletedIds(DELETED_RECAPS_KEY), eventId]);
    if (!options.silent) {
      notifyPublishedContentChanged({
        type: 'recap',
        id: eventId,
        action: 'delete',
        meta: options.meta || {},
      });
    }
    return true;
  }

  function addCustomEvent(event) {
    const username = getActiveUsername();
    if (!username) return;
    const payload = { ...event, createdBy: username };
    writeArray(CUSTOM_EVENTS_KEY, [...readAllCustomEvents(), payload]);
    notifyPublishedContentChanged({ type: 'event', id: payload.id, action: 'create' });
  }

  function readAllCustomArticles() {
    return readArray(CUSTOM_ARTICLES_KEY);
  }

  function getCustomArticles() {
    const username = getActiveUsername();
    if (!username) return [];
    return readAllCustomArticles().filter(article => ownerOf(article) === username);
  }

  function addCustomArticle(article) {
    const username = getActiveUsername();
    if (!username) return false;
    const payload = { ...article, createdBy: username };
    writeArray(CUSTOM_ARTICLES_KEY, [...readAllCustomArticles(), payload]);
    notifyPublishedContentChanged({ type: 'article', id: payload.id, action: 'create' });
    return true;
  }

  function getAvatar() {
    migrateLegacyStorage();
    const key = scopedKey(AVATAR_KEY);
    if (!key) return '';
    return localStorage.getItem(key) || '';
  }

  function setAvatar(src) {
    const key = scopedKey(AVATAR_KEY);
    const username = getActiveUsername();
    if (!key) return;
    if (!src) localStorage.removeItem(key);
    else localStorage.setItem(key, src);

    if (username) {
      const profile = getUserProfile(username) || { username };
      saveUserProfile(username, { ...profile, avatar: src || '', updatedAt: Date.now() });
    }
  }

  window.AdobeClubsAuth = {
    key: AUTH_STORAGE_KEY,
    getSession,
    getCurrentUser,
    getActiveUsername,
    isAuthenticated,
    loginUrlWithNext,
    redirectToLogin,
    getRole,
    isAdmin,
    isClubAdmin,
    isAnyAdmin,
    getManagedClubIds,
    canManageClub,
    getAdminOf,
    getOverallAdminUsernames,
    getClubAdminUsernames,
    loadAuthConfig,
    isAdobeEmail,
    ADOBE_EMAIL_ERROR,
    authenticate,
    registerUser,
    createSession,
    getUsersRegistry,
    getUserProfile,
    saveUserProfile,
    initUserStorage,
    getJoinedClubs,
    isClubJoined,
    toggleClubJoin,
    getClubMemberCount,
    enrichClubMembers,
    enrichClubs,
    getRsvpedEvents,
    isEventRsvped,
    toggleEventRsvp,
    getCustomEvents,
    getAllCustomEvents,
    mergePublishedEvents,
    getEventRecap,
    notifyPublishedContentChanged,
    onPublishedContentChange,
    getCustomArticles,
    getAllCustomArticles,
    mergePublishedArticles,
    updateCustomEvent,
    savePublishedEvent,
    deletePublishedEvent,
    savePublishedArticle,
    deletePublishedArticle,
    saveEventRecap,
    deleteEventRecap,
    isEventDeleted,
    isArticleDeleted,
    isRecapDeleted,
    addCustomEvent,
    addCustomArticle,
    getAvatar,
    setAvatar,
    resetThemePreference() {
      try {
        sessionStorage.removeItem(THEME_SESSION_KEY);
        localStorage.removeItem(THEME_SESSION_KEY);
      } catch (err) { /* ignore */ }
      document.documentElement.setAttribute('data-theme', 'light');
    },
    clearSession() {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      try {
        sessionStorage.removeItem(THEME_SESSION_KEY);
        localStorage.removeItem(THEME_SESSION_KEY);
      } catch (err) { /* ignore */ }
      document.documentElement.setAttribute('data-theme', 'light');
    },
  };

  loadAuthConfig();
})();

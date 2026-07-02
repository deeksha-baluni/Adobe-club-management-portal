/**
 * user-features.js — Interests, notes, comments, reminders, recaps
 */
'use strict';

(function () {
  const INTERESTS_KEY = 'adobeClubsInterests';
  const EVENT_NOTES_KEY = 'adobeClubsEventNotes';
  const EVENT_REMINDERS_KEY = 'adobeClubsEventReminders';
  const EVENT_COMMENTS_KEY = 'adobeClubsEventComments';
  const EVENT_RECAPS_KEY = 'adobeClubsEventRecaps';

  const TAG_TO_CLUBS = {
    Photography: ['adobe-lens'],
    Engineering: ['dev-guild'],
    Sports: ['sportzone'],
    Design: ['adobe-creatives'],
    Food: ['food-brew'],
    Reading: ['book-club'],
    Games: ['board-games'],
    Sustainability: ['green-adobe'],
    Community: ['volunteering-club'],
    Wellbeing: ['mental-health'],
  };

  // One interest per active club — keeps the quiz aligned with clubs that exist.
  const INTEREST_OPTIONS = [
    { id: 'photography', label: 'Photography', icon: '📷', weights: { Photography: 3 } },          // Adobe Lens
    { id: 'art-design', label: 'Design & Creative', icon: '🎨', weights: { Design: 3 } },           // Adobe Creatives
    { id: 'programming', label: 'Programming & Tech', icon: '💻', weights: { Engineering: 3 } },    // Dev Guild
    { id: 'sports', label: 'Sports & Fitness', icon: '⚡', weights: { Sports: 3 } },                // SportZone
    { id: 'food', label: 'Food & Cooking', icon: '🍽️', weights: { Food: 3 } },                     // Food & Brew
    { id: 'reading', label: 'Reading & Books', icon: '📖', weights: { Reading: 3 } },               // Book Club
    { id: 'gaming', label: 'Games & Tabletop', icon: '🎲', weights: { Games: 3 } },                 // Board Games
    { id: 'nature', label: 'Sustainability & Nature', icon: '🌿', weights: { Sustainability: 3 } }, // Green Adobe
    { id: 'volunteering', label: 'Volunteering & Community', icon: '🤝', weights: { Community: 3 } },// Volunteering Club
    { id: 'wellness', label: 'Health & Wellbeing', icon: '❤️', weights: { Wellbeing: 3 } },         // Mental Health
  ];

  const MIN_INTERESTS = 5;

  function getAuth() {
    return window.AdobeClubsAuth || { isAuthenticated: () => false, getActiveUsername: () => null };
  }

  function scopedKey(base) {
    const session = getAuth().getSession?.();
    const username = session?.isAuthenticated ? session.username : null;
    return username ? `${base}:${username}` : null;
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readObjectScoped(base, fallback = {}) {
    const key = scopedKey(base);
    return key ? readJson(key, fallback) : fallback;
  }

  function writeObjectScoped(base, value) {
    const key = scopedKey(base);
    if (key) writeJson(key, value);
  }

  function hasCompletedQuiz() {
    const data = readObjectScoped(INTERESTS_KEY, null);
    if (!data?.completedAt) return false;
    if (Array.isArray(data.selectedInterests) && data.selectedInterests.length >= MIN_INTERESTS) return true;
    return Boolean(data.tagWeights && Object.keys(data.tagWeights).length);
  }

  function hasDismissedInterestQuiz() {
    const data = readObjectScoped(INTERESTS_KEY, null);
    if (!data) return false;
    if (data.skippedAt) return true;
    return hasCompletedQuiz();
  }

  function markInterestQuizSkipped() {
    const existing = readObjectScoped(INTERESTS_KEY, {});
    writeObjectScoped(INTERESTS_KEY, {
      ...existing,
      skippedAt: Date.now(),
      selectedInterests: existing.selectedInterests || [],
      tagWeights: existing.tagWeights || {},
    });
  }

  function clearInterestQuiz() {
    const key = scopedKey(INTERESTS_KEY);
    if (key) localStorage.removeItem(key);
  }

  function getInterestProfile() {
    return readObjectScoped(INTERESTS_KEY, { tagWeights: {}, selectedInterests: [], completedAt: null });
  }

  function buildTagWeightsFromInterests(selectedIds) {
    const tagWeights = {};
    (selectedIds || []).forEach(id => {
      const option = INTEREST_OPTIONS.find(o => o.id === id);
      if (!option?.weights) return;
      Object.entries(option.weights).forEach(([tag, pts]) => {
        tagWeights[tag] = (tagWeights[tag] || 0) + pts;
      });
    });
    return tagWeights;
  }

  function saveSelectedInterests(selectedIds) {
    const unique = [...new Set((selectedIds || []).filter(Boolean))];
    const tagWeights = buildTagWeightsFromInterests(unique);
    writeObjectScoped(INTERESTS_KEY, {
      selectedInterests: unique,
      tagWeights,
      completedAt: Date.now(),
    });
    window.dispatchEvent(new CustomEvent('adobe-interests-updated', {
      detail: { selectedInterests: unique, tagWeights },
    }));
    return tagWeights;
  }

  function getSelectedInterests() {
    const ids = getInterestProfile().selectedInterests || [];
    return ids
      .map(id => INTEREST_OPTIONS.find(o => o.id === id))
      .filter(Boolean)
      .map(o => o.label);
  }

  /** @deprecated — use saveSelectedInterests */
  function saveQuizAnswers() {
    return saveSelectedInterests([]);
  }

  function getClubCompatibility(club) {
    if (!club || !hasCompletedQuiz()) return null;
    const weights = getInterestProfile().tagWeights || {};
    let score = weights[club.tag] || 0;

    Object.entries(TAG_TO_CLUBS).forEach(([tag, ids]) => {
      if (ids.includes(club.id)) score += (weights[tag] || 0) * 0.5;
    });

    const clubTags = (club.tags || []).map(t => String(t).toLowerCase());
    Object.entries(weights).forEach(([tag, weight]) => {
      if (!weight) return;
      const tagKey = tag.toLowerCase();
      if (clubTags.some(ct => ct.includes(tagKey) || tagKey.includes(ct))) {
        score += weight * 0.45;
      }
    });

    const maxPossible = 12;
    const pct = Math.min(100, Math.round((score / maxPossible) * 100));
    if (pct < 25) return { score: pct, label: 'Low match' };
    if (pct < 55) return { score: pct, label: 'Fair match' };
    if (pct < 80) return { score: pct, label: 'Good match' };
    return { score: pct, label: 'Great match' };
  }

  function suggestClubs(allClubs, limit = 3) {
    if (!hasCompletedQuiz()) return [];
    const matched = getInterestMatchedClubs(allClubs);
    return typeof limit === 'number' ? matched.slice(0, limit) : matched;
  }

  function getMatchedInterestTags() {
    const labels = getSelectedInterests();
    if (labels.length) return labels;
    const weights = getInterestProfile().tagWeights || {};
    return Object.entries(weights)
      .filter(([, weight]) => weight > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }

  function isClubInterestMatch(club) {
    if (!club || !hasCompletedQuiz()) return false;
    const compat = getClubCompatibility(club);
    return Boolean(compat && compat.score > 0);
  }

  function getInterestMatchedClubs(allClubs) {
    if (!hasCompletedQuiz()) return [];
    return (allClubs || [])
      .filter(isClubInterestMatch)
      .sort((a, b) => (getClubCompatibility(b)?.score || 0) - (getClubCompatibility(a)?.score || 0));
  }

  function suggestEvents(allEvents, limit = 4) {
    if (!hasCompletedQuiz()) return (allEvents || []).slice(0, limit);
    const weights = getInterestProfile().tagWeights || {};
    return (allEvents || [])
      .map(ev => {
        let score = 0;
        Object.entries(TAG_TO_CLUBS).forEach(([tag, ids]) => {
          if ((weights[tag] || 0) > 0 && ev.club && ev.club.toLowerCase().includes(tag.toLowerCase().slice(0, 4))) {
            score += weights[tag];
          }
        });
        const clubName = (ev.club || '').toLowerCase();
        Object.keys(weights).forEach(tag => {
          if (weights[tag] > 0 && clubName.includes(tag.toLowerCase().slice(0, 4))) score += weights[tag];
        });
        return { ev, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(x => x.ev);
  }

  function getEventNote(eventId) {
    const notes = readObjectScoped(EVENT_NOTES_KEY, {});
    return notes[eventId] || '';
  }

  function setEventNote(eventId, text) {
    const notes = readObjectScoped(EVENT_NOTES_KEY, {});
    if (text.trim()) notes[eventId] = text.trim();
    else delete notes[eventId];
    writeObjectScoped(EVENT_NOTES_KEY, notes);
  }

  function getEventComments(eventId) {
    const all = readJson(EVENT_COMMENTS_KEY, {});
    return Array.isArray(all[eventId]) ? all[eventId] : [];
  }

  function addEventComment(eventId, text) {
    const auth = getAuth();
    const user = auth.getCurrentUser?.();
    if (!user || !text.trim()) return null;
    const all = readJson(EVENT_COMMENTS_KEY, {});
    const list = Array.isArray(all[eventId]) ? all[eventId] : [];
    const comment = {
      id: `c-${Date.now()}`,
      username: user.username,
      displayName: user.displayName || user.username,
      text: text.trim(),
      createdAt: Date.now(),
    };
    all[eventId] = [comment, ...list];
    writeJson(EVENT_COMMENTS_KEY, all);
    return comment;
  }

  function getEventRecap(eventId, eventObj) {
    if (window.AdobeClubsAuth?.isRecapDeleted?.(eventId)) return null;
    if (eventObj?.recap) return eventObj.recap;
    const all = readJson(EVENT_RECAPS_KEY, {});
    return all[eventId] || null;
  }

  function normalizeEventRecap(recap) {
    if (!recap) return { summary: '', highlights: [], attendance: '' };
    if (typeof recap === 'string') {
      return { summary: recap, highlights: [], attendance: '' };
    }
    const highlights = Array.isArray(recap.highlights)
      ? recap.highlights.filter(Boolean)
      : String(recap.highlights || '')
        .split('\n')
        .map(line => line.replace(/^[-•*]\s*/, '').trim())
        .filter(Boolean);
    const attendance = recap.attendance
      || (recap.attendanceCount ? `${recap.attendanceCount} members` : '');
    return {
      summary: recap.summary || recap.body || '',
      highlights,
      attendance,
    };
  }

  function buildRecapHtml(recap, ev, opts = {}) {
    const {
      clubName = ev?.club || '',
      dateLabel = '',
      compact = false,
      showReadLink = false,
      card = false,
    } = opts;
    const data = normalizeEventRecap(recap);

    if (card) {
      const summaryLimit = 100;
      const summaryText = data.summary.length > summaryLimit
        ? `${data.summary.slice(0, summaryLimit).trim()}…`
        : data.summary;
      return `
        <div class="recap-detail recap-detail--card">
          <p class="recap-detail-eyebrow">Event recap${dateLabel ? ` · ${esc(dateLabel)}` : ''}</p>
          <h2 class="recap-detail-title">${esc(ev?.title || 'Event recap')}</h2>
          <p class="recap-detail-summary">${esc(summaryText)}</p>
          <div class="recap-card-footer">
            ${data.attendance ? `<span class="recap-card-attendance">${esc(data.attendance)}</span>` : ''}
            ${showReadLink ? '<span class="recap-read-link">Read recap →</span>' : ''}
          </div>
        </div>
      `;
    }

    const summaryLimit = compact ? 220 : Infinity;
    const summaryText = data.summary.length > summaryLimit
      ? `${data.summary.slice(0, summaryLimit).trim()}…`
      : data.summary;
    const highlightItems = compact ? data.highlights.slice(0, 3) : data.highlights;
    const highlightsHtml = highlightItems.length
      ? `<ul class="recap-highlights">${highlightItems.map(item => `<li>${esc(item)}</li>`).join('')}</ul>`
      : '';
    const attendanceHtml = data.attendance
      ? `<div class="recap-stat"><span class="recap-stat-label">Attended</span><strong class="recap-stat-value">${esc(data.attendance)}</strong></div>`
      : '';

    return `
      <div class="recap-detail${compact ? ' recap-detail--compact' : ''}">
        <div class="recap-detail-head">
          <p class="recap-detail-eyebrow">Event recap${dateLabel ? ` · ${esc(dateLabel)}` : ''}</p>
          ${clubName ? `<span class="recap-detail-club">${esc(clubName)}</span>` : ''}
        </div>
        <h2 class="recap-detail-title">${esc(ev?.title || 'Event recap')}</h2>
        <section class="recap-detail-section">
          <h3>What happened</h3>
          <p class="recap-detail-summary">${esc(summaryText)}</p>
        </section>
        ${highlightItems.length ? `
          <section class="recap-detail-section">
            <h3>Highlights</h3>
            ${highlightsHtml}
          </section>
        ` : ''}
        ${attendanceHtml ? `<div class="recap-detail-stats">${attendanceHtml}</div>` : ''}
        ${showReadLink ? '<span class="recap-read-link">Read recap →</span>' : ''}
      </div>
    `;
  }

  function mergePublishedRecaps(events) {
    const stored = readJson(EVENT_RECAPS_KEY, {});
    const isRecapDeleted = window.AdobeClubsAuth?.isRecapDeleted?.bind(window.AdobeClubsAuth)
      || (() => false);
    return (events || []).map(ev => {
      if (!ev?.id || isRecapDeleted(ev.id)) {
        if (!ev?.id) return ev;
        const next = { ...ev };
        delete next.recap;
        return next;
      }
      if (!stored[ev.id]) return ev;
      const existing = normalizeEventRecap(ev.recap);
      if (String(existing.summary || '').trim()) return ev;
      return { ...ev, recap: stored[ev.id] };
    });
  }

  function setEventRecap(eventId, recap, meta, options = {}) {
    const action = options.action || 'create';
    const auth = getAuth();
    if ((auth.isAnyAdmin?.() || auth.isAdmin?.()) && auth.saveEventRecap) {
      auth.saveEventRecap(eventId, recap, { ...meta, action });
    } else {
      const all = readJson(EVENT_RECAPS_KEY, {});
      all[eventId] = recap;
      writeJson(EVENT_RECAPS_KEY, all);
      auth.updateCustomEvent?.(eventId, { recap });
      auth.notifyPublishedContentChanged?.({ type: 'recap', id: eventId, action, meta });
    }
    if (action === 'create' && meta?.clubId && window.AdobeNotifications?.notifyRecapPosted) {
      window.AdobeNotifications.notifyRecapPosted({
        eventId,
        title: meta.title || recap?.title || 'Event recap',
        clubId: meta.clubId,
      });
    } else if (action === 'update' && meta?.clubId && window.AdobeNotifications?.notifyRecapUpdated) {
      window.AdobeNotifications.notifyRecapUpdated({
        eventId,
        title: meta.title || 'Event recap',
        clubId: meta.clubId,
      });
    }
  }

  function removeEventRecap(eventId, meta = {}) {
    const auth = getAuth();
    if (!auth.isAnyAdmin?.() && !auth.isAdmin?.()) return false;
    if (auth.deleteEventRecap) {
      auth.deleteEventRecap(eventId, { meta });
    } else {
      const all = readJson(EVENT_RECAPS_KEY, {});
      delete all[eventId];
      writeJson(EVENT_RECAPS_KEY, all);
      auth.updateCustomEvent?.(eventId, { recap: null });
      auth.notifyPublishedContentChanged?.({ type: 'recap', id: eventId, action: 'delete', meta });
    }
    if (meta?.clubId && window.AdobeNotifications?.notifyRecapDeleted) {
      window.AdobeNotifications.notifyRecapDeleted({
        eventId,
        title: meta.title || 'Event recap',
        clubId: meta.clubId,
      });
    }
    return true;
  }

  function parseEventDate(ev) {
    if (!ev?.month || !ev?.day || ev.day === '—') return null;
    const months = { JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5, JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11 };
    const m = months[String(ev.month).toUpperCase()];
    if (m == null) return null;
    const year = new Date().getFullYear();
    const d = parseInt(ev.day, 10);
    if (Number.isNaN(d)) return null;
    const dt = new Date(year, m, d);
    const timeMatch = String(ev.time || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const min = parseInt(timeMatch[2], 10);
      const ampm = (timeMatch[3] || '').toUpperCase();
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      dt.setHours(h, min, 0, 0);
    }
    return dt;
  }

  function hasEventTime(ev) {
    return /(\d+):(\d+)\s*(AM|PM)?/i.test(String(ev?.time || ''));
  }

  function isEventPast(ev) {
    const dt = parseEventDate(ev);
    if (!dt) return false;
    const now = Date.now();
    if (hasEventTime(ev)) return now >= dt.getTime();
    const endOfDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 23, 59, 59, 999);
    return now > endOfDay.getTime();
  }

  function isEventUpcoming(ev) {
    if (!ev?.month || !ev?.day || ev.day === '—') return true;
    return !isEventPast(ev);
  }

  function formatDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getTomorrowDateInputValue() {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return formatDateInputValue(tomorrow);
  }

  function parseDateInputValue(dateValue) {
    if (!dateValue) return null;
    const picked = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(picked.getTime())) return null;
    picked.setHours(0, 0, 0, 0);
    return picked;
  }

  function isAdminEventDateAllowed(dateValue) {
    const picked = parseDateInputValue(dateValue);
    if (!picked) return false;
    const min = new Date();
    min.setHours(0, 0, 0, 0);
    min.setDate(min.getDate() + 1);
    return picked.getTime() >= min.getTime();
  }

  let eventTimingSnapshot = '';

  function snapshotEventTiming(events) {
    return (events || []).map(ev => `${ev.id}:${isEventPast(ev) ? 'past' : 'upcoming'}`).join('|');
  }

  function resetEventTimingSnapshot(events) {
    eventTimingSnapshot = snapshotEventTiming(events || []);
  }

  function checkEventTimingTransitions() {
    const getEvents = window.__adobeClubEventsForTiming;
    if (typeof getEvents !== 'function') return;
    const events = getEvents() || [];
    const next = snapshotEventTiming(events);
    if (eventTimingSnapshot && next !== eventTimingSnapshot) {
      window.dispatchEvent(new CustomEvent('adobe-event-timing-changed'));
    }
    eventTimingSnapshot = next;
  }

  function startEventTimingWatch() {
    if (startEventTimingWatch.started) return;
    startEventTimingWatch.started = true;
    checkEventTimingTransitions();
    setInterval(checkEventTimingTransitions, 30000);
  }

  function getEventReminders() {
    return readObjectScoped(EVENT_REMINDERS_KEY, {});
  }

  function isReminderSet(eventId) {
    return Boolean(getEventReminders()[eventId]);
  }

  function toggleEventReminder(eventId, ev) {
    const reminders = getEventReminders();
    if (reminders[eventId]) {
      delete reminders[eventId];
      writeObjectScoped(EVENT_REMINDERS_KEY, reminders);
      return false;
    }
    const eventDate = parseEventDate(ev);
    if (!eventDate) return false;
    const remindAt = eventDate.getTime() - 24 * 60 * 60 * 1000;
    reminders[eventId] = {
      remindAt,
      eventTitle: ev.title,
      notified: false,
      setAt: Date.now(),
    };
    writeObjectScoped(EVENT_REMINDERS_KEY, reminders);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    return true;
  }

  function checkDueReminders() {
    if (!getAuth().isAuthenticated?.()) return;
    const reminders = getEventReminders();
    const now = Date.now();
    let changed = false;
    Object.entries(reminders).forEach(([eventId, r]) => {
      if (r.notified || now < r.remindAt) return;
      r.notified = true;
      changed = true;
      const title = r.eventTitle || 'Upcoming Adobe Clubs event';
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Event reminder', { body: `${title} is coming up soon.`, tag: `ev-reminder-${eventId}` });
      }
    });
    if (changed) writeObjectScoped(EVENT_REMINDERS_KEY, reminders);
  }

  function getRsvpCalendarDays(rsvpedEvents) {
    return (rsvpedEvents || []).map(ev => {
      const dt = parseEventDate(ev);
      if (!dt) return null;
      return {
        id: ev.id,
        title: ev.title,
        day: ev.day,
        month: ev.month,
        date: dt,
        dateKey: `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`,
      };
    }).filter(Boolean);
  }

  function buildMiniCalendarHtml(rsvpDays, classPrefix = 'uf-cal') {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rsvpByDay = new Map();
    (rsvpDays || []).forEach(d => {
      if (!rsvpByDay.has(d.dateKey)) rsvpByDay.set(d.dateKey, []);
      rsvpByDay.get(d.dateKey).push(d.title);
    });
    const todayKey = `${year}-${month}-${now.getDate()}`;

    const heads = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
      .map(h => `<span class="${classPrefix}-head">${h}</span>`)
      .join('');

    let cells = '';
    for (let i = 0; i < firstDow; i += 1) {
      cells += `<span class="${classPrefix}-day ${classPrefix}-day--muted"></span>`;
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      const key = `${year}-${month}-${d}`;
      const titles = rsvpByDay.get(key);
      const hasRsvp = Boolean(titles?.length);
      const cls = [
        `${classPrefix}-day`,
        hasRsvp ? `${classPrefix}-day--rsvp` : '',
        key === todayKey ? `${classPrefix}-day--today` : '',
      ].filter(Boolean).join(' ');
      const titleAttr = hasRsvp ? ` title="${esc(titles.join(', '))}"` : '';
      cells += `<span class="${cls}"${titleAttr}>${d}</span>`;
    }

    return `
      <div class="${classPrefix}-month">${esc(monthLabel)}</div>
      <div class="${classPrefix}-grid">${heads}${cells}</div>
    `;
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function compatBadgeHtml(club, className = 'uf-compat') {
    const compat = getClubCompatibility(club);
    if (!compat) return '';
    return `
      <span class="${className}" title="${esc(compat.label)} — ${compat.score}% match with your interests">
        <span class="uf-compat-ring" style="--uf-score: ${compat.score}"></span>
        ${compat.score}% match
      </span>
    `;
  }

  window.AdobeUserFeatures = {
    INTEREST_OPTIONS,
    MIN_INTERESTS,
    hasCompletedQuiz,
    hasDismissedInterestQuiz,
    markInterestQuizSkipped,
    clearInterestQuiz,
    getInterestProfile,
    saveSelectedInterests,
    getSelectedInterests,
    saveQuizAnswers,
    getClubCompatibility,
    suggestClubs,
    suggestEvents,
    getMatchedInterestTags,
    isClubInterestMatch,
    getInterestMatchedClubs,
    getEventNote,
    setEventNote,
    getEventComments,
    addEventComment,
    mergePublishedRecaps,
    getEventRecap,
    setEventRecap,
    removeEventRecap,
    normalizeEventRecap,
    buildRecapHtml,
    parseEventDate,
    hasEventTime,
    isEventPast,
    isEventUpcoming,
    formatDateInputValue,
    getTomorrowDateInputValue,
    parseDateInputValue,
    isAdminEventDateAllowed,
    resetEventTimingSnapshot,
    startEventTimingWatch,
    getEventReminders,
    isReminderSet,
    toggleEventReminder,
    checkDueReminders,
    getRsvpCalendarDays,
    buildMiniCalendarHtml,
    compatBadgeHtml,
    esc,
  };

  function bootUserFeatureTimers() {
    checkDueReminders();
    setInterval(checkDueReminders, 60000);
    startEventTimingWatch();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootUserFeatureTimers);
  } else {
    bootUserFeatureTimers();
  }
})();

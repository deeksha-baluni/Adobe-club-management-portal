/**
 * notifications.js — In-app notifications for joined clubs
 */
'use strict';

(function () {
  const FEED_KEY = 'adobeClubsNotificationFeed';
  const READ_KEY = 'adobeClubsNotificationsRead';
  const DISMISSED_KEY = 'adobeClubsNotificationsDismissed';
  const PERSONAL_KEY = 'adobeClubsPersonalNotifications';
  const ADMIN_KEY = 'adobeClubsAdminNotifications';
  const RSVP_DEDUPE_KEY = 'adobeClubsRsvpReminderSent';
  const RECAP_DEDUPE_KEY = 'adobeClubsRecapReminderSent';
  const CUSTOM_EVENTS_KEY = 'adobeClubsCustomEvents';
  const CUSTOM_ARTICLES_KEY = 'adobeClubsCustomArticles';
  const DELETED_EVENTS_KEY = 'adobeClubsDeletedEvents';
  const DELETED_ARTICLES_KEY = 'adobeClubsDeletedArticles';
  const DELETED_RECAPS_KEY = 'adobeClubsDeletedRecaps';
  const ACTIVITY_LOG_KEY = 'adobeClubsActivityLog';

  function codeBase() {
    return window.hlx?.codeBasePath || '';
  }

  function dataJsonUrl() {
    return `${codeBase()}/data/data.json`;
  }

  function eventHref(eventId) {
    return `/events?id=${encodeURIComponent(eventId)}`;
  }

  function clubHref(clubId, hash = '') {
    return `/club?id=${encodeURIComponent(clubId)}${hash}`;
  }

  function resourcesHref(articleId) {
    return articleId ? `/resources?article=${encodeURIComponent(articleId)}` : '/resources';
  }

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
      isAdmin: () => false,
      isAnyAdmin: () => false,
      isClubAdmin: () => false,
      getManagedClubIds: () => [],
      getJoinedClubs: () => [],
      getRsvpedEvents: () => [],
    };
  }

  function isAdminUser() {
    const auth = getAuth();
    return Boolean(auth.isAnyAdmin?.() || auth.isAdmin?.());
  }

  function eventOwner(event) {
    return event?.createdBy || 'admin';
  }

  /**
   * Whether the active admin's alert scope covers this event.
   * Overall admins are alerted for events they own (seeded events default to
   * 'admin'); club admins are alerted for any event in a club they manage.
   */
  function adminScopeIncludesEvent(ev, clubs) {
    const auth = getAuth();
    if (auth.isClubAdmin?.() && !auth.isAdmin?.()) {
      const club = resolveClubFromEvent(ev, clubs);
      const clubId = club?.id || ev?.clubId;
      return Boolean(clubId && (auth.getManagedClubIds?.() || []).includes(clubId));
    }
    return eventOwner(ev) === getLoggedInUsername();
  }

  function getLoggedInUsername() {
    const auth = getAuth();
    return auth.getSession?.()?.username
      || auth.getCurrentUser?.()?.username
      || auth.getActiveUsername?.()
      || null;
  }

  function adminInboxKey(username) {
    return username ? `${ADMIN_KEY}:${username}` : null;
  }

  function scopedKey(base) {
    const username = getLoggedInUsername();
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

  function readFeed() {
    const feed = readJson(FEED_KEY, []);
    return Array.isArray(feed) ? feed : [];
  }

  function writeFeed(feed) {
    writeJson(FEED_KEY, feed);
  }

  function readReadSet() {
    const key = scopedKey(READ_KEY);
    if (!key) return new Set();
    const list = readJson(key, []);
    return new Set(Array.isArray(list) ? list : []);
  }

  function writeReadSet(set) {
    const key = scopedKey(READ_KEY);
    if (key) writeJson(key, [...set]);
  }

  function readDismissedSet() {
    const key = scopedKey(DISMISSED_KEY);
    if (!key) return new Set();
    const list = readJson(key, []);
    return new Set(Array.isArray(list) ? list : []);
  }

  function writeDismissedSet(set) {
    const key = scopedKey(DISMISSED_KEY);
    if (key) writeJson(key, [...set]);
  }

  function removeFromUserInboxes(id) {
    if (!id) return;
    const username = getLoggedInUsername();
    if (isAdminUser() && username) {
      writeAdminInbox(readAdminInbox(username).filter(n => n.id !== id), username);
    }
    writePersonalInbox(readPersonalInbox().filter(n => n.id !== id));
  }

  function readPersonalInbox() {
    const key = scopedKey(PERSONAL_KEY);
    if (!key) return [];
    const list = readJson(key, []);
    return Array.isArray(list) ? list : [];
  }

  function writePersonalInbox(list) {
    const key = scopedKey(PERSONAL_KEY);
    if (key) writeJson(key, list);
  }

  function readAdminInbox(username) {
    const key = adminInboxKey(username || getLoggedInUsername());
    if (!key) return [];
    const list = readJson(key, []);
    return Array.isArray(list) ? list : [];
  }

  function writeAdminInbox(list, username) {
    const key = adminInboxKey(username || getLoggedInUsername());
    if (key) writeJson(key, list);
  }

  function readRecapDedupe(username) {
    const key = username ? `${RECAP_DEDUPE_KEY}:${username}` : null;
    if (!key) return {};
    return readJson(key, {});
  }

  function writeRecapDedupe(map, username) {
    const key = username ? `${RECAP_DEDUPE_KEY}:${username}` : null;
    if (key) writeJson(key, map);
  }

  function readRsvpDedupe() {
    const key = scopedKey(RSVP_DEDUPE_KEY);
    if (!key) return {};
    return readJson(key, {});
  }

  function writeRsvpDedupe(map) {
    const key = scopedKey(RSVP_DEDUPE_KEY);
    if (key) writeJson(key, map);
  }

  function parseEventDate(ev) {
    return window.AdobeUserFeatures?.parseEventDate?.(ev) || null;
  }

  function formatEventDateLabel(ev) {
    if (!ev?.month || !ev?.day) return 'Date TBD';
    return `${ev.month} ${ev.day}`;
  }

  function resolveClubFromEvent(event, clubs) {
    if (event?.clubId) {
      return (clubs || []).find(c => c.id === event.clubId) || { id: event.clubId, name: event.club || 'Club' };
    }
    const eventClub = String(event?.club || '').toLowerCase().trim();
    return (clubs || []).find(c => {
      const name = String(c.name || '').toLowerCase();
      return eventClub === name
        || eventClub === `${name} club`
        || eventClub.includes(name)
        || name.includes(eventClub);
    }) || null;
  }

  function getJoinedClubSet() {
    return new Set(getAuth().getJoinedClubs?.() || []);
  }

  const NOTIFICATION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
  // RSVP reminders are only relevant for ~48 h around the event
  const RSVP_REMINDER_MAX_AGE_MS = 2 * 24 * 60 * 60 * 1000;

  function isNotificationFresh(n) {
    if (!n.createdAt) return true;
    const age = Date.now() - n.createdAt;
    if (n.type === 'rsvp_reminder') return age < RSVP_REMINDER_MAX_AGE_MS;
    return age < NOTIFICATION_MAX_AGE_MS;
  }

  function getAllNotifications() {
    if (!getAuth().isAuthenticated?.()) return [];

    const read = readReadSet();
    const dismissed = readDismissedSet();

    if (isAdminUser()) {
      return readAdminInbox(getLoggedInUsername())
        .filter(n => !dismissed.has(n.id) && isNotificationFresh(n))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .map(n => ({ ...n, read: read.has(n.id) }));
    }

    const joined = getJoinedClubSet();
    // Auto-prune the global feed: drop stale entries and entries for clubs no longer joined
    const global = readFeed().filter(n =>
      n.clubId && joined.has(n.clubId) && !dismissed.has(n.id) && isNotificationFresh(n)
    );
    const personal = readPersonalInbox().filter(n =>
      !dismissed.has(n.id) && isNotificationFresh(n)
    );

    return [...global, ...personal]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .map(n => ({ ...n, read: read.has(n.id) }));
  }

  function getUnreadCount() {
    return getAllNotifications().filter(n => !n.read).length;
  }

  function markAsRead(id) {
    const read = readReadSet();
    read.add(id);
    writeReadSet(read);
    refreshNavUI();
  }

  function markAllAsRead() {
    const read = readReadSet();
    getAllNotifications().forEach(n => read.add(n.id));
    writeReadSet(read);
    refreshNavUI();
  }

  function dismissNotification(id) {
    if (!id || !getAuth().isAuthenticated?.()) return;
    const dismissed = readDismissedSet();
    dismissed.add(id);
    writeDismissedSet(dismissed);
    removeFromUserInboxes(id);
    const read = readReadSet();
    read.delete(id);
    writeReadSet(read);
    refreshNavUI();
    window.dispatchEvent(new CustomEvent('adobe-notifications-updated'));
  }

  function clearAllNotifications() {
    if (!getAuth().isAuthenticated?.()) return;
    const notifications = getAllNotifications();
    const dismissed = readDismissedSet();
    notifications.forEach(n => dismissed.add(n.id));
    writeDismissedSet(dismissed);
    if (isAdminUser()) {
      writeAdminInbox([], getLoggedInUsername());
    }
    writePersonalInbox([]);
    writeReadSet(new Set());

    // Also physically remove the current user's club-feed entries from the
    // global feed so they don't re-surface on future logins once dismissed.
    const joined = getJoinedClubSet();
    if (joined.size) {
      const prunedFeed = readFeed().filter(n => !n.clubId || !joined.has(n.clubId));
      writeFeed(prunedFeed);
    }

    refreshNavUI();
    window.dispatchEvent(new CustomEvent('adobe-notifications-updated'));
  }

  function pushFeedNotification(entry) {
    const feed = readFeed();
    if (feed.some(n => n.id === entry.id)) return;
    feed.unshift(entry);
    writeFeed(feed.slice(0, 100));
    window.dispatchEvent(new CustomEvent('adobe-notifications-updated'));
  }

  /** Club feed alerts are filtered per user in getAllNotifications() by joined club IDs. */
  function pushClubFeedNotification(entry) {
    if (!entry?.clubId) return;
    pushFeedNotification(entry);
  }

  function pushPersonalNotification(entry) {
    const inbox = readPersonalInbox();
    if (inbox.some(n => n.id === entry.id)) return;
    inbox.unshift(entry);
    writePersonalInbox(inbox.slice(0, 50));
    window.dispatchEvent(new CustomEvent('adobe-notifications-updated'));
  }

  function pushAdminNotification(entry, ownerUsername) {
    const owner = ownerUsername || 'admin';
    const inbox = readAdminInbox(owner);
    if (inbox.some(n => n.id === entry.id)) return;
    inbox.unshift(entry);
    writeAdminInbox(inbox.slice(0, 50), owner);
    window.dispatchEvent(new CustomEvent('adobe-notifications-updated'));
  }

  /* ── Admin-action routing ──────────────────────────────────────────
     Overall admins act as supervisors: they only receive an audit trail
     of club-admin administrative actions. Club admins receive operational
     alerts (capacity, recaps, resources) and admin events for their clubs.
  */
  const AUDIT_VERBS = {
    event_created: 'created an event',
    event_updated: 'updated an event',
    event_deleted: 'deleted an event',
    resource_created: 'created a resource',
    resource_updated: 'updated a resource',
    resource_deleted: 'deleted a resource',
    recap_created: 'posted a recap',
    recap_updated: 'updated a recap',
    recap_deleted: 'deleted a recap',
  };
  const CLUB_ACTION_LABELS = {
    event_created: 'New event',
    event_updated: 'Event updated',
    event_deleted: 'Event removed',
    resource_created: 'New resource',
    resource_updated: 'Resource updated',
    resource_deleted: 'Resource removed',
    recap_created: 'Recap posted',
    recap_updated: 'Recap updated',
    recap_deleted: 'Recap removed',
  };

  function actorInfo() {
    const auth = getAuth();
    const user = auth.getCurrentUser?.() || {};
    return {
      username: user.username || getLoggedInUsername(),
      name: user.displayName || user.username || 'A club admin',
      isClubAdmin: Boolean(auth.isClubAdmin?.() && !auth.isAdmin?.()),
      isOverallAdmin: Boolean(auth.isAdmin?.()),
    };
  }

  function isClubAdminActor() {
    const auth = getAuth();
    return Boolean(auth.isClubAdmin?.() && !auth.isAdmin?.());
  }

  function overallAdminUsernames() {
    return getAuth().getOverallAdminUsernames?.() || ['admin'];
  }

  function clubAdminUsernamesFor(clubId) {
    return getAuth().getClubAdminUsernames?.(clubId) || [];
  }

  /* ── Activity log (dashboard "Recent activity" / audit trail) ─────────
     Records club-admin posts only (events, resources, recaps). Member
     RSVPs and joins are not logged here.
  */
  const ACTIVITY_META = {
    event_created: { badge: 'New event', type: 'update' },
    event_updated: { badge: 'Event updated', type: 'update' },
    event_deleted: { badge: 'Event removed', type: 'action' },
    resource_created: { badge: 'New resource', type: 'update' },
    resource_updated: { badge: 'Resource updated', type: 'update' },
    resource_deleted: { badge: 'Resource removed', type: 'action' },
    recap_created: { badge: 'Recap posted', type: 'update' },
    recap_updated: { badge: 'Recap updated', type: 'update' },
    recap_deleted: { badge: 'Recap removed', type: 'action' },
  };

  function readActivityLog() {
    try {
      const v = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (err) {
      return [];
    }
  }

  function writeActivityLog(list) {
    try {
      localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(list.slice(0, 60)));
    } catch (err) { /* ignore quota errors */ }
  }

  function logActivity(entry) {
    if (!entry || !entry.type) return;
    const meta = ACTIVITY_META[entry.type] || { badge: 'Update', type: 'update' };
    const log = readActivityLog();
    if (entry.id && log.some(e => e.id === entry.id)) return;
    log.unshift({
      id: entry.id || `act-${entry.type}-${Date.now()}`,
      type: entry.type,
      badge: meta.badge,
      badgeType: meta.type,
      clubId: entry.clubId || null,
      title: entry.title || 'Item',
      clubName: entry.clubName || '',
      href: entry.href || '#',
      createdAt: entry.createdAt || Date.now(),
    });
    writeActivityLog(log);
    window.dispatchEvent(new CustomEvent('adobe-activity-logged'));
  }

  function getActivityLog() { return readActivityLog(); }

  function notifyClubRequest(request, mailtoHref) {
    if (!request?.id) return;
    const message = `New club request: ${request.clubName} (${request.category}) from ${request.submittedBy}`;
    overallAdminUsernames().forEach(uname => {
      pushAdminNotification({
        id: `club-request-${request.id}`,
        type: 'club_request',
        message,
        href: mailtoHref || '#',
        createdAt: Date.now(),
        requestId: request.id,
        review: true,
      }, uname);
    });
    refreshNavUI();
  }

  function logClubRequestActivity(request) {
    if (!request?.id) return;
    logActivity({
      id: `act-club-request-${request.id}`,
      type: 'club_request',
      clubId: null,
      title: request.clubName,
      clubName: request.category,
      href: '#',
    });
  }

  /**
   * Called after the admin clicks Approve. Fires a bell notification for
   * the requester's account (visible next time they log in).
   * The mailto back to the user is already handled by club-request.js.
   */
  function notifyClubApproved(request) {
    if (!request?.id) return;
    const message = `Your proposal for "${request.clubName}" has been approved! Check your email for next steps.`;
    const username = request.leadUsername || null;
    const notifEntry = {
      id: `club-approved-${request.id}`,
      type: 'club_approved',
      message,
      href: '#',
      createdAt: Date.now(),
      read: false,
    };
    if (username) {
      // Write to personal inbox — works for regular members
      const personalKey = `${PERSONAL_KEY}:${username}`;
      const pFeed = readJson(personalKey, []);
      if (!pFeed.some(n => n.id === notifEntry.id)) {
        pFeed.unshift(notifEntry);
        writeJson(personalKey, pFeed.slice(0, 50));
      }
      // Also write to admin inbox in case the requester is a club admin
      // (getAllNotifications for admins only reads the admin inbox)
      const adminKey = adminInboxKey(username);
      if (adminKey) {
        const aFeed = readJson(adminKey, []);
        if (!aFeed.some(n => n.id === notifEntry.id)) {
          aFeed.unshift(notifEntry);
          writeJson(adminKey, aFeed.slice(0, 50));
        }
      }
    }
    // Log to audit trail
    logActivity({
      id: `act-club-approved-${request.id}`,
      type: 'admin_club_approved',
      clubId: null,
      title: request.clubName,
      clubName: `Approved — ${request.submittedBy}`,
      href: '#',
    });
    refreshNavUI();
  }

  /**
   * Called after the admin clicks Decline. Bell notification only — no email.
   */
  function notifyClubDeclined(request) {
    if (!request?.id) return;
    const message = `Your proposal for "${request.clubName}" was not approved at this time.`;
    const username = request.leadUsername || null;
    const notifEntry = {
      id: `club-declined-${request.id}`,
      type: 'club_declined',
      message,
      href: '#',
      createdAt: Date.now(),
      read: false,
    };
    if (username) {
      const personalKey = `${PERSONAL_KEY}:${username}`;
      const pFeed = readJson(personalKey, []);
      if (!pFeed.some(n => n.id === notifEntry.id)) {
        pFeed.unshift(notifEntry);
        writeJson(personalKey, pFeed.slice(0, 50));
      }
      const adminKey = adminInboxKey(username);
      if (adminKey) {
        const aFeed = readJson(adminKey, []);
        if (!aFeed.some(n => n.id === notifEntry.id)) {
          aFeed.unshift(notifEntry);
          writeJson(adminKey, aFeed.slice(0, 50));
        }
      }
    }
    logActivity({
      id: `act-club-declined-${request.id}`,
      type: 'admin_club_declined',
      clubId: null,
      title: request.clubName,
      clubName: `Declined — ${request.submittedBy}`,
      href: '#',
    });
    refreshNavUI();
  }

  /**
   * Route an administrative action to the appropriate inboxes.
   *  - Overall admins receive an audit entry, but ONLY when the actor is a club admin.
   *  - The club's own club-admins receive a club-scoped entry (the actor is skipped).
   * Also records the action to the live activity log (dashboard feed).
   */
  function reportAdminAction({ action, clubId, clubName, title, eventId, articleId, href }) {
    if (ACTIVITY_META[action]) {
      logActivity({
        id: `act-${action}-${eventId || articleId || clubId || 'x'}-${Date.now()}`,
        type: action,
        clubId,
        title: title || 'Item',
        clubName: clubName || '',
        href: href || '#',
      });
    }

    const actor = actorInfo();
    if (!actor.isClubAdmin && !actor.isOverallAdmin) return;
    const subject = title || 'item';
    const suffix = clubName ? ` · ${clubName}` : '';
    const ref = eventId || articleId || clubId || 'x';
    const ts = Date.now();

    if (actor.isClubAdmin) {
      const verb = AUDIT_VERBS[action] || 'updated an item';
      overallAdminUsernames().forEach(uname => {
        pushAdminNotification({
          id: `audit-${action}-${ref}-${ts}`,
          type: `admin_${action}`,
          clubId, eventId, articleId,
          message: `${actor.name} ${verb}: ${subject}${suffix}`,
          href: href || '#',
          createdAt: ts,
          audit: true,
        }, uname);
      });
    }

    const clubLabel = CLUB_ACTION_LABELS[action] || 'Update';
    clubAdminUsernamesFor(clubId).forEach(uname => {
      if (uname === actor.username) return;
      pushAdminNotification({
        id: `clubadm-${action}-${ref}-${ts}-${uname}`,
        type: `admin_${action}`,
        clubId, eventId, articleId,
        message: `${clubLabel}: ${subject}${suffix}`,
        href: href || '#',
        createdAt: ts,
      }, uname);
    });

    refreshNavUI();
  }

  function notifyEventSeatsFull(event, club) {
    if (!event?.id) return;
    const clubId = club?.id || event.clubId;
    // Capacity alerts go to the club's club-admins only (not the overall admin).
    const recipients = clubAdminUsernamesFor(clubId);
    const entry = {
      id: `seats-full-${event.id}`,
      type: 'seats_full',
      clubId,
      eventId: event.id,
      message: `Seats full: ${event.title}${club?.name ? ` · ${club.name}` : ''}`,
      href: eventHref(event.id),
      createdAt: Date.now(),
    };
    if (recipients.length) {
      recipients.forEach(uname => pushAdminNotification({ ...entry }, uname));
    } else if (isClubAdminActor()) {
      pushAdminNotification(entry, getLoggedInUsername());
    }
    refreshNavUI();
  }

  function hasRecapBody(recap) {
    if (!recap) return false;
    if (typeof recap === 'string') return recap.trim().length > 0;
    return Boolean(
      String(recap.summary || recap.body || recap.text || '').trim()
      || (Array.isArray(recap.highlights) && recap.highlights.some(Boolean))
    );
  }

  function getMergedEventRecap(ev) {
    if (!ev?.id) return null;
    const auth = getAuth();
    return auth.getEventRecap?.(ev.id, ev)
      || window.AdobeUserFeatures?.getEventRecap?.(ev.id, ev)
      || ev.recap
      || null;
  }

  function eventNeedsRecap(ev, clubs) {
    if (!ev?.id || !adminScopeIncludesEvent(ev, clubs)) return false;
    if (!isPastEvent(ev)) return false;
    return !hasRecapBody(getMergedEventRecap(ev));
  }

  function checkAdminRecapReminders(allEvents, clubs) {
    const username = getLoggedInUsername();
    // Recap reminders are a club-admin concern only; overall admins get an audit trail instead.
    if (!username || !isClubAdminActor()) return;

    const eventsById = new Map();
    (allEvents || []).forEach((ev) => {
      if (ev?.id) eventsById.set(ev.id, ev);
    });

    const neededIds = new Set();
    (allEvents || []).forEach((ev) => {
      if (eventNeedsRecap(ev, clubs)) neededIds.add(ev.id);
    });

    const inbox = readAdminInbox(username);
    let changed = false;
    const kept = inbox.filter((n) => {
      if (n.type !== 'recap_needed' || !n.eventId) return true;
      const stillNeeded = neededIds.has(n.eventId);
      if (!stillNeeded) changed = true;
      return stillNeeded;
    });

    const existingRecapIds = new Set(
      kept.filter((n) => n.type === 'recap_needed' && n.eventId).map((n) => n.eventId),
    );
    const next = [...kept];

    neededIds.forEach((evId) => {
      if (existingRecapIds.has(evId)) return;
      const ev = eventsById.get(evId);
      if (!ev) return;
      const club = resolveClubFromEvent(ev, clubs);
      next.unshift({
        id: `recap-needed-${evId}`,
        type: 'recap_needed',
        clubId: club?.id || ev.clubId,
        eventId: evId,
        message: `Post a recap: ${ev.title}${club?.name ? ` · ${club.name}` : ''}`,
        href: club?.id
          ? `${clubHref(club.id, '#club-recaps')}`
          : '/events',
        createdAt: Date.now(),
      });
      changed = true;
    });

    const dedupe = readRecapDedupe(username);
    const nextDedupe = { ...dedupe };
    Object.keys(nextDedupe).forEach((id) => {
      if (!neededIds.has(id)) {
        delete nextDedupe[id];
        changed = true;
      }
    });
    neededIds.forEach((id) => {
      nextDedupe[id] = true;
    });

    if (changed) {
      writeAdminInbox(next.slice(0, 50), username);
      writeRecapDedupe(nextDedupe, username);
      refreshNavUI();
      window.dispatchEvent(new CustomEvent('adobe-notifications-updated'));
    }
  }

  function isPastEvent(ev) {
    if (window.AdobeUserFeatures?.isEventPast) {
      return window.AdobeUserFeatures.isEventPast(ev);
    }
    const dt = parseEventDate(ev);
    if (!dt) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDay = new Date(dt);
    eventDay.setHours(0, 0, 0, 0);
    return eventDay.getTime() < today.getTime();
  }

  function checkAdminSeatsFullAlerts(allEvents, clubs) {
    // Capacity alerts are a club-admin concern only.
    if (!isClubAdminActor()) return;

    (allEvents || []).forEach(ev => {
      if (!ev?.id || !adminScopeIncludesEvent(ev, clubs)) return;
      if (!window.AdobeEventSeats?.isFull?.(ev)) return;
      notifyEventSeatsFull(ev, resolveClubFromEvent(ev, clubs));
    });
  }

  function notifyNewEvent(event, club) {
    if (!event?.id || !club?.id) return;
    pushClubFeedNotification({
      id: `new-event-${event.id}`,
      type: 'new_event',
      clubId: club.id,
      eventId: event.id,
      message: `New event in ${club.name}: ${event.title} — ${formatEventDateLabel(event)}`,
      href: eventHref(event.id),
      createdAt: Date.now(),
    });
    reportAdminAction({
      action: 'event_created', clubId: club.id, clubName: club.name,
      title: event.title, eventId: event.id, href: eventHref(event.id),
    });
    refreshNavUI();
  }

  function notifyRecapPosted({ eventId, title, clubId }) {
    if (!eventId || !clubId) return;
    const recapTitle = title || 'Event recap';
    pushClubFeedNotification({
      id: `recap-${eventId}-${Date.now()}`,
      type: 'recap',
      clubId,
      eventId,
      message: `Recap posted: ${recapTitle}`,
      href: clubHref(clubId, '#club-recaps'),
      createdAt: Date.now(),
    });
    reportAdminAction({
      action: 'recap_created', clubId, title: recapTitle, eventId,
      href: clubHref(clubId, '#club-recaps'),
    });
    refreshNavUI();
  }

  function notifyEventUpdated(event, club) {
    const clubId = club?.id || event?.clubId;
    if (!event?.id || !clubId) return;
    pushClubFeedNotification({
      id: `event-updated-${event.id}-${Date.now()}`,
      type: 'event_updated',
      clubId,
      eventId: event.id,
      message: `Event updated: ${event.title}${club?.name ? ` · ${club.name}` : ''}`,
      href: eventHref(event.id),
      createdAt: Date.now(),
    });
    reportAdminAction({
      action: 'event_updated', clubId, clubName: club?.name,
      title: event.title, eventId: event.id, href: eventHref(event.id),
    });
    refreshNavUI();
  }

  function notifyEventDeleted({ eventId, title, clubId, clubName }) {
    if (!eventId || !clubId) return;
    pushClubFeedNotification({
      id: `event-deleted-${eventId}-${Date.now()}`,
      type: 'event_deleted',
      clubId,
      eventId,
      message: `Event removed: ${title || 'Event'}${clubName ? ` · ${clubName}` : ''}`,
      href: eventHref(eventId),
      createdAt: Date.now(),
    });
    reportAdminAction({
      action: 'event_deleted', clubId, clubName,
      title: title || 'Event', eventId, href: '/events',
    });
    refreshNavUI();
  }

  function notifyRecapUpdated({ eventId, title, clubId }) {
    if (!eventId || !clubId) return;
    pushClubFeedNotification({
      id: `recap-updated-${eventId}-${Date.now()}`,
      type: 'recap_updated',
      clubId,
      eventId,
      message: `Recap updated: ${title || 'Event recap'}`,
      href: clubHref(clubId, '#club-recaps'),
      createdAt: Date.now(),
    });
    reportAdminAction({
      action: 'recap_updated', clubId, title: title || 'Event recap', eventId,
      href: clubHref(clubId, '#club-recaps'),
    });
    refreshNavUI();
  }

  function notifyRecapDeleted({ eventId, title, clubId }) {
    if (!eventId || !clubId) return;
    pushClubFeedNotification({
      id: `recap-deleted-${eventId}-${Date.now()}`,
      type: 'recap_deleted',
      clubId,
      eventId,
      message: `Recap removed: ${title || 'Event recap'}`,
      href: clubHref(clubId, '#club-recaps'),
      createdAt: Date.now(),
    });
    reportAdminAction({
      action: 'recap_deleted', clubId, title: title || 'Event recap', eventId,
      href: clubHref(clubId, '#club-recaps'),
    });
    refreshNavUI();
  }

  function notifyArticleCreated(article, club) {
    const clubId = club?.id || article?.clubId;
    if (!article?.id) return;
    if (clubId) {
      pushClubFeedNotification({
        id: `article-created-${article.id}-${Date.now()}`,
        type: 'article_updated',
        clubId,
        articleId: article.id,
        message: `New resource: ${article.title}${club?.name || article.clubName ? ` · ${club?.name || article.clubName}` : ''}`,
        href: resourcesHref(article.id),
        createdAt: Date.now(),
      });
    }
    reportAdminAction({
      action: 'resource_created', clubId, clubName: club?.name || article.clubName,
      title: article.title, articleId: article.id,
      href: resourcesHref(article.id),
    });
    refreshNavUI();
  }

  function notifyArticleUpdated(article, club) {
    const clubId = club?.id || article?.clubId;
    if (!article?.id || !clubId) return;
    pushClubFeedNotification({
      id: `article-updated-${article.id}-${Date.now()}`,
      type: 'article_updated',
      clubId,
      articleId: article.id,
      message: `Resource updated: ${article.title}${club?.name || article.clubName ? ` · ${club?.name || article.clubName}` : ''}`,
      href: resourcesHref(article.id),
      createdAt: Date.now(),
    });
    reportAdminAction({
      action: 'resource_updated', clubId, clubName: club?.name || article.clubName,
      title: article.title, articleId: article.id,
      href: resourcesHref(article.id),
    });
    refreshNavUI();
  }

  function notifyArticleDeleted({ articleId, title, clubId, clubName }) {
    if (!articleId || !clubId) return;
    pushClubFeedNotification({
      id: `article-deleted-${articleId}-${Date.now()}`,
      type: 'article_deleted',
      clubId,
      articleId,
      message: `Resource removed: ${title || 'Article'}${clubName ? ` · ${clubName}` : ''}`,
      href: resourcesHref(articleId),
      createdAt: Date.now(),
    });
    reportAdminAction({
      action: 'resource_deleted', clubId, clubName,
      title: title || 'Resource', articleId, href: '/resources',
    });
    refreshNavUI();
  }

  function isTomorrow(date) {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === tomorrow.getTime();
  }

  function checkRsvpTomorrowReminders(allEvents) {
    if (!getAuth().isAuthenticated?.()) return;

    const rsvpIds = getAuth().getRsvpedEvents?.() || [];
    if (!rsvpIds.length) return;

    const dedupe = readRsvpDedupe();
    let changed = false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${tomorrow.getMonth()}-${tomorrow.getDate()}`;

    rsvpIds.forEach(eventId => {
      const ev = (allEvents || []).find(e => e.id === eventId);
      if (!ev) return;
      const dt = parseEventDate(ev);
      if (!isTomorrow(dt)) return;

      const dedupeKey = `${eventId}-${tomorrowKey}`;
      if (dedupe[dedupeKey]) return;

      pushPersonalNotification({
        id: `rsvp-reminder-${dedupeKey}`,
        type: 'rsvp_reminder',
        eventId,
        message: `Reminder: ${ev.title} is tomorrow`,
        href: eventHref(eventId),
        createdAt: Date.now(),
      });

      dedupe[dedupeKey] = true;
      changed = true;
    });

    if (changed) writeRsvpDedupe(dedupe);
    refreshNavUI();
  }

  function readAllCustomEvents() {
    try {
      const value = JSON.parse(localStorage.getItem(CUSTOM_EVENTS_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (err) {
      return [];
    }
  }

  async function loadAllArticles() {
    let base = [];
    try {
      const res = await fetch(dataJsonUrl());
      if (res.ok) {
        const data = await res.json();
        base = data.articles || [];
      }
    } catch (err) {
      base = [];
    }
    const auth = getAuth();
    if (auth.mergePublishedArticles) {
      return auth.mergePublishedArticles(base);
    }
    return base;
  }

  function recapNotificationTypes() {
    return new Set(['recap', 'recap_updated', 'recap_deleted']);
  }

  function eventNotificationTypes() {
    return new Set(['new_event', 'event_updated', 'event_deleted', 'rsvp_reminder', 'seats_full']);
  }

  function articleNotificationTypes() {
    return new Set(['article_updated', 'article_deleted']);
  }

  function hasRecapContent(recap) {
    return hasRecapBody(recap);
  }

  async function validateNotificationTarget(notification) {
    if (!notification) return { ok: false, message: 'This notification is no longer available.' };
    const auth = getAuth();

    if (notification.eventId && (eventNotificationTypes().has(notification.type) || recapNotificationTypes().has(notification.type))) {
      const events = await loadAllEvents();
      const ev = events.find(item => item.id === notification.eventId);
      if (!ev || auth.isEventDeleted?.(notification.eventId)) {
        return { ok: false, message: 'This event no longer exists.' };
      }
      if (recapNotificationTypes().has(notification.type)) {
        const recap = auth.getEventRecap?.(notification.eventId, ev)
          || window.AdobeUserFeatures?.getEventRecap?.(notification.eventId, ev);
        if (auth.isRecapDeleted?.(notification.eventId) || !hasRecapContent(recap)) {
          return { ok: false, message: 'This recap is no longer available.' };
        }
      }
      return { ok: true, href: notification.href };
    }

    if (notification.articleId && articleNotificationTypes().has(notification.type)) {
      const articles = await loadAllArticles();
      const article = articles.find(item => item.id === notification.articleId);
      if (!article || auth.isArticleDeleted?.(notification.articleId)) {
        return { ok: false, message: 'This resource is no longer available.' };
      }
      return { ok: true, href: notification.href };
    }

    return { ok: true, href: notification.href };
  }

  function ensureNotificationErrorToast() {
    let toast = document.getElementById('notif-error-toast');
    if (toast) return toast;
    toast = document.createElement('div');
    toast.id = 'notif-error-toast';
    toast.className = 'notif-error-toast';
    toast.setAttribute('role', 'alert');
    toast.hidden = true;
    document.body.appendChild(toast);
    return toast;
  }

  function showNotificationError(message) {
    const toast = ensureNotificationErrorToast();
    toast.textContent = message || 'This item is no longer available.';
    toast.hidden = false;
    window.clearTimeout(showNotificationError._timer);
    showNotificationError._timer = window.setTimeout(() => {
      toast.hidden = true;
    }, 4200);
  }

  async function loadAllEvents() {
    let base = [];
    try {
      const res = await fetch(dataJsonUrl());
      if (res.ok) {
        const data = await res.json();
        base = data.events || [];
      }
    } catch (err) {
      base = [];
    }
    const auth = getAuth();
    if (auth.mergePublishedEvents) {
      return auth.mergePublishedEvents(base);
    }
    const custom = readAllCustomEvents();
    const byId = new Map();
    [...base, ...custom].forEach(ev => {
      if (ev?.id) byId.set(ev.id, ev);
    });
    return [...byId.values()];
  }

  function notificationTypeLabel(type) {
    const labels = {
      new_event: 'New event',
      event_updated: 'Event updated',
      event_deleted: 'Event removed',
      recap: 'Recap',
      recap_updated: 'Recap updated',
      recap_deleted: 'Recap removed',
      article_updated: 'Resource updated',
      article_deleted: 'Resource removed',
      rsvp_reminder: 'Reminder',
      seats_full: 'Capacity',
      recap_needed: 'Action needed',
      admin_event_created: 'Event created',
      admin_event_updated: 'Event updated',
      admin_event_deleted: 'Event deleted',
      admin_resource_created: 'Resource created',
      admin_resource_updated: 'Resource updated',
      admin_resource_deleted: 'Resource deleted',
      admin_recap_created: 'Recap posted',
      admin_recap_updated: 'Recap updated',
      admin_recap_deleted: 'Recap deleted',
      club_request:        'Review needed',
      club_approved:       'Club approved',
      club_declined:       'Club not approved',
      admin_club_approved: 'Club approved',
      admin_club_declined: 'Club declined',
    };
    return labels[type] || 'Update';
  }

  function renderPanelList() {
    const list = document.getElementById('notif-panel-list');
    if (!list) return;

    const notifications = getAllNotifications();
    const joinedCount = getJoinedClubSet().size;

    if (!getAuth().isAuthenticated?.()) {
      list.innerHTML = '<p class="notif-empty">Sign in to see club updates.</p>';
      return;
    }

    if (!notifications.length) {
      // Show role-appropriate empty state
      if (isAdminUser()) {
        const auth = getAuth();
        const overall = Boolean(auth.isAdmin?.() && !auth.isClubAdmin?.());
        list.innerHTML = overall
          ? '<p class="notif-empty">No admin alerts yet. You\'ll see club creation requests and club-admin activity here.</p>'
          : '<p class="notif-empty">No alerts yet. You\'ll see updates when an event fills up, needs a recap, or a resource changes.</p>';
      } else if (!joinedCount) {
        list.innerHTML = '<p class="notif-empty">Join a club to get event and recap alerts here.</p>';
      } else {
        list.innerHTML = '<p class="notif-empty">You\'re all caught up.</p>';
      }
      return;
    }

    // If the user has personal notifications (e.g. club approval) but no joined clubs,
    // show them and append a soft nudge — don't hide them behind the empty-state guard.
    let joinHint = '';
    if (!isAdminUser() && !joinedCount) {
      joinHint = '<p class="notif-empty notif-join-hint">Join a club to also get event and recap alerts here.</p>';
    }

    list.innerHTML = notifications.map(n => `
      <div class="notif-item-row${n.read ? ' is-read' : ''}" data-notif-id="${esc(n.id)}">
        <a class="notif-item" href="${esc(n.href || '#')}" data-notif-link="${esc(n.id)}">
          <span class="notif-item-type">${esc(notificationTypeLabel(n.type))}</span>
          <span class="notif-item-message">${esc(n.message)}</span>
        </a>
        <button type="button" class="notif-dismiss" aria-label="Remove notification">✕</button>
      </div>
    `).join('') + joinHint;

    list.querySelectorAll('.notif-item-row').forEach(row => {
      const id = row.getAttribute('data-notif-id');
      const notification = notifications.find(item => item.id === id);
      row.querySelector('.notif-item')?.addEventListener('click', async (e) => {
        e.preventDefault();
        if (id) markAsRead(id);
        const result = await validateNotificationTarget(notification);
        if (!result.ok) {
          showNotificationError(result.message);
          return;
        }
        if (result.href && result.href !== '#') {
          window.location.href = result.href;
        }
      });
      row.querySelector('.notif-dismiss')?.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (id) dismissNotification(id);
      });
    });
  }

  function setPanelOpen(open) {
    const panel = document.getElementById('notif-panel');
    const trigger = document.getElementById('notif-trigger');
    if (!panel || !trigger) return;
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
  }

  function refreshNavUI() {
    const badge = document.getElementById('notif-badge');
    const title = document.querySelector('.notif-panel-title');
    const markAllBtn = document.getElementById('notif-mark-all');
    const clearAllBtn = document.getElementById('notif-clear-all');
    const notifications = getAllNotifications();
    const count = notifications.filter(n => !n.read).length;
    const hasItems = notifications.length > 0;
    if (title) {
      title.textContent = isAdminUser() ? 'Admin alerts' : 'Notifications';
    }
    if (markAllBtn) markAllBtn.hidden = !hasItems;
    if (clearAllBtn) clearAllBtn.hidden = !hasItems;
    if (badge) {
      badge.textContent = count > 9 ? '9+' : String(count);
      badge.hidden = count === 0;
    }
    renderPanelList();
  }

  function initNavBell() {
    const navRight = document.querySelector('.nav-right, header nav .nav-tools');
    if (!navRight) return;

    let wrap = document.getElementById('notif-wrap');
    if (wrap?.dataset.bound === 'true') return;

    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'notif-wrap';
      wrap.id = 'notif-wrap';
      const profileTrigger = navRight.querySelector('.nav-profile-trigger');
      if (profileTrigger) navRight.insertBefore(wrap, profileTrigger);
      else navRight.appendChild(wrap);
    }

    wrap.hidden = false;
    wrap.removeAttribute('aria-hidden');
    wrap.dataset.bound = 'true';
    wrap.innerHTML = `
      <button type="button" class="notif-trigger" id="notif-trigger" aria-label="Notifications" aria-expanded="false" aria-controls="notif-panel">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="notif-badge" id="notif-badge" hidden>0</span>
      </button>
      <div class="notif-panel" id="notif-panel" hidden>
        <div class="notif-panel-head">
          <h2 class="notif-panel-title">Notifications</h2>
          <div class="notif-panel-actions">
            <button type="button" class="notif-panel-action" id="notif-mark-all">Mark all read</button>
            <button type="button" class="notif-panel-action notif-panel-action--clear" id="notif-clear-all">Clear all</button>
          </div>
        </div>
        <div class="notif-panel-list" id="notif-panel-list"></div>
      </div>
    `;

    const profileTrigger = navRight.querySelector('.nav-profile-trigger');
    if (profileTrigger && wrap.nextElementSibling !== profileTrigger && wrap.parentElement === navRight) {
      navRight.insertBefore(wrap, profileTrigger);
    }

    const trigger = document.getElementById('notif-trigger');
    trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = document.getElementById('notif-panel');
      setPanelOpen(panel?.hidden);
      if (!panel?.hidden) renderPanelList();
    });

    document.getElementById('notif-mark-all')?.addEventListener('click', (e) => {
      e.preventDefault();
      markAllAsRead();
    });

    document.getElementById('notif-clear-all')?.addEventListener('click', (e) => {
      e.preventDefault();
      clearAllNotifications();
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) setPanelOpen(false);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setPanelOpen(false);
    });

    window.addEventListener('adobe-notifications-updated', refreshNavUI);
    refreshNavUI();
  }

  let cachedClubs = [];

  async function loadClubs() {
    try {
      const res = await fetch(dataJsonUrl());
      if (res.ok) {
        const data = await res.json();
        cachedClubs = data.clubs || [];
      }
    } catch (err) {
      cachedClubs = [];
    }
    return cachedClubs;
  }

  async function handleSeatsFull(eventId) {
    if (!eventId) return;
    const events = await loadAllEvents();
    const ev = events.find(item => item.id === eventId);
    if (!ev) return;
    if (!cachedClubs.length) await loadClubs();
    notifyEventSeatsFull(ev, resolveClubFromEvent(ev, cachedClubs));
  }

  window.addEventListener('adobe-event-seats-full', (e) => {
    handleSeatsFull(e.detail?.eventId);
  });

  window.addEventListener('storage', (e) => {
    if (!e.key) return;
    if (
      e.key.startsWith(ADMIN_KEY)
      || e.key.startsWith(PERSONAL_KEY)
      || e.key.startsWith(DISMISSED_KEY)
      || e.key.startsWith(READ_KEY)
      || e.key === 'adobeClubsEventSeats'
      || e.key === CUSTOM_EVENTS_KEY
      || e.key === CUSTOM_ARTICLES_KEY
      || e.key === DELETED_EVENTS_KEY
      || e.key === DELETED_ARTICLES_KEY
      || e.key === DELETED_RECAPS_KEY
      || e.key === 'adobeClubsEventRecaps'
    ) {
      refreshNavUI();
    }
  });

  window.addEventListener('adobe-published-content-changed', () => {
    refreshNavUI();
    if (!isClubAdminActor()) return;
    Promise.resolve()
      .then(() => (cachedClubs.length ? cachedClubs : loadClubs()))
      .then(() => loadAllEvents())
      .then((events) => checkAdminRecapReminders(events, cachedClubs));
  });

  window.addEventListener('adobe-seats-changed', () => {
    if (!isAdminUser()) return;
    Promise.resolve()
      .then(() => (cachedClubs.length ? cachedClubs : loadClubs()))
      .then(() => loadAllEvents())
      .then(events => checkAdminSeatsFullAlerts(events, cachedClubs));
  });

  window.addEventListener('adobe-event-timing-changed', () => {
    if (!isAdminUser()) return;
    Promise.resolve()
      .then(() => (cachedClubs.length ? cachedClubs : loadClubs()))
      .then(() => loadAllEvents())
      .then(events => checkAdminRecapReminders(events, cachedClubs));
  });

  if (window.AdobeClubsAuth?.isAuthenticated?.()) initNavBell();

  async function bootstrap() {
    await getAuth().loadAuthConfig?.();
    await loadClubs();
    const events = await loadAllEvents();
    if (isAdminUser()) {
      checkAdminRecapReminders(events, cachedClubs);
      checkAdminSeatsFullAlerts(events, cachedClubs);
    } else {
      checkRsvpTomorrowReminders(events);
    }
  }

  window.AdobeNotifications = {
    notifyNewEvent,
    notifyRecapPosted,
    notifyEventUpdated,
    notifyEventDeleted,
    notifyRecapUpdated,
    notifyRecapDeleted,
    notifyArticleCreated,
    notifyArticleUpdated,
    notifyArticleDeleted,
    notifyEventSeatsFull,
    reportAdminAction,
    getActivityLog,
    notifyClubRequest,
    notifyClubApproved,
    notifyClubDeclined,
    logClubRequestActivity,
    checkRsvpTomorrowReminders,
    checkAdminRecapReminders,
    checkAdminSeatsFullAlerts,
    eventNeedsRecap,
    validateNotificationTarget,
    showNotificationError,
    getAllNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    dismissNotification,
    clearAllNotifications,
    refreshNavUI,
    resolveClubFromEvent,
    initNavBell,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();

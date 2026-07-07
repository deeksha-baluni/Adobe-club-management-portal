/**
 * event-admin.js — Admin event create / edit modal (OG events.js parity).
 */
'use strict';

(function () {
  const EVENT_IMAGE_OPTIONS = [
    { label: 'Outdoor walk / street gathering', value: 'events/evt-hero1.avif' },
    { label: 'Team collaboration / brainstorm', value: 'events/evt-hero2.avif' },
    { label: 'Live showcase / audience moment', value: 'events/evt-hero3.avif' },
    { label: 'Sports & active competition', value: 'events/evt-hero4.avif' },
    { label: 'Food, social & casual hangout', value: 'events/evt-hero5.avif' },
    { label: 'Evening celebration / networking', value: 'events/evt-hero6.avif' },
    { label: 'Workshop / whiteboard session', value: 'events/evt-hero7.avif' },
    { label: 'Group discussion / open circle', value: 'events/evt-hero8.avif' },
    { label: 'Wellness & peer support', value: 'events/evt-hero9.avif' },
    { label: 'Campus clean-up / sustainability', value: 'events/evt-hero11.avif' },
    { label: 'Photography & visual arts', value: 'clubs/adobe-lens.avif' },
    { label: 'Creative design & illustration', value: 'clubs/adobe-creatives.avif' },
    { label: 'Tech, coding & engineering', value: 'clubs/dev-guild.avif' },
    { label: 'Sports, fitness & recreation', value: 'clubs/sportzone.avif' },
    { label: 'Reading, books & knowledge', value: 'clubs/readers.avif' },
    { label: 'Games, strategy & fun', value: 'clubs/games.avif' },
    { label: 'Nature, green & eco efforts', value: 'clubs/green-adobe.avif' },
    { label: 'Community service & volunteering', value: 'clubs/volunteer.avif' },
    { label: 'Mental health & wellbeing', value: 'clubs/wellbeing.avif' },
    { label: 'Food culture & tasting', value: 'clubs/food.avif' },
  ];

  let pageCtx = null;
  let mounted = false;
  let openCreateHandler = null;

  function auth() {
    return window.AdobeClubsAuth || null;
  }

  function uf() {
    return window.AdobeUserFeatures || null;
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getMinAdminEventDateInputValue() {
    return uf()?.getTomorrowDateInputValue?.() || (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    })();
  }

  function isAdminEventDateAllowed(dateValue) {
    if (uf()?.isAdminEventDateAllowed) return uf().isAdminEventDateAllowed(dateValue);
    const picked = parseEventDateValue(dateValue)?.date;
    if (!picked) return false;
    const min = new Date();
    min.setHours(0, 0, 0, 0);
    min.setDate(min.getDate() + 1);
    return picked.getTime() >= min.getTime();
  }

  function parseEventDateValue(dateValue) {
    if (!dateValue) return null;
    const picked = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(picked.getTime())) return null;
    const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const month = MONTHS[picked.getMonth()];
    const day = String(picked.getDate());
    return { month, day, date: picked };
  }

  function buildEventTimeLabel(hour, minute, ampm) {
    return `${hour}:${minute} ${ampm}`;
  }

  function eventToDateInputValue(ev) {
    const dt = uf()?.parseEventDate?.(ev);
    if (!dt) return '';
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const d = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function parseEventTimeForForm(timeStr) {
    const match = String(timeStr || '').match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return { hour: '12', minute: '00', ampm: 'PM' };
    return {
      hour: match[1],
      minute: match[2].padStart(2, '0'),
      ampm: (match[3] || 'AM').toUpperCase(),
    };
  }

  function resolveEventClub(clubs, ev) {
    if (ev?.clubId) return (clubs || []).find((c) => c.id === ev.clubId) || null;
    const name = String(ev?.club || '').trim();
    return (clubs || []).find((c) => c.name === name) || null;
  }

  function buildTimeSelectOptions() {
    const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
    const minutes = ['00', '15', '30', '45'];
    return {
      hourOpts: hours.map((h) => `<option value="${h}">${h}</option>`).join(''),
      minuteOpts: minutes.map((m) => `<option value="${m}">${m}</option>`).join(''),
    };
  }

  function bindDigitsOnlyInput(input, { maxLength = 3, max = 999 } = {}) {
    if (!input) return;
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '').slice(0, maxLength);
      input.value = digits;
      if (digits && parseInt(digits, 10) > max) input.value = String(max);
    });
  }

  async function copyTextToClipboard(text) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      /* fall through */
    }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }

  function getSlackTargetForClub(clubObj, clubName) {
    if (clubObj?.id) {
      const metaSlack = window.AdobeClubMeta?.slack?.[clubObj.id];
      if (metaSlack?.url) return metaSlack;
      if (clubObj.slackUrl) {
        return {
          url: clubObj.slackUrl,
          channel: clubObj.slackChannel || '',
          label: clubObj.slackChannel || 'club channel',
        };
      }
    }
    return window.AdobeClubMeta?.slack?.organization || {
      url: 'https://adobe.enterprise.slack.com/archives/adobe-clubs',
      channel: 'adobe-clubs',
      label: '#adobe-clubs',
    };
  }

  function buildEventSlackAnnouncement(ev) {
    const eventUrl = pageCtx?.eventDetailUrl?.(ev.id)
      || `${window.location.origin}/event?id=${encodeURIComponent(ev.id)}`;
    const siteUrl = `${window.location.origin}/`;
    const accessLine = ev.membersOnly
      ? 'Members only — join the club on Adobe Clubs to RSVP.'
      : 'Open to all — RSVP on Adobe Clubs.';
    return [
      `📅 *${ev.title}*`,
      `${ev.club} · ${ev.month} ${ev.day} · ${ev.time}`,
      `${ev.location}`,
      accessLine,
      '',
      `RSVP: ${eventUrl}`,
      `Explore clubs & events: ${siteUrl}`,
    ].join('\n');
  }

  function canManageClubForEvent(clubObj, clubName = '') {
    if (auth()?.isAdmin?.()) return true;
    if (clubName === 'Organisation' || !clubObj?.id) return false;
    return auth()?.canManageClub?.(clubObj.id);
  }

  function mount(ctx) {
    if (!auth()?.isAnyAdmin?.()) return;
    if (document.getElementById('ev-admin-open')) return;

    pageCtx = ctx;
    mounted = true;

    const clubs = ctx.clubs || [];
    const isClubScoped = auth()?.isClubAdmin?.() && !auth()?.isAdmin?.();
    const managedIds = auth()?.getManagedClubIds?.() || [];
    const creatorClubs = isClubScoped
      ? clubs.filter((c) => managedIds.includes(c.id))
      : clubs;

    const clubOptions = [
      isClubScoped ? '' : '<option value="Organisation">Organisation</option>',
      ...creatorClubs.map((c) => `<option value="${esc(c.name)}">${esc(c.name)}</option>`),
    ].join('');

    const { hourOpts, minuteOpts } = buildTimeSelectOptions();
    const todayMin = getMinAdminEventDateInputValue();

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'ev-admin-add-btn';
    addBtn.id = 'ev-admin-open';
    addBtn.textContent = '+ Add Event';
    document.body.appendChild(addBtn);

    const toast = document.createElement('div');
    toast.className = 'ev-admin-toast';
    toast.id = 'ev-admin-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = `
      <button type="button" class="ev-admin-toast-close" id="ev-admin-toast-close" aria-label="Close">✕</button>
      <p class="ev-admin-toast-title">Event created</p>
      <p class="ev-admin-toast-hint" id="ev-admin-toast-hint">Share it in Slack so people can RSVP and discover Adobe Clubs.</p>
      <button type="button" class="ev-admin-slack-btn" id="ev-admin-slack-post" hidden>Post on Slack</button>
    `;
    document.body.appendChild(toast);

    const modal = document.createElement('div');
    modal.className = 'ev-admin-modal';
    modal.id = 'ev-admin-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="ev-admin-modal-card" id="ev-admin-modal-card" role="dialog" aria-modal="true" aria-label="Create event">
        <div class="ev-admin-head">
          <h3 class="ev-admin-title">Create Event</h3>
          <button type="button" class="ev-admin-close" id="ev-admin-close" aria-label="Close">✕</button>
        </div>
        <form class="ev-admin-form" id="ev-admin-form" novalidate>
          <p class="ev-admin-form-error" id="ev-admin-form-error" hidden></p>
          <div class="ev-admin-grid">
            <label><span>Title <span class="field-required" aria-hidden="true">*</span></span><input required name="title" maxlength="120" /></label>
            <label><span>Club <span class="field-required" aria-hidden="true">*</span></span>
              <select required name="club">
                <option value="" disabled selected>Select a club</option>
                ${clubOptions}
              </select>
            </label>
            <label class="ev-admin-date-field">
              <span>Date <span class="field-required" aria-hidden="true">*</span></span>
              <input required type="date" name="eventDate" id="ev-admin-date" min="${todayMin}" />
              <span class="ev-admin-field-hint">Must be after today</span>
              <span class="ev-admin-field-error" id="ev-admin-date-error" hidden></span>
            </label>
            <label><span>Type <span class="field-required" aria-hidden="true">*</span></span>
              <select required name="type" id="ev-admin-type">
                <option value="" disabled selected>Select type</option>
                <option value="In-person">In-person</option>
                <option value="Virtual">Virtual</option>
              </select>
            </label>
            <label class="ev-admin-time-label"><span>Time <span class="field-required" aria-hidden="true">*</span></span>
              <div class="ev-admin-time-row">
                <select required name="timeHour" aria-label="Hour">${hourOpts}</select>
                <select required name="timeMinute" aria-label="Minute">${minuteOpts}</select>
                <select required name="timeAmPm" aria-label="AM or PM">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </label>
            <label class="ev-admin-location-wrap" id="ev-admin-location-wrap"><span>Location <span class="field-required" id="ev-admin-location-req" aria-hidden="true" hidden>*</span></span>
              <input name="location" id="ev-admin-location" disabled placeholder="e.g. Tower B · Floor 4" />
            </label>
            <label><span>Access <span class="field-required" aria-hidden="true">*</span></span>
              <select required name="access" id="ev-admin-access">
                <option value="" disabled selected>Select access</option>
                <option value="open">Open to all</option>
                <option value="exclusive">Exclusive (members only)</option>
              </select>
            </label>
            <label><span>Max participants <span class="field-required" aria-hidden="true">*</span></span>
              <input required type="text" name="maxParticipants" id="ev-admin-max-participants" inputmode="numeric" pattern="[0-9]*" maxlength="3" placeholder="30" autocomplete="off" />
            </label>
          </div>
          <label><span>Description <span class="field-required" aria-hidden="true">*</span></span><textarea required name="desc" rows="4" maxlength="800"></textarea></label>
          <label><span>Image <span class="field-required" aria-hidden="true">*</span></span>
            <select name="imagePath" required>
              ${EVENT_IMAGE_OPTIONS.map((opt) => `<option value="${esc(opt.value)}">${esc(opt.label)}</option>`).join('')}
            </select>
          </label>
          <p class="ev-admin-slack-note">After you create the event, use <strong>Post on Slack</strong> to share an RSVP link and invite people to join clubs on Adobe Clubs.</p>
          <button type="submit" class="ev-admin-submit">Create Event</button>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    const form = modal.querySelector('#ev-admin-form');
    const card = modal.querySelector('#ev-admin-modal-card');
    const closeBtn = modal.querySelector('#ev-admin-close');
    const typeSelect = modal.querySelector('#ev-admin-type');
    const locationInput = modal.querySelector('#ev-admin-location');
    const locationReq = modal.querySelector('#ev-admin-location-req');
    const dateInput = modal.querySelector('#ev-admin-date');
    const dateError = modal.querySelector('#ev-admin-date-error');
    const formError = modal.querySelector('#ev-admin-form-error');
    const maxParticipantsInput = modal.querySelector('#ev-admin-max-participants');
    const modalTitle = modal.querySelector('.ev-admin-title');
    const submitBtn = form?.querySelector('.ev-admin-submit');
    const slackPostBtn = toast.querySelector('#ev-admin-slack-post');
    const slackToastHint = toast.querySelector('#ev-admin-toast-hint');
    const toastCloseBtn = toast.querySelector('#ev-admin-toast-close');

    let pendingSlackShare = null;
    let closeTimer = null;
    let editingEventId = null;

    function showFormError(message) {
      if (!formError) return;
      formError.hidden = !message;
      formError.textContent = message || '';
    }

    function showDateError(message) {
      if (!dateError) return;
      dateError.hidden = !message;
      dateError.textContent = message || '';
      if (dateInput) dateInput.setAttribute('aria-invalid', message ? 'true' : 'false');
    }

    function syncLocationField() {
      const isInPerson = typeSelect?.value === 'In-person';
      if (locationInput) {
        locationInput.disabled = !isInPerson;
        locationInput.required = isInPerson;
        if (!isInPerson) locationInput.value = '';
      }
      if (locationReq) locationReq.hidden = !isInPerson;
    }

    function refreshDateMin() {
      if (dateInput) dateInput.min = getMinAdminEventDateInputValue();
    }

    function resetCreateMode() {
      editingEventId = null;
      if (modalTitle) modalTitle.textContent = 'Create Event';
      if (submitBtn) submitBtn.textContent = 'Create Event';
      form?.reset();
      if (form?.club) {
        form.club.disabled = false;
        form.club.title = '';
      }
      syncLocationField();
      showFormError('');
      showDateError('');
    }

    function populateEventForm(ev) {
      if (!form || !ev) return;
      form.title.value = ev.title || '';
      if (form.club) form.club.value = ev.club || '';
      if (dateInput) dateInput.value = eventToDateInputValue(ev);
      if (typeSelect) typeSelect.value = ev.type || 'In-person';
      const timeParts = parseEventTimeForForm(ev.time);
      if (form.timeHour) form.timeHour.value = timeParts.hour;
      if (form.timeMinute) form.timeMinute.value = timeParts.minute;
      if (form.timeAmPm) form.timeAmPm.value = timeParts.ampm;
      if (form.access) form.access.value = ev.membersOnly ? 'exclusive' : 'open';
      if (maxParticipantsInput) {
        maxParticipantsInput.value = String(
          ev.spotsLeft || window.AdobeEventSeats?.getCapacity?.(ev) || 30,
        );
      }
      if (form.desc) form.desc.value = ev.desc || '';
      if (form.imagePath && ev.imagePath) form.imagePath.value = ev.imagePath;
      syncLocationField();
      if (locationInput && ev.type === 'In-person') locationInput.value = ev.location || '';
    }

    function dismissSuccessToast() {
      toast.classList.remove('open');
      pendingSlackShare = null;
      window.clearTimeout(dismissSuccessToast._timer);
      if (slackPostBtn) slackPostBtn.hidden = true;
    }

    function showSuccessToast(slackShare) {
      pendingSlackShare = slackShare || null;
      if (slackPostBtn) slackPostBtn.hidden = !pendingSlackShare;
      if (slackToastHint) {
        slackToastHint.textContent = pendingSlackShare
          ? `Share in ${pendingSlackShare.label} — we'll copy the announcement for you to paste in Slack.`
          : 'Event created successfully.';
      }
      toast.classList.add('open');
      window.clearTimeout(dismissSuccessToast._timer);
      dismissSuccessToast._timer = window.setTimeout(dismissSuccessToast, 12000);
    }

    function setOpen(open, { smooth = false } = {}) {
      window.clearTimeout(closeTimer);
      if (!open) {
        if (smooth) {
          modal.classList.add('is-closing');
          card?.classList.add('is-closing');
          closeTimer = window.setTimeout(() => {
            modal.classList.remove('open', 'is-closing');
            card?.classList.remove('is-closing');
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            resetCreateMode();
          }, 320);
          return;
        }
        modal.classList.remove('open', 'is-closing');
        card?.classList.remove('is-closing');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        resetCreateMode();
        return;
      }
      refreshDateMin();
      modal.classList.add('open');
      modal.classList.remove('is-closing');
      card?.classList.remove('is-closing');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      syncLocationField();
    }

    function openEdit(eventId) {
      const events = pageCtx?.getEvents?.() || [];
      const ev = events.find((item) => item.id === eventId);
      if (!ev) return;
      const clubObj = resolveEventClub(clubs, ev);
      if (!canManageClubForEvent(clubObj, ev.club)) return;
      if (pageCtx?.isPast?.(ev)) {
        window.alert('Past events cannot be edited.');
        return;
      }
      editingEventId = eventId;
      if (modalTitle) modalTitle.textContent = 'Edit Event';
      if (submitBtn) submitBtn.textContent = 'Save changes';
      populateEventForm(ev);
      if (form?.club) {
        form.club.disabled = true;
        form.club.title = 'To move this event to a different club, delete it and create a new one.';
      }
      setOpen(true);
    }

    function deleteEvent(eventId) {
      const events = pageCtx?.getEvents?.() || [];
      const ev = events.find((item) => item.id === eventId);
      if (!ev) return;
      if (!window.confirm(`Delete "${ev.title}"? Members will no longer see this event and any recap will also be removed.`)) return;
      const clubObj = resolveEventClub(clubs, ev);
      if (!canManageClubForEvent(clubObj, ev.club)) return;
      window.AdobeUserFeatures?.removeEventRecap?.(eventId);
      auth()?.deletePublishedEvent?.(eventId, {
        title: ev.title,
        clubId: clubObj?.id || ev.clubId,
        clubName: clubObj?.name || ev.club,
      });
      window.AdobeNotifications?.notifyEventDeleted?.({
        eventId,
        title: ev.title,
        clubId: clubObj?.id || ev.clubId,
        clubName: clubObj?.name || ev.club,
      });
      pageCtx?.reloadPage?.();
    }

    window.__adminEventActions = { openEdit, deleteEvent };

    bindDigitsOnlyInput(maxParticipantsInput);

    addBtn.addEventListener('click', () => {
      resetCreateMode();
      setOpen(true);
    });
    openCreateHandler = () => {
      resetCreateMode();
      setOpen(true);
    };
    closeBtn?.addEventListener('click', () => setOpen(false, { smooth: true }));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) setOpen(false, { smooth: true });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) setOpen(false, { smooth: true });
    });
    typeSelect?.addEventListener('change', syncLocationField);
    dateInput?.addEventListener('change', () => showDateError(''));
    dateInput?.addEventListener('input', () => showDateError(''));
    toastCloseBtn?.addEventListener('click', dismissSuccessToast);
    slackPostBtn?.addEventListener('click', async () => {
      if (!pendingSlackShare) return;
      const copied = await copyTextToClipboard(pendingSlackShare.message);
      window.open(pendingSlackShare.url, '_blank', 'noopener,noreferrer');
      if (slackToastHint) {
        slackToastHint.textContent = copied
          ? `Announcement copied — paste it in ${pendingSlackShare.label} and send.`
          : `Opened ${pendingSlackShare.label} — copy the event details from the new event card if needed.`;
      }
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      showFormError('');
      showDateError('');

      const fd = new FormData(form);
      const dateValue = String(fd.get('eventDate') || '');
      const parsedDate = parseEventDateValue(dateValue);

      if (!parsedDate) {
        showDateError('Please choose a valid event date.');
        dateInput?.focus();
        return;
      }
      if (!isAdminEventDateAllowed(dateValue)) {
        showDateError('Event date must be after today.');
        dateInput?.focus();
        return;
      }

      const eventType = String(fd.get('type') || '').trim();
      const location = eventType === 'In-person'
        ? String(fd.get('location') || '').trim()
        : 'Virtual · Link on Slack';

      if (eventType === 'In-person' && !location) {
        showFormError('Location is required for in-person events.');
        return;
      }

      const access = String(fd.get('access') || '').trim();
      const maxParticipants = parseInt(String(fd.get('maxParticipants') || ''), 10);
      if (!access) {
        showFormError('Please select whether the event is open or exclusive.');
        return;
      }
      if (!Number.isFinite(maxParticipants) || maxParticipants < 1) {
        showFormError('Max participants must be a number of at least 1.');
        maxParticipantsInput?.focus();
        return;
      }

      const clubName = String(fd.get('club') || '').trim();
      const clubObj = clubs.find((c) => c.name === clubName);

      if (!canManageClubForEvent(clubObj, clubName)) {
        showFormError('You can only create events for clubs you manage.');
        return;
      }

      const customEvent = {
        id: editingEventId || `evt-custom-${Date.now()}`,
        month: parsedDate.month,
        day: parsedDate.day,
        title: String(fd.get('title') || '').trim(),
        club: clubName,
        clubId: clubObj?.id || '',
        time: buildEventTimeLabel(
          String(fd.get('timeHour') || ''),
          String(fd.get('timeMinute') || ''),
          String(fd.get('timeAmPm') || ''),
        ),
        type: eventType,
        location,
        desc: String(fd.get('desc') || '').trim(),
        imagePath: String(fd.get('imagePath') || '').trim(),
        membersOnly: access === 'exclusive',
        spotsLeft: maxParticipants,
      };

      if (editingEventId) {
        auth()?.savePublishedEvent?.(customEvent, {
          title: customEvent.title,
          clubId: clubObj?.id || customEvent.clubId,
          clubName,
        });
        window.AdobeNotifications?.notifyEventUpdated?.(
          customEvent,
          clubObj || (customEvent.clubId ? { id: customEvent.clubId, name: clubName } : null),
        );
        pageCtx?.reloadPage?.();
        resetCreateMode();
        setOpen(false, { smooth: true });
        return;
      }

      auth()?.addCustomEvent?.(customEvent);
      window.AdobeNotifications?.notifyNewEvent?.(customEvent, clubObj);

      const events = pageCtx?.getEvents?.() || [];
      const nextEvents = [customEvent, ...events];
      pageCtx?.setEvents?.(nextEvents);
      window.AdobeEventSeats?.init?.(nextEvents);
      window.AdobeEventModal?.setEvents?.(nextEvents);
      pageCtx?.refreshGrids?.();

      const slackTarget = getSlackTargetForClub(clubObj, clubName);
      showSuccessToast({
        url: slackTarget.url,
        label: slackTarget.label || slackTarget.channel || 'Slack',
        message: buildEventSlackAnnouncement(customEvent),
      });
      form.reset();
      showDateError('');
      syncLocationField();
      setOpen(false, { smooth: true });

      const section = document.getElementById('ev-section');
      if (section) {
        window.setTimeout(() => {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 360);
      }
    });
  }

  function updateContext(ctx) {
    pageCtx = { ...pageCtx, ...ctx };
  }

  window.AdobeEventAdmin = {
    mount,
    updateContext,
    isMounted: () => mounted,
    openCreate: () => {
      if (openCreateHandler) openCreateHandler();
      else document.getElementById('ev-admin-open')?.click();
    },
  };
})();

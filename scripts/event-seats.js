/**
 * event-seats.js — Shared event capacity / spots-left (localStorage)
 */
'use strict';

window.AdobeEventSeats = (function () {
  const STORAGE_KEY = 'adobeClubsEventSeats';

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
    } catch (err) {
      return {};
    }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('adobe-seats-changed'));
  }

  function defaultCapacity(ev) {
    const fromData = Number(ev?.spotsLeft ?? ev?.capacity);
    if (Number.isFinite(fromData) && fromData >= 0) return fromData;
    return 20;
  }

  function init(events) {
    const state = readState();
    let changed = false;

    (events || []).forEach(ev => {
      if (!ev?.id) return;
      const capacity = defaultCapacity(ev);
      const existing = state[ev.id];
      if (!existing || existing.capacity !== capacity) {
        state[ev.id] = { capacity, spotsLeft: capacity };
        changed = true;
      }
    });

    if (changed) writeState(state);
  }

  function getEntry(evOrId) {
    const id = typeof evOrId === 'string' ? evOrId : evOrId?.id;
    if (!id) return null;
    const state = readState();
    return state[id] || null;
  }

  function getSpotsLeft(ev) {
    const entry = getEntry(ev);
    if (!entry) return defaultCapacity(ev);
    return Math.max(0, entry.spotsLeft);
  }

  function isFull(ev) {
    return getSpotsLeft(ev) <= 0;
  }

  function reserve(eventId, ev) {
    const state = readState();
    let entry = state[eventId];
    if (!entry) {
      const capacity = ev ? defaultCapacity(ev) : 20;
      entry = { capacity, spotsLeft: capacity };
      state[eventId] = entry;
    }
    if (entry.spotsLeft <= 0) return false;
    entry.spotsLeft -= 1;
    writeState(state);
    if (entry.spotsLeft === 0) {
      window.dispatchEvent(new CustomEvent('adobe-event-seats-full', {
        detail: { eventId },
      }));
    }
    return true;
  }

  function release(eventId) {
    const state = readState();
    const entry = state[eventId];
    if (!entry) return;
    entry.spotsLeft = Math.min(entry.capacity, entry.spotsLeft + 1);
    writeState(state);
  }

  function getCapacity(ev) {
    const entry = getEntry(ev);
    if (entry && Number.isFinite(entry.capacity)) return entry.capacity;
    return defaultCapacity(ev);
  }

  function spotsLabel(ev) {
    const left = getSpotsLeft(ev);
    if (left <= 0) return 'Seats full';
    return `${left} spot${left === 1 ? '' : 's'} left`;
  }

  return {
    init,
    getCapacity,
    getMax: getCapacity,
    getSpotsLeft,
    isFull,
    reserve,
    release,
    spotsLabel,
  };
}());

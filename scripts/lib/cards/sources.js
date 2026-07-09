import { getAuth } from '../app-data.js';
import { isUpcoming, sortByEventDate } from './event-dates.js';

function uf() {
  return window.AdobeUserFeatures || null;
}

/**
 * Resolve dynamic card items from data.json + auth state.
 * @param {object} data - app data
 * @param {{ kind: string, source: string, limit: number }} options
 */
export function resolveCardItems(data, { kind, source, limit = 6 }) {
  const clubs = data?.clubs || [];
  const events = data?.events || [];

  if (kind === 'club') {
    return resolveClubItems(clubs, source, limit);
  }
  if (kind === 'event') {
    return resolveEventItems(events, source, limit);
  }
  return [];
}

function resolveClubItems(clubs, source, limit) {
  switch (source) {
    case 'featured':
      return [...clubs]
        .sort((a, b) => (b.members ?? 0) - (a.members ?? 0))
        .slice(0, limit);
    case 'popular':
      return [...clubs]
        .sort((a, b) => (b.members || 0) - (a.members || 0))
        .slice(0, limit);
    case 'quiz': {
      const features = uf();
      const completed = features?.hasCompletedQuiz?.();
      if (!completed) {
        return [...clubs]
          .sort((a, b) => (b.members || 0) - (a.members || 0))
          .slice(0, limit);
      }
      let recs = features.suggestClubs(clubs, limit) || [];
      if (!recs.length) {
        const weights = features.getInterestProfile?.()?.tagWeights || {};
        recs = features.rankClubsByTagWeights?.(clubs, weights, limit) || [];
      }
      if (!recs.length) {
        recs = [...clubs]
          .map((club) => ({ club, score: features.getClubCompatibility?.(club)?.score || 0 }))
          .sort((a, b) => b.score - a.score)
          .filter((entry) => entry.score > 0)
          .slice(0, limit)
          .map((entry) => entry.club);
      }
      return recs;
    }
    case 'joined': {
      const joinedIds = getAuth().getJoinedClubs?.() || [];
      return clubs.filter((c) => joinedIds.includes(c.id)).slice(0, limit);
    }
    case 'catalog':
      return clubs;
    default:
      return clubs.slice(0, limit);
  }
}

function resolveEventItems(events, source, limit) {
  const upcoming = events.filter(isUpcoming);
  switch (source) {
    case 'upcoming':
      return sortByEventDate(upcoming).slice(0, limit);
    case 'catalog-upcoming':
      return sortByEventDate(upcoming);
    case 'catalog-past':
      return sortByEventDate(events.filter((ev) => !isUpcoming(ev))).reverse();
    case 'club-events':
      return sortByEventDate(upcoming);
    default:
      return sortByEventDate(upcoming).slice(0, limit);
  }
}

export function getQuizState() {
  const features = uf();
  return {
    completed: Boolean(features?.hasCompletedQuiz?.()),
    interests: features?.getMatchedInterestTags?.() || [],
  };
}

export function getJoinedClubIds() {
  return getAuth().getJoinedClubs?.() || [];
}

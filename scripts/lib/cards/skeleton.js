const SKELETON_HTML = {
  club: {
    showcase: `
    <div class="card-thumb card-skeleton-block"></div>
    <div class="card-body">
      <div class="card-skeleton-line card-skeleton-line--sm"></div>
      <div class="card-skeleton-line card-skeleton-line--md"></div>
      <div class="card-skeleton-line card-skeleton-line--xs"></div>
    </div>
    <div class="card-actions"><div class="card-skeleton-btn"></div></div>`,
    poster: `
    <div class="lp-club-thumb card-skeleton-block"></div>
    <div class="lp-club-body">
      <div class="card-skeleton-line card-skeleton-line--sm"></div>
      <div class="card-skeleton-line card-skeleton-line--md"></div>
    </div>
    <div class="lp-card-action"><div class="card-skeleton-btn"></div></div>`,
  },
  event: {
    showcase: `
    <div class="card-thumb card-skeleton-block"></div>
    <div class="card-body">
      <div class="card-skeleton-line card-skeleton-line--sm"></div>
      <div class="card-skeleton-line card-skeleton-line--md"></div>
      <div class="card-skeleton-line card-skeleton-line--xs"></div>
    </div>
    <div class="card-actions"><div class="card-skeleton-btn"></div></div>`,
    poster: `
    <div class="lp-event-thumb card-skeleton-block"></div>
    <div class="lp-event-body">
      <div class="card-skeleton-line card-skeleton-line--sm"></div>
      <div class="card-skeleton-line card-skeleton-line--md"></div>
    </div>
    <div class="lp-card-action"><div class="card-skeleton-btn"></div></div>`,
  },
};

export function buildSkeletonCard(kind, layout = 'showcase') {
  const card = document.createElement('div');
  const layoutKey = layout === 'poster' ? 'poster' : 'showcase';
  const kindKey = kind === 'event' ? 'event' : 'club';
  const shellClass = layoutKey === 'poster'
    ? (kindKey === 'event' ? 'lp-event-card lp-event-card--action' : 'lp-club-card lp-club-card--action')
    : `card card--${kindKey} card--skeleton`;
  card.className = `${shellClass} card--loading`;
  card.setAttribute('aria-hidden', 'true');
  card.innerHTML = SKELETON_HTML[kindKey][layoutKey];
  return card;
}

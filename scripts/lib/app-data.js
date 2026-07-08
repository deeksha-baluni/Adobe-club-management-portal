/**
 * Shared data.json fetch with eager prefetch support.
 */
export async function fetchAppData() {
  if (window.__adobeClubsDataPrefetch) {
    const data = await window.__adobeClubsDataPrefetch;
    if (data) return data;
  }
  try {
    const base = window.hlx?.codeBasePath || '';
    const resp = await fetch(`${base}/data/data.json`);
    if (!resp.ok) return null;
    return resp.json();
  } catch {
    return null;
  }
}

export function getAuth() {
  return window.AdobeClubsAuth || {
    isAuthenticated: () => false,
    loginUrlWithNext: () => `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}${window.location.hash}`)}`,
    redirectToLogin() {
      window.location.href = this.loginUrlWithNext();
    },
  };
}

export function redirectToLogin() {
  const auth = getAuth();
  if (auth.redirectToLogin) auth.redirectToLogin();
  else window.location.href = auth.loginUrlWithNext();
}

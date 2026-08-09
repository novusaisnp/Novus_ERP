// sessionStorage survives page reloads/redirects within the same tab, but is
// wiped when the tab/browser actually closes — unlike localStorage. That gap
// is what tells apart "user just logged in, page redirected" (keep session)
// from "browser was closed and reopened with a stale session" (force logout).
const SESSION_ACTIVE_KEY = 'novus_session_active';

export function markSessionActive() {
  sessionStorage.setItem(SESSION_ACTIVE_KEY, 'true');
}

export function isSessionActive() {
  return sessionStorage.getItem(SESSION_ACTIVE_KEY) === 'true';
}

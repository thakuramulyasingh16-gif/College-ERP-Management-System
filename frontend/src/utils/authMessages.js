/**
 * Shared helper: maps a 401 response code to the sessionStorage message
 * that Login.jsx reads and shows to the user.
 *
 * Used by:
 *   - frontend/src/api/index.js (axios interceptor)
 *   - frontend/src/utils/api.js  (authFetch)
 *   - frontend/src/context/AuthContext.jsx (verify failure on mount)
 *   - frontend/src/hooks/useIdleLogout.js  (frontend idle timeout)
 */
export function handleAuthError(code, message) {
  const defaults = {
    SESSION_INVALIDATED:
      'You have been logged out because your account was signed in from another device.',
    SESSION_IDLE_TIMEOUT:
      'You were logged out because of inactivity.',
    SESSION_EXPIRED:
      'Your session has expired. Please log in again.',
  };

  const knownCodes = new Set(['SESSION_INVALIDATED', 'SESSION_IDLE_TIMEOUT', 'SESSION_EXPIRED']);

  if (code && knownCodes.has(code)) {
    sessionStorage.setItem(
      'session_invalidated_msg',
      message || defaults[code]
    );
  }
}


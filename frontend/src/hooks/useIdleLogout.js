/**
 * useIdleLogout.js
 *
 * Front-end idle timeout UX layer.
 *
 * - Tracks mousemove, mousedown, keydown, scroll, touchstart, click (passive).
 * - Stores last-activity timestamp in localStorage('erp_last_activity') so
 *   all tabs share it and page refresh doesn't reset the clock.
 * - Checks timestamp every 15 s AND on visibilitychange/focus (via Date.now()
 *   comparison, not setInterval counting — survives laptop sleep/bg throttling).
 * - 5 min before timeout shows an accessible warning modal.
 * - At timeout: calls logout(), sets sessionStorage message, navigates to /login.
 * - Sends POST /api/auth/activity heartbeat at most once every 5 min when active.
 * - Cross-tab sync: storage event on 'token' removal → redirect to /login.
 *
 * Mount once inside AuthProvider or at a top level that is only rendered
 * when a user is logged in.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'https://college-erp-management-system-a9xk.onrender.com/api';
const LS_LAST_ACTIVITY = 'erp_last_activity';

// Config from env (VITE_IDLE_TIMEOUT_MINUTES) or default 60
const TIMEOUT_MINUTES = parseFloat(
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_IDLE_TIMEOUT_MINUTES || '60'
    : '60'
);
const TIMEOUT_MS = (isNaN(TIMEOUT_MINUTES) || TIMEOUT_MINUTES <= 0 ? 60 : TIMEOUT_MINUTES) * 60 * 1000;
const WARNING_MS = 5 * 60 * 1000;              // show warning 5 min before timeout
const CHECK_INTERVAL_MS = 15 * 1000;           // check every 15 s
const ACTIVITY_THROTTLE_MS = 1000;             // update localStorage at most once/s
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000;  // send heartbeat at most once per 5 min

export default function useIdleLogout({ onShowWarning, onHideWarning }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const lastActivityWriteRef = useRef(0);
  const lastHeartbeatRef = useRef(0);
  const hadActivitySinceHeartbeatRef = useRef(false);

  // ── Record user activity ──────────────────────────────────────────────────
  const recordActivity = useCallback(() => {
    hadActivitySinceHeartbeatRef.current = true;
    const now = Date.now();
    if (now - lastActivityWriteRef.current < ACTIVITY_THROTTLE_MS) return;
    lastActivityWriteRef.current = now;
    localStorage.setItem(LS_LAST_ACTIVITY, String(now));
  }, []);

  // ── Send heartbeat to backend ─────────────────────────────────────────────
  const sendHeartbeat = useCallback(async () => {
    if (!hadActivitySinceHeartbeatRef.current) return; // only if user was active
    const now = Date.now();
    if (now - lastHeartbeatRef.current < HEARTBEAT_INTERVAL_MS) return;
    lastHeartbeatRef.current = now;
    hadActivitySinceHeartbeatRef.current = false;
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await fetch(`${API_BASE}/auth/activity`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch {
      // silently ignore network errors — server enforces the timeout independently
    }
  }, []);

  // ── Perform idle timeout logout ───────────────────────────────────────────
  const handleTimeout = useCallback(async () => {
    sessionStorage.setItem(
      'session_invalidated_msg',
      'You were logged out because of inactivity.'
    );
    await logout();
    // logout() calls window.location.replace('/login') already,
    // but use navigate as a fallback inside SPA context
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  // ── Check idle status ─────────────────────────────────────────────────────
  const checkIdle = useCallback(async () => {
    if (!user) return;
    const rawTs = localStorage.getItem(LS_LAST_ACTIVITY);
    if (!rawTs) return; // no timestamp yet — treat as active
    const lastActivity = parseInt(rawTs, 10);
    const idleMs = Date.now() - lastActivity;

    if (idleMs >= TIMEOUT_MS) {
      onHideWarning && onHideWarning();
      await handleTimeout();
      return;
    }

    const msUntilTimeout = TIMEOUT_MS - idleMs;
    if (msUntilTimeout <= WARNING_MS) {
      // Show warning, with seconds remaining
      const secsRemaining = Math.ceil(msUntilTimeout / 1000);
      onShowWarning && onShowWarning(secsRemaining);
    } else {
      onHideWarning && onHideWarning();
    }

    // Send heartbeat if conditions are met
    await sendHeartbeat();
  }, [user, handleTimeout, sendHeartbeat, onShowWarning, onHideWarning]);

  // ── Event listeners for user activity ────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const opts = { passive: true, capture: true };
    events.forEach((e) => window.addEventListener(e, recordActivity, opts));

    return () => {
      events.forEach((e) => window.removeEventListener(e, recordActivity, opts));
    };
  }, [user, recordActivity]);

  // ── Periodic check (every 15 s) ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(checkIdle, CHECK_INTERVAL_MS);
    // Also check immediately when hook activates
    checkIdle();
    return () => clearInterval(interval);
  }, [user, checkIdle]);

  // ── Check on visibility/focus change ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const onVisible = () => { if (document.visibilityState === 'visible') checkIdle(); };
    const onFocus = () => checkIdle();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onFocus);
    };
  }, [user, checkIdle]);

  // ── Expose a "stay signed in" action to the warning modal ─────────────────
  const staySignedIn = useCallback(async () => {
    recordActivity();
    // Force a heartbeat regardless of the 5-min throttle
    lastHeartbeatRef.current = 0;
    hadActivitySinceHeartbeatRef.current = true;
    await sendHeartbeat();
    onHideWarning && onHideWarning();
  }, [recordActivity, sendHeartbeat, onHideWarning]);

  return { staySignedIn };
}


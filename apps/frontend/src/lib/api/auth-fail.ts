/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

// Centralized handler for "the backend rejected our session cookie" detected
// from a client-side fetch / SSE stream. Mirrors the server-side path in
// app/layout.tsx (which redirects to /auth/logout when fetchCurrentUser
// returns 'unauthenticated'). Keep these two paths in sync — any new
// network-touching code must funnel its 401 handling here.
//
// Idempotent: multiple parallel failures during a single page load do not
// trigger multiple navigations.
let redirectInFlight = false;

export function redirectToLogout(): void {
  if (redirectInFlight || typeof window === 'undefined') {
    return;
  }

  redirectInFlight = true;
  const returnTo = window.location.pathname + window.location.search;

  window.location.href = `/auth/logout?returnTo=${encodeURIComponent(returnTo)}`;
}

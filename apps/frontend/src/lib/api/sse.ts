/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

import { Observable } from 'rxjs';
import { redirectToLogout } from './auth-fail';

export interface SseMessage<T = unknown> {
  type: string;
  data: T;
}

export interface SseError {
  // Distinguishes a closed-because-unauthorized from a generic stream error.
  // EventSource does not surface the underlying HTTP status, but the readyState
  // transitions to CLOSED when the server returns a non-2xx (notably 401).
  // We attempt to differentiate based on whether the stream sent any
  // 'open' event before failing.
  reason: 'unauthorized' | 'stream-error';
  message: string;
}

// Subscribes to a Server-Sent Events stream and emits one SseMessage per
// server-side `event:`/`data:` pair. Caller passes the list of event types it
// cares about (anything else is ignored — there is no generic onmessage
// listener so the browser does not buffer events the caller never reads).
//
// On stream error the observable surfaces an SseError. Centralized 401
// handling: when the stream closes WITHOUT ever opening, we treat it as an
// unauthorized close (server rejected the cookie) and trigger a redirect
// to /auth/logout via redirectToLogout. The observable still emits the error
// so the reducer can flip to 'error' state for the brief moment before
// navigation completes.
export function createSseObservable<T = unknown>(
  url: string,
  eventTypes: readonly string[]
): Observable<SseMessage<T>> {
  return new Observable<SseMessage<T>>((subscriber) => {
    const source = new EventSource(url, { withCredentials: true });
    let opened = false;

    const onOpen = () => {
      opened = true;
    };

    const handlers: Array<{ type: string; handler: (event: MessageEvent) => void }> = eventTypes.map((type) => {
      const handler = (event: MessageEvent) => {
        let parsed: T;

        try {
          parsed = JSON.parse(event.data as string) as T;
        } catch {
          const raw = event.data as string | undefined;
          parsed = { message: raw ?? `SSE event "${type}" failed` } as T;
        }

        subscriber.next({ type, data: parsed });
      };

      source.addEventListener(type, handler as EventListener);
      return { type, handler };
    });

    const onError = () => {
      const wasOpened = opened;
      // Browsers fire 'error' for both transient drops and final close. We
      // only emit on CLOSED to avoid spurious teardown on reconnect attempts.
      if (source.readyState !== EventSource.CLOSED) {
        return;
      }

      const error: SseError = wasOpened
        ? { reason: 'stream-error', message: 'SSE stream closed unexpectedly' }
        : { reason: 'unauthorized', message: 'SSE connection rejected (likely 401)' };

      subscriber.error(error);

      if (error.reason === 'unauthorized') {
        redirectToLogout();
      }
    };

    source.addEventListener('open', onOpen);
    source.addEventListener('error', onError);

    return () => {
      for (const { type, handler } of handlers) {
        source.removeEventListener(type, handler as EventListener);
      }
      source.removeEventListener('open', onOpen);
      source.removeEventListener('error', onError);
      source.close();
    };
  });
}

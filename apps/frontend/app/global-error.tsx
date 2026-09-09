/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client';

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="page-shell">
          <section className="hero">
            <span className="eyebrow">Application Error</span>
            <h1>Something failed during rendering.</h1>
            <p>{error.message || 'Unexpected application error.'}</p>
            <div className="nav">
              <button className="button-link primary" onClick={reset} type="button">
                Retry render
              </button>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}

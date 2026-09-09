/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <span className="eyebrow">404</span>
        <h1>Route not found.</h1>
        <p>The requested page is outside the current assistant workspace.</p>
        <div className="nav">
          <Link className="button-link primary" href="/digest">
            Back to digest
          </Link>
        </div>
      </section>
    </main>
  );
}

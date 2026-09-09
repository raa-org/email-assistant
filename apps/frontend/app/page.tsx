/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { redirect } from 'next/navigation';

export default function HomePage(): never {
  redirect('/digest');
}

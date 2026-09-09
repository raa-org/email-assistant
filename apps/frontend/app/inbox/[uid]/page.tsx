/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { MessageDetailView } from '../../../src/features/inbox/message-detail-view';

export default async function MessageDetailPage({
  params
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;

  return <MessageDetailView uid={uid} />;
}

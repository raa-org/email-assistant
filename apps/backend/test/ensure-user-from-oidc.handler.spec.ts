/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { EnsureUserFromOidcHandler } from '../src/user/commands/handlers/ensure-user-from-oidc.handler.js';
import { EnsureUserFromOidcCommand } from '../src/user/commands/ensure-user-from-oidc.command.js';
import type { UserEntity } from '../src/user/user.entity.js';

class FakeUserRepository {
  users = new Map<string, UserEntity>();
  idSequence = 0;

  async findOne(options: { where: { oidcSubject: string } }): Promise<UserEntity | null> {
    return this.users.get(options.where.oidcSubject) ?? null;
  }

  create(partial: Partial<UserEntity>): UserEntity {
    return partial as UserEntity;
  }

  async save(entity: Partial<UserEntity>): Promise<UserEntity> {
    const existing = entity.oidcSubject ? this.users.get(entity.oidcSubject) : undefined;
    const now = new Date();
    const saved = {
      id: existing?.id ?? `user-${++this.idSequence}`,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      ...existing,
      ...entity
    } as UserEntity;

    this.users.set(saved.oidcSubject, saved);

    return saved;
  }
}

test('EnsureUserFromOidcHandler creates a user on first login', async () => {
  const repository = new FakeUserRepository();
  const handler = new EnsureUserFromOidcHandler(repository as never);
  const loggedInAt = new Date('2026-04-08T12:00:00.000Z');

  const result = await handler.execute(
    new EnsureUserFromOidcCommand('oidc-user-1', 'user@example.com', 'User Example', loggedInAt)
  );

  assert.equal(result.id, 'user-1');
  assert.equal(result.oidcSubject, 'oidc-user-1');
  assert.equal(result.email, 'user@example.com');
  assert.equal(result.displayName, 'User Example');
  assert.equal(repository.users.size, 1);
  assert.equal(repository.users.get('oidc-user-1')?.lastLoginAt.toISOString(), loggedInAt.toISOString());
});

test('EnsureUserFromOidcHandler updates an existing user on repeated login', async () => {
  const repository = new FakeUserRepository();
  const initialLoginAt = new Date('2026-04-08T10:00:00.000Z');
  const nextLoginAt = new Date('2026-04-08T15:30:00.000Z');

  await repository.save({
    oidcSubject: 'oidc-user-1',
    email: 'old@example.com',
    displayName: 'Old Name',
    lastLoginAt: initialLoginAt
  });

  const handler = new EnsureUserFromOidcHandler(repository as never);
  const result = await handler.execute(
    new EnsureUserFromOidcCommand('oidc-user-1', 'new@example.com', 'New Name', nextLoginAt)
  );

  assert.equal(result.id, 'user-1');
  assert.equal(result.email, 'new@example.com');
  assert.equal(result.displayName, 'New Name');
  assert.equal(repository.users.size, 1);
  assert.equal(repository.users.get('oidc-user-1')?.lastLoginAt.toISOString(), nextLoginAt.toISOString());
});

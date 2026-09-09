/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

// Pure rename of the per-message summary store. Preserves all existing rows
// (encrypted payloads, hashes, timestamps) — no data loss. Constraint and
// index are also renamed to the names TypeORM would auto-generate for the
// new table, so future `migration:generate` runs do not see drift.
export class RenameMessageSummariesTable1776368110451 implements MigrationInterface {
  name = 'RenameMessageSummariesTable1776368110451';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "message_summary_cache" RENAME TO "message_summaries"`);
    await queryRunner.query(
      `ALTER INDEX "IDX_msc_user_generated_at" RENAME TO "IDX_message_summaries_user_generated_at"`
    );
    await queryRunner.query(
      `ALTER TABLE "message_summaries" RENAME CONSTRAINT "PK_85789b675687d18e51b26d7d209" TO "PK_d2a511f02f95f9512b59fdeaa0c"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "message_summaries" RENAME CONSTRAINT "PK_d2a511f02f95f9512b59fdeaa0c" TO "PK_85789b675687d18e51b26d7d209"`
    );
    await queryRunner.query(
      `ALTER INDEX "IDX_message_summaries_user_generated_at" RENAME TO "IDX_msc_user_generated_at"`
    );
    await queryRunner.query(`ALTER TABLE "message_summaries" RENAME TO "message_summary_cache"`);
  }
}

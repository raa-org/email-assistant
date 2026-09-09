/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthSessionTable1775755200000 implements MigrationInterface {
  name = 'CreateAuthSessionTable1775755200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auth_sessions" ("id" uuid NOT NULL, "user_id" uuid NOT NULL, "oidc_subject" character varying(255) NOT NULL, "access_token_encrypted" text NOT NULL, "refresh_token_encrypted" text NOT NULL, "id_token_encrypted" text, "access_token_expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "refresh_token_expires_at" TIMESTAMP WITH TIME ZONE, "last_used_at" TIMESTAMP WITH TIME ZONE NOT NULL, "last_refreshed_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_auth_sessions_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`CREATE INDEX "IDX_auth_sessions_user_id" ON "auth_sessions" ("user_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_auth_sessions_oidc_subject" ON "auth_sessions" ("oidc_subject") `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_auth_sessions_oidc_subject"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_auth_sessions_user_id"`);
    await queryRunner.query(`DROP TABLE "auth_sessions"`);
  }
}

/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBriefingsTable1776732000900 implements MigrationInterface {
    name = 'CreateBriefingsTable1776732000900'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "briefings" ("user_id" uuid NOT NULL, "folder" character varying(255) NOT NULL, "kind" character varying(16) NOT NULL, "date_from" character varying(10) NOT NULL DEFAULT '_', "date_to" character varying(10) NOT NULL DEFAULT '_', "type" character varying(16) NOT NULL, "message_count" integer NOT NULL, "uids_hash" character varying(64) NOT NULL, "payload_encrypted" text NOT NULL, "llm_model" character varying(128) NOT NULL, "llm_provider" character varying(32) NOT NULL, "generated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_0da3b6b0e6fc731509d7a235b9a" PRIMARY KEY ("user_id", "folder", "kind", "date_from", "date_to", "type"))`);
        await queryRunner.query(`CREATE INDEX "IDX_briefings_user_generated" ON "briefings" ("user_id", "generated_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_briefings_user_generated"`);
        await queryRunner.query(`DROP TABLE "briefings"`);
    }

}

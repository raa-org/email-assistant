/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMessageSummaryCache1776359114115 implements MigrationInterface {
    name = 'CreateMessageSummaryCache1776359114115'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "message_summary_cache" ("user_id" uuid NOT NULL, "folder" character varying(255) NOT NULL, "message_uid" character varying(64) NOT NULL, "body_hash" character varying(64) NOT NULL, "payload_encrypted" text NOT NULL, "llm_model" character varying(128) NOT NULL, "llm_provider" character varying(32) NOT NULL, "generated_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_85789b675687d18e51b26d7d209" PRIMARY KEY ("user_id", "folder", "message_uid"))`);
        await queryRunner.query(`CREATE INDEX "IDX_msc_user_generated_at" ON "message_summary_cache" ("user_id", "generated_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_msc_user_generated_at"`);
        await queryRunner.query(`DROP TABLE "message_summary_cache"`);
    }

}

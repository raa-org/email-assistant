/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPromptVersionToMessageSummaries1776966999253 implements MigrationInterface {
    name = 'AddPromptVersionToMessageSummaries1776966999253'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message_summaries" ADD "prompt_version" character varying(8) NOT NULL DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message_summaries" DROP COLUMN "prompt_version"`);
    }

}

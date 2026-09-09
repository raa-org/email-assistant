/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLlmParamsHashToBriefings1776967156209 implements MigrationInterface {
    name = 'AddLlmParamsHashToBriefings1776967156209'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "briefings" ADD "llm_params_hash" character varying(64) NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "briefings" DROP COLUMN "llm_params_hash"`);
    }

}

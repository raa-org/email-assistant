/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedUser } from '../../../auth/auth.types.js';
import { UserEntity } from '../../user.entity.js';
import { EnsureUserFromOidcCommand } from '../ensure-user-from-oidc.command.js';

@CommandHandler(EnsureUserFromOidcCommand)
export class EnsureUserFromOidcHandler
  implements ICommandHandler<EnsureUserFromOidcCommand, AuthenticatedUser>
{
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {}

  async execute(command: EnsureUserFromOidcCommand): Promise<AuthenticatedUser> {
    const existingUser = await this.userRepository.findOne({
      where: { oidcSubject: command.oidcSubject }
    });

    const user = existingUser
      ? await this.userRepository.save({
          ...existingUser,
          email: command.email,
          displayName: command.displayName,
          lastLoginAt: command.loggedInAt
        })
      : await this.userRepository.save(
          this.userRepository.create({
            oidcSubject: command.oidcSubject,
            email: command.email,
            displayName: command.displayName,
            lastLoginAt: command.loggedInAt
          })
        );

    return {
      id: user.id,
      oidcSubject: user.oidcSubject,
      email: user.email,
      displayName: user.displayName
    };
  }
}

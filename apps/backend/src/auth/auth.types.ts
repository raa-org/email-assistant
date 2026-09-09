/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

export interface AuthenticatedUser {
  id: string;
  oidcSubject: string;
  email: string;
  displayName: string;
}

export interface AppSessionClaims extends AuthenticatedUser {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sessionId: string;
}

export interface OidcUserInfo {
  sub: string;
  email?: string;
  preferred_username?: string;
  name?: string;
}

export interface OidcTokenResult {
  accessToken: string;
  accessTokenExpiresAt: Date;
  idToken?: string;
  refreshToken?: string;
  refreshTokenExpiresAt?: Date;
}

export interface OidcLoginResult extends OidcTokenResult {
  refreshToken: string;
  userInfo: OidcUserInfo;
}

export interface AuthSessionOwner {
  oidcSubject: string;
  sessionId: string;
  userId: string;
}

export interface OidcCallbackParams {
  code: string;
  issuer?: string;
  state: string;
}

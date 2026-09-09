/*
 * Copyright (c) 2026 Right&Above, LLC
 * https://rightandabove.com
 * SPDX-License-Identifier: MIT
 */

'use client'

import Link from 'next/link'
import React, { useState, type MouseEvent, type ReactNode } from 'react'
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded'
import BoltRoundedIcon from '@mui/icons-material/BoltRounded'
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded'
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded'
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded'
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded'
import MailRoundedIcon from '@mui/icons-material/MailRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import { Box, Menu, MenuItem, Stack, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { appActions } from '../../state/app/actions'
import { selectIsDarkMode } from '../../state/app/selectors'
import { selectUserEmail, selectUserInitials } from '../../state/user/selectors'
import { useAppDispatch, useAppSelector } from '../../state/hooks'

type ActivePage = 'digest' | 'inbox'

const PageRoot = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  backgroundColor: theme.appTokens.dashboard.canvas,
  color: theme.appTokens.dashboard.textPrimary,
}))

const HeaderBar = styled(Box)<{ component?: string }>(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1100,
  height: theme.appTokens.layout.headerHeight,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingInline: theme.spacing(3),
  borderBottom: `1px solid ${theme.appTokens.dashboard.border}`,
  backdropFilter: 'blur(18px)',
  backgroundColor: theme.appTokens.dashboard.surface,
  [theme.breakpoints.down('md')]: {
    height: 'auto',
    paddingBlock: theme.spacing(1.5),
    paddingInline: theme.spacing(2),
  },
}))

const HeaderContent = styled(Stack)(({ theme }) => ({
  width: '100%',
  maxWidth: 1600,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    flexWrap: 'wrap',
    alignItems: 'stretch',
  },
}))

const BrandGroup = styled(Stack)(({ theme }) => ({
  minWidth: 200,
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1),
}))

const BrandMark = styled(Box)(({ theme }) => ({
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  background: theme.appTokens.dashboard.brandGradient,
  color: theme.appTokens.dashboard.textInverse,
  flexShrink: 0,
}))

const BrandTitle = styled(Typography)(({ theme }) => ({
  fontSize: 20,
  fontWeight: 500,
  letterSpacing: '-0.02em',
  whiteSpace: 'nowrap',
}))

const SearchShell = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1),
  minWidth: 280,
  maxWidth: 480,
  flex: '1 1 420px',
  paddingInline: theme.spacing(2),
  paddingBlock: theme.spacing(1.25),
  borderRadius: 999,
  border: `1px solid ${theme.appTokens.dashboard.searchBorder}`,
  backgroundColor: theme.appTokens.dashboard.searchSurface,
  color: theme.appTokens.dashboard.textSecondary,
  [theme.breakpoints.down('md')]: {
    order: 3,
    maxWidth: '100%',
  },
}))

const SearchText = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 500,
  color: theme.appTokens.dashboard.textSecondary,
  letterSpacing: '-0.01em',
}))

const UserGroup = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: theme.spacing(2),
  minWidth: 240,
  [theme.breakpoints.down('md')]: {
    minWidth: 'auto',
    marginLeft: 'auto',
  },
}))

const UserIdentity = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  paddingInline: theme.spacing(1),
  paddingBlock: theme.spacing(0.5),
  borderRadius: 999,
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  '&:hover': {
    backgroundColor: theme.appTokens.dashboard.surfaceMuted,
  },
}))

const UserAvatar = styled(Box)(({ theme }) => ({
  width: 40,
  height: 40,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  backgroundColor: theme.appTokens.dashboard.avatarSurface,
}))

const UserInitials = styled(Typography)(({ theme }) => ({
  fontSize: 16,
  fontWeight: 600,
  color: theme.appTokens.dashboard.green,
}))

const UserEmail = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 500,
  letterSpacing: '-0.01em',
  color: theme.appTokens.dashboard.textPrimary,
  whiteSpace: 'nowrap',
  [theme.breakpoints.down('sm')]: {
    display: 'none',
  },
}))

const UserMenuText = styled(Typography)(({ theme }) => ({
  fontSize: 14,
  fontWeight: 500,
  color: theme.appTokens.dashboard.textSecondary,
}))

const UserMenuSurface = styled(Menu)(({ theme }) => ({
  '& .MuiPaper-root': {
    marginTop: theme.spacing(1),
    minWidth: 220,
    borderRadius: 12,
    border: `1px solid ${theme.appTokens.dashboard.border}`,
    backgroundColor: theme.appTokens.dashboard.surface,
    boxShadow: 'none',
  },
  '& .MuiMenuItem-root': {
    gap: theme.spacing(1.25),
    fontSize: 14,
    color: theme.appTokens.dashboard.textPrimary,
  },
}))

const SidebarNav = styled(Box)<{ component?: string; 'aria-label'?: string }>(({ theme }) => ({
  position: 'fixed',
  left: theme.appTokens.layout.sidebarOffset,
  top: theme.appTokens.layout.headerHeight + theme.appTokens.layout.sidebarOffset + 8,
  zIndex: 1000,
  padding: theme.spacing(0.5),
  borderRadius: 10,
  backgroundColor: theme.appTokens.dashboard.sidebar,
  [theme.breakpoints.down('md')]: {
    position: 'static',
    width: 'fit-content',
    marginInline: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
}))

const SidebarStack = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(1),
  [theme.breakpoints.down('md')]: {
    flexDirection: 'row',
  },
}))

const SidebarButton = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean; component?: React.ElementType; href?: string }>(({ theme, active = false }) => ({
  width: 48,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '50%',
  color: active ? theme.appTokens.dashboard.textInverse : theme.appTokens.dashboard.textInverseMuted,
  backgroundColor: active ? theme.appTokens.dashboard.sidebarActive : 'transparent',
  transition: 'background-color 0.15s ease, color 0.15s ease',
  '&:hover': {
    color: theme.appTokens.dashboard.textInverse,
    backgroundColor: theme.appTokens.dashboard.sidebarHover,
  },
}))

const MainContent = styled(Box)(({ theme }) => ({
  paddingTop: theme.appTokens.layout.headerHeight,
  paddingBottom: theme.spacing(4),
  marginLeft: theme.appTokens.layout.sidebarOffset + theme.appTokens.layout.sidebarWidth,
  height: '100vh',
  boxSizing: 'border-box',
  [theme.breakpoints.down('md')]: {
    marginLeft: 0,
    paddingTop: theme.appTokens.layout.headerHeight + 24,
  },
}))

function SidebarItem({ icon, href, active = false }: { icon: ReactNode; href?: string; active?: boolean }) {
  if (href) {
    return (
      <SidebarButton active={active} component={Link} href={href}>
        {icon}
      </SidebarButton>
    )
  }
  return <SidebarButton active={active}>{icon}</SidebarButton>
}

export function AppShell({ children, activePage }: { children: ReactNode; activePage?: ActivePage }) {
  const dispatch = useAppDispatch()
  const isDarkMode = useAppSelector(selectIsDarkMode)
  const userInitials = useAppSelector(selectUserInitials)
  const userEmail = useAppSelector(selectUserEmail)
  const hasUser = Boolean(userInitials && userEmail)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)

  const openUserMenu = (event: MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget)
  }

  const closeUserMenu = () => {
    setMenuAnchor(null)
  }

  return (
    <PageRoot>
      <HeaderBar component="header">
        <HeaderContent>
          <BrandGroup>
            <BrandMark>
              <AutoAwesomeRoundedIcon sx={{ fontSize: 16 }} />
            </BrandMark>
            <BrandTitle>
              Ai{' '}
              <Box component="span" sx={{ fontWeight: 300 }}>
                Assistant
              </Box>
            </BrandTitle>
          </BrandGroup>

          <SearchShell>
            <SearchRoundedIcon sx={{ fontSize: 14 }} />
            <SearchText>Search emails, meetings, contacts or ask something...</SearchText>
          </SearchShell>

          <UserGroup>
            {hasUser && (
              <UserIdentity
                aria-controls={menuAnchor ? 'app-shell-user-menu' : undefined}
                aria-expanded={menuAnchor ? 'true' : undefined}
                aria-haspopup="menu"
                onClick={openUserMenu}
                role="button"
              >
                <UserAvatar>
                  <UserInitials>{userInitials}</UserInitials>
                </UserAvatar>
                <UserEmail>{userEmail}</UserEmail>
                <ExpandMoreRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
              </UserIdentity>
            )}
            <UserMenuSurface
              anchorEl={menuAnchor}
              id="app-shell-user-menu"
              onClose={closeUserMenu}
              open={Boolean(menuAnchor)}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            >
              <MenuItem
                onClick={() => {
                  dispatch(appActions.toggleThemeMode())
                  closeUserMenu()
                }}
              >
                {isDarkMode ? <LightModeRoundedIcon fontSize="small" /> : <DarkModeRoundedIcon fontSize="small" />}
                <UserMenuText>Switch theme</UserMenuText>
              </MenuItem>
              <MenuItem component={Link} href="/auth/logout" onClick={closeUserMenu}>
                <LogoutRoundedIcon fontSize="small" />
                <UserMenuText>Logout</UserMenuText>
              </MenuItem>
            </UserMenuSurface>
          </UserGroup>
        </HeaderContent>
      </HeaderBar>

      <MainContent>
        <SidebarNav component="nav" aria-label="Primary navigation">
          <SidebarStack>
            <SidebarItem
              active={activePage === 'digest'}
              href="/digest"
              icon={<BoltRoundedIcon sx={{ fontSize: 18 }} />}
            />
            <SidebarItem
              active={activePage === 'inbox'}
              href="/inbox"
              icon={<MailRoundedIcon sx={{ fontSize: 18 }} />}
            />
          </SidebarStack>
        </SidebarNav>

        {children}
      </MainContent>
    </PageRoot>
  )
}

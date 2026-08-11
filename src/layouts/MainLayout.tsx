import React, { useEffect, useRef, useState, createContext, useContext } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch } from '../store/hooks';
import { fetchPlatforms } from '../store/slices/platformsSlice';
import { usePlatformService } from '../services/platform/platform.service';
import type { ConnectedPlatform } from '../services/platform/platform.service';
import DataVaultLogo from '../assets/icons/DataVaultLOGO.svg';
import DataVaultLogoIcon from '../assets/icons/Datavault Logo Container.svg';

// ── Selected Org Context ───────────────────────────────────────────────────────
// Provides the currently selected CRM org across the app.

type OrgContextValue = {
  selectedOrg: ConnectedPlatform | null;
  setSelectedOrg: (org: ConnectedPlatform) => void;
};

const OrgContext = createContext<OrgContextValue>({ selectedOrg: null, setSelectedOrg: () => {} });
export const useSelectedOrg = () => useContext(OrgContext);

// ── Icons ──────────────────────────────────────────────────────────────────────
const ico = (children: React.ReactNode) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8'
    strokeLinecap='round' strokeLinejoin='round' className='w-4 h-4 shrink-0'>
    {children}
  </svg>
);

const Icons = {
  dashboard:  () => ico(<><rect x='3' y='3' width='7' height='7' rx='1.2' /><rect x='14' y='3' width='7' height='7' rx='1.2' /><rect x='3' y='14' width='7' height='7' rx='1.2' /><rect x='14' y='14' width='7' height='7' rx='1.2' /></>),
  backup:     () => ico(<><polyline points='16 16 12 12 8 16' /><line x1='12' y1='12' x2='12' y2='21' /><path d='M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3' /></>),
  restore:    () => ico(<><polyline points='1 4 1 10 7 10' /><path d='M3.51 15a9 9 0 101.85-4.36L1 10' /></>),
  archive:    () => ico(<><polyline points='21 8 21 21 3 21 3 8' /><rect x='1' y='3' width='22' height='5' /><line x1='10' y1='12' x2='14' y2='12' /></>),
  connectors: () => ico(<><path d='M10 3H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z' /><path d='M18 3h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z' /><path d='M10 15H6a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z' /><path d='M18 15h-4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2z' /></>),
  platforms:  () => ico(<><circle cx='6' cy='6' r='2' /><circle cx='12' cy='6' r='2' /><circle cx='18' cy='6' r='2' /><circle cx='6' cy='12' r='2' /><circle cx='12' cy='12' r='2' /><circle cx='18' cy='12' r='2' /><circle cx='6' cy='18' r='2' /><circle cx='12' cy='18' r='2' /><circle cx='18' cy='18' r='2' /></>),
  storage:    () => ico(<><ellipse cx='12' cy='5' rx='9' ry='3' /><path d='M21 12c0 1.66-4 3-9 3s-9-1.34-9-3' /><path d='M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5' /></>),
  activity:   () => ico(<><polyline points='22 12 18 12 15 21 9 3 6 12 2 12' /></>),
  reports:    () => ico(<><line x1='18' y1='20' x2='18' y2='10' /><line x1='12' y1='20' x2='12' y2='4' /><line x1='6' y1='20' x2='6' y2='14' /></>),
  security:   () => ico(<><path d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' /></>),
  settings:   () => ico(<><circle cx='12' cy='12' r='3' /><path d='M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z' /></>),
  bell:       () => ico(<><path d='M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9' /><path d='M13.73 21a2 2 0 01-3.46 0' /></>),
  search:     () => ico(<><circle cx='11' cy='11' r='8' /><line x1='21' y1='21' x2='16.65' y2='16.65' /></>),
  user:       () => ico(<><path d='M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2' /><circle cx='12' cy='7' r='4' /></>),
};

// ── Nav items ──────────────────────────────────────────────────────────────────
// `permissions` is OR-checked — tab shows if user has ANY permission starting with any listed prefix.
const mainNav: { to: string; label: string; Icon: () => React.ReactElement; permissions?: string[] }[] = [
  { to: '/dashboard',          label: 'Dashboard',           Icon: Icons.dashboard,  permissions: ['dashboard']                                 },
  { to: '/backup-management',  label: 'Backup Management',   Icon: Icons.backup,     permissions: ['backup']                                    },
  { to: '/restore-center',     label: 'Restore Center',      Icon: Icons.restore,    permissions: ['restore']                                   },
  { to: '/archive-vault',      label: 'Archive Vault',       Icon: Icons.archive,    permissions: ['archival']                                  },
  { to: '/connections',        label: 'Connections',         Icon: Icons.connectors, permissions: ['sourceConnection', 'destinationConnection'] },
  { to: '/storage',            label: 'Storage',             Icon: Icons.storage,    permissions: ['storage']                                   },
  { to: '/activity-logs',      label: 'Activity Logs',       Icon: Icons.activity,   permissions: ['activitylogs']                              },
  { to: '/audit-logs',         label: 'Audit Logs',          Icon: Icons.reports,    permissions: ['activitylogs']                              },
  { to: '/reports',            label: 'Reports & Analytics', Icon: Icons.reports,    permissions: ['report']                                    },
  { to: '/settings',           label: 'Settings',            Icon: Icons.settings,   permissions: ['settings']                                  },
];

// ── Org Dropdown ──────────────────────────────────────────────────────────────

function OrgDropdown({ selectedOrg, userCrmId, onAutoSelect, onSelect }: {
  selectedOrg: ConnectedPlatform | null;
  userCrmId: string;
  onAutoSelect: (org: ConnectedPlatform) => void;
  onSelect: (org: ConnectedPlatform) => void;
}) {
  const platformService = usePlatformService();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['crm-list'],
    queryFn: () => platformService.getConnectedPlatforms(),
    staleTime: 5 * 60 * 1000,
  });

  // Auto-select on load:
  // 1. Prefer localStorage crmProfileUserId (set when user explicitly picks an org — survives reload)
  // 2. Fall back to userCrmId from profile (the org they logged in with)
  // 3. Fall back to first org
  // If localStorage key is stale (not in CRM list), remove it
  useEffect(() => {
    if (!selectedOrg && orgs.length > 0) {
      const savedUserId = localStorage.getItem('selectedOrgCrmId');
      if (savedUserId) {
        const found = orgs.find((o) => (o.crmProfile?.userId ?? o.crmProfileUserId) === savedUserId);
        if (found) { onAutoSelect(found); return; }
        localStorage.removeItem('selectedOrgCrmId');
      }
      const matched = userCrmId ? orgs.find((o) => o.crmId === userCrmId) : null;
      onAutoSelect(matched ?? orgs[0]);
    }
  }, [orgs, selectedOrg, userCrmId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const displayName = selectedOrg
    ? (selectedOrg.name || selectedOrg.crmProfile?.username || selectedOrg.contactEmail || selectedOrg.crmId)
    : 'Select Org';

  const displayEnv = selectedOrg?.environment
    ? selectedOrg.environment.charAt(0).toUpperCase() + selectedOrg.environment.slice(1).toLowerCase()
    : '';

  const singleOrg = orgs.length <= 1;

  return (
    <div ref={ref} className='relative flex-shrink-0'>
      <button
        type='button'
        onClick={() => !singleOrg && setOpen((v) => !v)}
        className='flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors'
        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', minWidth: 200, cursor: singleOrg ? 'default' : 'pointer' }}
      >
        {/* Salesforce cloud icon */}
        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 text-blue-300'>
          <path d='M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z' />
        </svg>
        <div className='flex flex-col items-start min-w-0 flex-1'>
          {isLoading ? (
            <span className='text-white/60 text-xs'>Loading orgs…</span>
          ) : (
            <>
              <span className='text-white text-xs font-semibold truncate w-full leading-tight'>{displayName}</span>
              {displayEnv && <span className='text-white/50 text-[10px] leading-tight'>{displayEnv}</span>}
            </>
          )}
        </div>
        {!singleOrg && (
          <svg width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0 text-white/60'>
            <polyline points='6 9 12 15 18 9' />
          </svg>
        )}
      </button>

      {open && orgs.length > 1 && (
        <div className='absolute left-0 top-full mt-2 z-50 bg-white rounded-xl shadow-xl overflow-hidden'
          style={{ minWidth: 280, border: '1px solid #E2E8F0' }}>
          <div className='px-3 py-2 border-b border-gray-100'>
            <p className='text-[10px] font-semibold text-gray-400 uppercase tracking-wider'>Connected Orgs</p>
          </div>
          <div className='max-h-64 overflow-y-auto'>
            {orgs.map((org) => {
              const isActive = org.crmId === selectedOrg?.crmId;
              const label = org.name || org.crmProfile?.username || org.contactEmail || org.crmId;
              const env = org.environment
                ? org.environment.charAt(0).toUpperCase() + org.environment.slice(1).toLowerCase()
                : '';
              return (
                <button
                  key={org.crmId}
                  type='button'
                  onClick={() => { onSelect(org); setOpen(false); }}
                  className='w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors'
                  style={{ background: isActive ? '#1B3A8A' : undefined }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = '#F1F5F9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isActive ? '#1B3A8A' : ''; }}
                >
                  <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full'
                    style={{ background: isActive ? 'rgba(255,255,255,0.2)' : '#F1F5F9' }}>
                    <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke={isActive ? '#fff' : '#64748B'} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z' />
                    </svg>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className={`text-sm font-semibold truncate ${isActive ? 'text-white' : 'text-gray-800'}`}>{label}</p>
                    <div className='flex items-center gap-1.5 mt-0.5'>
                      {env && <span className={`text-[10px] ${isActive ? 'text-white/60' : 'text-gray-400'}`}>{env}</span>}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : org.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {org.status}
                      </span>
                    </div>
                  </div>
                  {isActive && (
                    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#fff' strokeWidth='2.5' strokeLinecap='round' strokeLinejoin='round' className='flex-shrink-0'>
                      <polyline points='20 6 9 17 4 12' />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Layout ────────────────────────────────────────────────────────────────

export default function MainLayout() {
  const { logout, hasPermission, setCrmUserId, userCrmId, refreshProfile } = useAuth();
  const visibleNav = mainNav.filter(({ permissions }) => !permissions || permissions.some((p) => hasPermission(p)));
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState<ConnectedPlatform | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const handleSelectOrg = async (org: ConnectedPlatform) => {
    if (org.crmId === selectedOrg?.crmId) return;
    setSelectedOrg(org);
    localStorage.setItem('selectedOrgCrmId', org.crmProfile?.userId ?? org.crmProfileUserId ?? '');
    // Set crmUserId first — updates module-level ref immediately so the
    // refreshProfile call below sends x-crm-userid with the new org's userId
    setCrmUserId(org.crmProfile?.userId ?? org.crmProfileUserId ?? '');
    await refreshProfile();
    navigate('/', { replace: true });
  };

  useEffect(() => {
    dispatch(fetchPlatforms());
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  async function handleLogout() {
    setIsUserMenuOpen(false);
    await logout();
  }

  return (
    <div className='flex h-screen w-full min-w-0 overflow-hidden'>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`flex flex-col shrink-0 transition-all duration-300 ${isSidebarOpen ? 'w-56' : 'w-16'}`} style={{ background: '#1B3A8A' }}>

        {/* Logo */}
        {isSidebarOpen && (
          <div className='flex items-center gap-2.5 px-4 py-3 border-b border-white/10 justify-between'>
            <img src={DataVaultLogo} alt='DataVault' className='h-8 w-auto object-contain' />
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className='p-1 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0'
              title='Collapse sidebar'
            >
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
              </svg>
            </button>
          </div>
        )}

        {/* Collapsed Logo + Expand Button */}
        {!isSidebarOpen && (
          <div className='flex items-center justify-between px-2 py-3 border-b border-white/10'>
            <img src={DataVaultLogoIcon} alt='DataVault' className='h-6 w-6 object-contain flex-shrink-0' />
            <button
              onClick={() => setIsSidebarOpen(true)}
              className='p-0.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors flex-shrink-0'
              title='Expand sidebar'
            >
              <svg className='w-3.5 h-3.5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
              </svg>
            </button>
          </div>
        )}

        {/* Nav */}
        <nav className='flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto'>
          {visibleNav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  isSidebarOpen
                    ? 'flex items-center gap-2.5 px-3 py-2'
                    : 'flex items-center justify-center px-1 py-3',
                  'rounded-lg text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/8',
                ].join(' ')
              }
              title={!isSidebarOpen ? label : undefined}
            >
              <Icon />
              {isSidebarOpen && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Right: header + content ──────────────────────────────────────────── */}
      <div className='flex min-w-0 flex-1 flex-col w-full'>

        {/* Header */}
        <header className='h-14 flex items-center gap-4 px-6 shrink-0' style={{ background: '#1B3A8A' }}>

          {/* Search */}
          <div className='flex-1 max-w-md relative'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
              <Icons.search />
            </span>
            <input
              type='text'
              placeholder='Search backups, platforms...'
              className='w-full pl-9 pr-4 py-2 text-sm bg-white border border-white rounded-lg outline-none focus:ring-2 focus:ring-white/40 placeholder:text-gray-400 text-gray-800'
            />
          </div>

          <div className='flex-1' />

          {/* Org selector */}
          <OrgDropdown
            selectedOrg={selectedOrg}
            userCrmId={userCrmId}
            onAutoSelect={(org) => {
              setSelectedOrg(org);
              setCrmUserId(org.crmProfile?.userId ?? org.crmProfileUserId ?? '');
            }}
            onSelect={handleSelectOrg}
          />

          {/* Icon buttons */}
          <button
            onClick={() => navigate('/notifications')}
            className='relative cursor-pointer p-2 text-white/70 transition hover:bg-white/10 hover:text-white rounded-lg'
          >
            <Icons.bell />
            <span className='absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-400 rounded-full' />
          </button>
          <button className='cursor-pointer p-2 text-white/70 transition hover:bg-white/10 hover:text-white rounded-lg'>
            <Icons.settings />
          </button>
          <div className='relative' ref={userMenuRef}>
            <button
              type='button'
              onClick={() => setIsUserMenuOpen((value) => !value)}
              className='flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700'
            >
              <Icons.user />
            </button>

            {isUserMenuOpen && (
              <div className='absolute right-0 top-11 z-20 w-48 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg'>
                <Link
                  to='/profile'
                  onClick={() => setIsUserMenuOpen(false)}
                  className='flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50'
                >
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4 shrink-0'>
                    <path d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' />
                    <circle cx='12' cy='7' r='4' />
                  </svg>
                  My Profile
                </Link>

                {/* <Link
                  to='/change-password'
                  onClick={() => setIsUserMenuOpen(false)}
                  className='flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50'
                >
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4 shrink-0'>
                    <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
                    <path d='M7 11V7a5 5 0 0 1 10 0v4' />
                  </svg>
                  Change Password
                </Link> */}

                <div className='my-1 border-t border-gray-100' />

                <button
                  type='button'
                  onClick={handleLogout}
                  className='flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50'
                >
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4 shrink-0'>
                    <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
                    <polyline points='16 17 21 12 16 7' />
                    <line x1='21' y1='12' x2='9' y2='12' />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className='flex-1 w-full overflow-hidden bg-gray-50 min-h-0 flex flex-col'>
          <div className='flex-1 min-h-0 flex flex-col overflow-y-auto'>
            <OrgContext.Provider value={{ selectedOrg, setSelectedOrg: handleSelectOrg }}>
              <Outlet />
            </OrgContext.Provider>
          </div>
        </main>
      </div>
    </div>
  );
}

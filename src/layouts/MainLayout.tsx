import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppDispatch } from '../store/hooks';
import { fetchPlatforms } from '../store/slices/platformsSlice';

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
const mainNav = [
  { to: '/',                   label: 'Dashboard',           Icon: Icons.dashboard  },
  { to: '/backup-management',  label: 'Backup Management',   Icon: Icons.backup     },
  { to: '/restore-center',     label: 'Restore Center',      Icon: Icons.restore    },
  { to: '/archive-vault',      label: 'Archive Vault',       Icon: Icons.archive    },
  { to: '/connections',         label: 'Connections',          Icon: Icons.connectors },
  { to: '/storage',            label: 'Storage & Retention', Icon: Icons.storage    },
  { to: '/activity-logs',      label: 'Activity Logs',       Icon: Icons.activity   },
  { to: '/reports',            label: 'Reports & Analytics', Icon: Icons.reports    },
  { to: '/security',           label: 'Security & Compliance', Icon: Icons.security },
  { to: '/settings',           label: 'Settings', Icon: Icons.settings },
];

export default function MainLayout() {
  const { logout } = useAuth();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

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
      <aside className='w-56 flex flex-col shrink-0' style={{ background: '#1B3A8A' }}>

        {/* Logo */}
        <div className='flex items-center gap-2.5 px-4 py-4 border-b border-white/10'>
          <div className='w-8 h-8 bg-blue-500 rounded-lg rotate-45 flex items-center justify-center shrink-0'>
            <span className='-rotate-45 text-white text-[10px] font-bold'>DV</span>
          </div>
          <div className='leading-tight'>
            <p className='text-white text-sm font-bold'>360 DataVault</p>
            <p className='text-white/50 text-[10px]'>Backup Platform</p>
          </div>
        </div>

        {/* Nav */}
        <nav className='flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto'>
          {mainNav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/8',
                ].join(' ')
              }
            >
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* ── Right: header + content ──────────────────────────────────────────── */}
      <div className='flex min-w-0 flex-1 flex-col w-full'>

        {/* Header */}
        <header className='h-14 bg-white border-b border-gray-200 flex items-center gap-4 px-6 shrink-0'>

          {/* Search */}
          <div className='flex-1 max-w-md relative'>
            <span className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400'>
              <Icons.search />
            </span>
            <input
              type='text'
              placeholder='Search backups, platforms...'
              className='w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 placeholder:text-gray-400'
            />
          </div>

          <div className='flex-1' />

          {/* Icon buttons */}
          <button
            onClick={() => navigate('/notifications')}
            className='relative cursor-pointer p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 rounded-lg'
          >
            <Icons.bell />
            <span className='absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full' />
          </button>
          <button className='cursor-pointer p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 rounded-lg'>
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

                <Link
                  to='/change-password'
                  onClick={() => setIsUserMenuOpen(false)}
                  className='flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50'
                >
                  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' className='h-4 w-4 shrink-0'>
                    <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
                    <path d='M7 11V7a5 5 0 0 1 10 0v4' />
                  </svg>
                  Change Password
                </Link>

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
        <main className='flex-1 w-full overflow-auto bg-gray-50 p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

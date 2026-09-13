import { NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

const sections = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/courses', label: 'Courses' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/profile', label: 'Profile' },
];

export const Sidebar = (): JSX.Element => (
  <aside className="hidden w-56 shrink-0 border-r border-border p-4 md:block">
    <nav>
      <ul className="flex flex-col gap-1 text-sm">
        {sections.map((section) => (
          <li key={section.to}>
            <NavLink
              to={section.to}
              className={({ isActive }) =>
                cn('block rounded-md px-3 py-2 text-muted-foreground hover:bg-muted', {
                  'bg-muted text-foreground': isActive,
                })
              }
            >
              {section.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  </aside>
);

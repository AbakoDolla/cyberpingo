import { Link, NavLink } from 'react-router-dom';

import { cn } from '@/lib/utils';

const links = [
  { to: '/courses', label: 'Courses' },
  { to: '/leaderboard', label: 'Leaderboard' },
];

export const Navbar = (): JSX.Element => (
  <header className="border-b border-border bg-background/80 backdrop-blur">
    <nav className="container flex h-16 items-center justify-between">
      <Link to="/" className="text-lg font-semibold tracking-tight">
        Cyber<span className="text-primary">Pingo</span>
      </Link>

      <ul className="flex items-center gap-6 text-sm">
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                cn('text-muted-foreground transition-colors hover:text-foreground', {
                  'text-foreground': isActive,
                })
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  </header>
);

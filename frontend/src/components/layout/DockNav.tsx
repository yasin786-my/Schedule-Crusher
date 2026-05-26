import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, CalendarPlus, Settings } from 'lucide-react';

const links = [
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { name: 'Planner', path: '/planner', icon: CalendarPlus },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export const DockNav: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 px-3 py-2 bg-surface-900/90 backdrop-blur-xl border border-surface-700/50 rounded-2xl shadow-2xl">
        {links.map(({ name, path, icon: Icon }) => {
          const active = location.pathname.startsWith(path);
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-colors ${
                active ? 'bg-primary-600/30 text-primary-300' : 'text-surface-400 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

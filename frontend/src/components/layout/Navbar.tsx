import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BlurText } from '../reactbits/BlurText';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Planner', path: '/planner' },
    { name: 'Settings', path: '/settings' },
  ];

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-surface-200/10 bg-surface-950/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center font-bold shadow-lg shadow-primary-500/30">
                SC
              </div>
              <BlurText text="Schedule Crusher" delay={50} className="text-xl font-bold tracking-tight hidden sm:block" />
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {navLinks.map((link) => {
                  const isActive = location.pathname.startsWith(link.path);
                  return (
                    <Link
                      key={link.name}
                      to={link.path}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive 
                          ? 'bg-surface-800 text-white' 
                          : 'text-surface-300 hover:bg-surface-800/50 hover:text-white'
                      }`}
                    >
                      {link.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-surface-300">
              <div className="w-8 h-8 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center uppercase font-bold text-primary-400">
                {user?.username?.[0] || 'U'}
              </div>
              <span>{user?.username}</span>
            </div>
            <button 
              onClick={logout}
              className="text-sm px-3 py-1.5 rounded-lg border border-surface-700 hover:bg-surface-800 transition-colors text-surface-300 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

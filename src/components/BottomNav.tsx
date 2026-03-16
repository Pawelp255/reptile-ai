import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, ListChecks, PlusCircle, BookOpen, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { lightHaptic } from '@/lib/native/haptics';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Today', icon: Calendar },
  { path: '/reptiles', label: 'My Reptiles', icon: ListChecks },
  { path: '/add-event', label: 'Add Event', icon: PlusCircle },
  { path: '/journal', label: 'Journal', icon: BookOpen },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main">
      <div className="flex items-center justify-around h-full min-h-[2.75rem]">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'bottom-nav-item flex-1 rounded-lg transition-colors duration-200 active:scale-[0.96]',
                active && 'active'
              )}
              aria-current={active ? 'page' : undefined}
              aria-label={item.label}
              onClick={() => { lightHaptic(); }}
            >
              <span className="relative flex items-center justify-center w-8 h-8">
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="bottom-nav-icon-wrap absolute inset-0 rounded-full"
                    transition={{ type: 'tween', duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                  />
                )}
                <span className={cn(
                  'relative z-10 flex items-center justify-center',
                  active ? 'text-nav-active' : 'text-nav-inactive'
                )}>
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                </span>
              </span>
              <span className={cn(
                'text-[11px] leading-tight max-w-[4rem] truncate text-center',
                active ? 'text-nav-active' : 'text-nav-inactive'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

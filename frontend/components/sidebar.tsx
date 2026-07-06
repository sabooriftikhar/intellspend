'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BookOpen,
  Wallet,
  Receipt,
  MessageSquare,
  Settings,
  LogOut,
  TrendingUp,
  Tag,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/transactions', icon: ArrowLeftRight,  label: 'Transactions' },
  { href: '/books',        icon: BookOpen,         label: 'Books' },
  { href: '/accounts',     icon: Wallet,           label: 'Accounts' },
  { href: '/categories',   icon: Tag,              label: 'Categories' },
  { href: '/bills',        icon: Receipt,          label: 'Bills' },
  { href: '/chat',         icon: MessageSquare,    label: 'Chat' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : 'IS';

  return (
    <aside className="w-60 flex-shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col hidden md:flex h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <TrendingUp className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-base font-bold text-foreground tracking-tight">IntellSpend</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Menu
        </p>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
            pathname === '/settings'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground text-left"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>

        {/* User chip */}
        {user && (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 mt-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
              {initials}
            </div>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
      </div>
    </aside>
  );
}

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Calendar, Users, Stethoscope, Settings,
  LogOut, Moon, Sun, Bell, Menu, X, Activity, Pill,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore, useThemeStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Role } from '@/types';

const navItems: Record<Role, { label: string; href: string; icon: typeof LayoutDashboard }[]> = {
  ADMIN: [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Doctors', href: '/admin/doctors', icon: Stethoscope },
    { label: 'Patients', href: '/admin/patients', icon: Users },
    { label: 'Appointments', href: '/admin/appointments', icon: Calendar },
    { label: 'Leaves', href: '/admin/leaves', icon: Activity },
    { label: 'AI Logs', href: '/admin/ai-logs', icon: Activity },
    { label: 'Notifications', href: '/admin/notifications', icon: Bell },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: Settings },
  ],
  DOCTOR: [
    { label: 'Dashboard', href: '/doctor', icon: LayoutDashboard },
    { label: 'Today', href: '/doctor/today', icon: Calendar },
    { label: 'Patients', href: '/doctor/patients', icon: Users },
    { label: 'Appointments', href: '/doctor/appointments', icon: Calendar },
    { label: 'Calendar', href: '/doctor/calendar', icon: Calendar },
    { label: 'Profile', href: '/doctor/profile', icon: Settings },
  ],
  PATIENT: [
    { label: 'Dashboard', href: '/patient', icon: LayoutDashboard },
    { label: 'Find Doctors', href: '/patient/doctors', icon: Stethoscope },
    { label: 'Appointments', href: '/patient/appointments', icon: Calendar },
    { label: 'Medications', href: '/patient/medications', icon: Pill },
    { label: 'Profile', href: '/patient/profile', icon: Settings },
  ],
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const items = user ? navItems[user.role] : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 transform border-r bg-card transition-transform lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-healthcare">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-teal-700 dark:text-teal-400">HealthCare+</span>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-4">
          {items.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-card/80 px-6 backdrop-blur-lg">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" onClick={toggle}>
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          <div className="hidden text-sm sm:block">
            <p className="font-medium">{user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </header>
        <main className="flex-1 p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

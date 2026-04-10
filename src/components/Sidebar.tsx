import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  Heart,
  Gift,
  Receipt,
  Settings,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Bell,
  BarChart3,
  User,
  LogOut,
  Clock,
  MapPin,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import { eventsApi } from '../services/api';
import type { Event } from '../services/api';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Members', path: '/members' },
  { icon: User, label: 'Visitors', path: '/visitors' },
  { icon: Calendar, label: 'Events', path: '/events' },
  { icon: Heart, label: 'Attendance', path: '/attendance' },
  { icon: Gift, label: 'Donations', path: '/donations' },
  { icon: Receipt, label: 'Expenses', path: '/expenses' },
  { icon: BookOpen, label: 'Sermons', path: '/sermons' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: Bell, label: 'Announcements', path: '/announcements' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

function useNextService() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => {}, 0);

    // Debounce the fetch to prevent concurrent requests
    const fetchEvent = async () => {
      try {
        const res = await eventsApi.getEvents({ upcoming: true, limit: 5 });
        if (cancelled) return;
        if (res.success && res.data && res.data.length > 0) {
          // Pick the soonest upcoming event
          const sorted = [...res.data].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          setEvent(sorted[0]);
        } else {
          setEvent(null);
        }
      } catch {
        if (!cancelled) setEvent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    // Delay fetch slightly to let auth settle
    clearTimeout(timeoutId);
    const actualTimeoutId = setTimeout(fetchEvent, 100);

    return () => {
      cancelled = true;
      clearTimeout(actualTimeoutId);
    };
  }, []);

  return { event, loading };
}

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUI();
  const { user, signOut, isAdminOrStaff, isAdmin, isStaff } = useAuth();
  const navigate = useNavigate();
  const { event: nextService, loading: serviceLoading } = useNextService();

  // Close sidebar on mobile when navigating
  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // AppRoutes will naturally redirect to /login because session becomes null,
      // but explicit navigation ensures it happens immediately if context hasn't updated yet.
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Filter menu items based on user role
  const allowedMenuItems = menuItems.filter(item => {
    if (item.label === 'Settings') return isAdmin;
    if (isAdmin) return true;
    if (isStaff) {
      return [
        'Dashboard',
        'Events',
        'Attendance',
        'Profile',
        'Visitors',
        'Announcements',
      ].includes(item.label);
    }
    if (isAdminOrStaff) return true;
    return ['Profile', 'Events', 'Sermons'].includes(item.label);
  });

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          aria-label="Close navigation menu"
          onClick={toggleSidebar}
        />
      )}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 256 : 80 }}
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950 text-white z-50 shadow-2xl transform transition-transform duration-300 flex flex-col lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
      {/* Logo */}
      <div className="h-16 flex-none flex items-center justify-between px-4 border-b border-stone-700/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shrink-0">
            <img src="/logo.svg" alt="Greater Works City Church" className="w-full h-full object-cover" />
          </div>
          <motion.span
            initial={false}
            animate={{ opacity: sidebarOpen ? 1 : 0, width: sidebarOpen ? 'auto' : 0 }}
            className="font-serif font-bold text-lg whitespace-nowrap overflow-hidden"
          >
            Greater Works City Church
          </motion.span>
        </div>
        <button
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={sidebarOpen}
          className="p-2 rounded-lg hover:bg-stone-700/50 transition-colors shrink-0"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="mt-6 px-3 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-transparent pb-32">
        {allowedMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-2 transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30'
                  : 'hover:bg-stone-700/50 text-stone-400 hover:text-white'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && (
              <span className="font-medium text-sm">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: account + sign out */}
      <div className="absolute bottom-6 left-3 right-3 space-y-2 bg-gradient-to-t from-stone-900 via-stone-900 to-transparent pt-4">
        {sidebarOpen && user?.email && (
          <p className="truncate px-1 text-xs text-stone-500" title={user.email}>
            {user.email}
          </p>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-stone-400 transition-colors hover:bg-stone-700/50 hover:text-white ${
            sidebarOpen ? '' : 'justify-center px-0'
          }`}
          title="Sign out"
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {sidebarOpen && <span className="text-sm font-medium">Sign out</span>}
        </button>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2">
          {sidebarOpen ? (
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="w-full text-left rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4 hover:from-amber-500/20 hover:to-orange-500/20 transition-colors"
            >
              <p className="mb-2 text-xs text-stone-400">Next Service</p>
              {serviceLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                  <span className="text-xs text-stone-500">Loading…</span>
                </div>
              ) : nextService ? (
                <>
                  <p className="font-semibold text-amber-400 truncate">{nextService.title}</p>
                  <div className="mt-1.5 space-y-0.5">
                    <p className="flex items-center gap-1.5 text-xs text-stone-400">
                      <Calendar className="w-3 h-3 shrink-0 text-amber-500/70" />
                      {new Date(nextService.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    {nextService.time && (
                      <p className="flex items-center gap-1.5 text-xs text-stone-400">
                        <Clock className="w-3 h-3 shrink-0 text-amber-500/70" />
                        {nextService.time}
                      </p>
                    )}
                    {nextService.location && (
                      <p className="flex items-center gap-1.5 text-xs text-stone-400 truncate">
                        <MapPin className="w-3 h-3 shrink-0 text-amber-500/70" />
                        {nextService.location}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-stone-500">No upcoming events</p>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="flex items-center justify-center w-full rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3 hover:from-amber-500/20 hover:to-orange-500/20 transition-colors"
              title={
                serviceLoading
                  ? 'Loading next service…'
                  : nextService
                  ? `${nextService.title} · ${new Date(nextService.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}${nextService.time ? ' · ' + nextService.time : ''}${nextService.location ? ' · ' + nextService.location : ''}`
                  : 'No upcoming events'
              }
              aria-label="Next service"
            >
              {serviceLoading ? (
                <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
              ) : (
                <Calendar className="h-5 w-5 text-amber-400" />
              )}
            </button>
          )}
        </motion.div>
      </div>
      </motion.aside>
    </>
  );
}

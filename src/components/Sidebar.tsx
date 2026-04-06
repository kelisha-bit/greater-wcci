import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  Heart,
  Gift,
  Settings,
  ChevronLeft,
  ChevronRight,
  Church,
  BookOpen,
  Bell,
  BarChart3,
  User,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Members', path: '/members' },
  { icon: Calendar, label: 'Events', path: '/events' },
  { icon: Heart, label: 'Attendance', path: '/attendance' },
  { icon: Gift, label: 'Donations', path: '/donations' },
  { icon: BookOpen, label: 'Sermons', path: '/sermons' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: Bell, label: 'Announcements', path: '/announcements' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUI();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

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
        className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-stone-800 via-stone-900 to-stone-950 text-white z-50 shadow-2xl transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-stone-700/50">
        <motion.div
          initial={false}
          animate={{ opacity: sidebarOpen ? 1 : 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Church className="w-6 h-6 text-white" />
          </div>
          {sidebarOpen && (
            <span className="font-serif font-bold text-lg">Grace Church</span>
          )}
        </motion.div>
        <button
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={sidebarOpen}
          className="p-2 rounded-lg hover:bg-stone-700/50 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-5 h-5" />
          ) : (
            <ChevronRight className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Menu Items */}
      <nav className="mt-6 px-3">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
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
      <div className="absolute bottom-6 left-3 right-3 space-y-2">
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
            <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-4">
              <p className="mb-2 text-xs text-stone-400">Next Service</p>
              <p className="font-semibold text-amber-400">Sunday, 10:00 AM</p>
              <p className="mt-1 text-xs text-stone-500">Main Sanctuary</p>
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 to-orange-500/10 p-3"
              title="Next Service: Sunday, 10:00 AM • Main Sanctuary"
              aria-label="Next Service: Sunday, 10:00 AM, Main Sanctuary"
            >
              <Calendar className="h-5 w-5 text-amber-400" />
            </div>
          )}
        </motion.div>
      </div>
      </motion.aside>
    </>
  );
}

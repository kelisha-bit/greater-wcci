import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Users,
  Calendar,
  Gift,
  User,
  MoreHorizontal,
  Heart,
  Receipt,
  BookOpen,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const primaryNav = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Users, label: 'Members', path: '/members' },
  { icon: Calendar, label: 'Events', path: '/events' },
  { icon: Gift, label: 'Donations', path: '/donations' },
];

const moreNav = [
  { icon: User, label: 'Visitors', path: '/visitors' },
  { icon: Heart, label: 'Attendance', path: '/attendance' },
  { icon: Receipt, label: 'Expenses', path: '/expenses' },
  { icon: BookOpen, label: 'Sermons', path: '/sermons' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: Bell, label: 'Announcements', path: '/announcements' },
  { icon: User, label: 'Profile', path: '/profile' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function BottomNav() {
  const [showMore, setShowMore] = useState(false);
  const { signOut, isAdmin, isStaff, isAdminOrStaff } = useAuth();
  const navigate = useNavigate();

  const filteredMore = moreNav.filter(item => {
    if (item.label === 'Settings') return isAdmin;
    if (isAdmin) return true;
    if (isStaff) return ['Visitors', 'Attendance', 'Announcements', 'Profile'].includes(item.label);
    if (isAdminOrStaff) return true;
    return ['Profile', 'Sermons'].includes(item.label);
  });

  const filteredPrimary = primaryNav.filter(item => {
    if (isAdmin) return true;
    if (isStaff) return ['Home', 'Events'].includes(item.label);
    if (isAdminOrStaff) return true;
    return ['Home', 'Events'].includes(item.label);
  });

  const handleSignOut = async () => {
    setShowMore(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* More drawer overlay */}
      {showMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* More drawer */}
      {showMore && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="lg:hidden fixed bottom-16 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl border-t border-stone-200 pb-safe"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <span className="font-semibold text-stone-800">More</span>
            <button
              onClick={() => setShowMore(false)}
              className="p-1.5 rounded-lg hover:bg-stone-100"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 p-3">
            {filteredMore.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setShowMore(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-amber-50 text-amber-600'
                      : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </NavLink>
            ))}
            <button
              onClick={handleSignOut}
              className="flex flex-col items-center gap-1 p-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-xs font-medium">Sign out</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Bottom nav bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-stone-200 pb-safe">
        <div className="flex items-center justify-around h-16 px-2">
          {filteredPrimary.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px] transition-colors ${
                  isActive
                    ? 'text-amber-600'
                    : 'text-stone-400 hover:text-stone-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-amber-50' : ''}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setShowMore(v => !v)}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[56px] transition-colors ${
              showMore ? 'text-amber-600' : 'text-stone-400 hover:text-stone-700'
            }`}
          >
            <div className={`p-1.5 rounded-lg transition-colors ${showMore ? 'bg-amber-50' : ''}`}>
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

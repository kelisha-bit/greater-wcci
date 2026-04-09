import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Menu, User, X } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useCurrentUserProfile } from '../hooks/useData';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { toggleSidebar } = useUI();
  const navigate = useNavigate();
  const { data: profile } = useCurrentUserProfile();
  const [imageError, setImageError] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profile?.profileImageUrl]);

  return (
    <header className="h-16 bg-white/60 backdrop-blur-xl border-b border-stone-200/50 sticky top-0 z-40">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {/* Hamburger — only on desktop (mobile uses bottom nav) */}
          <button
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
            className="hidden lg:flex p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-stone-600" />
          </button>

          {/* Mobile: logo / page title area */}
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden shadow">
              <img src="/logo.svg" alt="Greater Works City Church" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif font-bold text-stone-800 text-sm">GWCC</span>
          </div>

          {/* Desktop search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search members, events..."
              aria-label="Search members, events"
              className="pl-10 pr-4 py-2.5 w-56 lg:w-80 bg-stone-100/80 border border-stone-200/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30 transition-all"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Mobile search toggle */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setMobileSearchOpen(v => !v)}
            aria-label="Toggle search"
            className="md:hidden p-2.5 rounded-xl bg-stone-100/80 hover:bg-stone-200/80 transition-colors"
          >
            {mobileSearchOpen ? (
              <X className="w-5 h-5 text-stone-600" />
            ) : (
              <Search className="w-5 h-5 text-stone-600" />
            )}
          </motion.button>

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="View notifications"
            className="relative p-2.5 rounded-xl bg-stone-100/80 hover:bg-stone-200/80 transition-colors"
          >
            <Bell className="w-5 h-5 text-stone-600" aria-hidden="true" />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" aria-label="New notifications" />
          </motion.button>

          {/* User Profile */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="User profile menu"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 sm:gap-3 sm:pl-3 sm:pr-4 py-2 rounded-xl sm:bg-gradient-to-r sm:from-amber-50 sm:to-orange-50 sm:border sm:border-amber-200/50 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md overflow-hidden">
              {profile?.profileImageUrl && !imageError ? (
                <img
                  src={profile.profileImageUrl}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <User className="w-5 h-5 text-white" aria-hidden="true" />
              )}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-stone-800">{profile?.name || 'Guest'}</p>
              <p className="text-xs text-stone-500">{profile?.role || 'Member'}</p>
            </div>
          </motion.button>
        </div>
      </div>

      {/* Mobile search bar — slides down */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-stone-200/50 bg-white/80 backdrop-blur-xl"
          >
            <div className="px-4 py-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" aria-hidden="true" />
                <input
                  type="search"
                  placeholder="Search members, events..."
                  aria-label="Search members, events"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-100/80 border border-stone-200/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30 transition-all"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

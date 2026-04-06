import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Bell, Menu, User } from 'lucide-react';
import { useUI } from '../contexts/UIContext';
import { useCurrentUserProfile } from '../hooks/useData';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { toggleSidebar } = useUI();
  const navigate = useNavigate();
  const { data: profile } = useCurrentUserProfile();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [profile?.profileImageUrl]);

  
  return (
    <header className="h-16 bg-white/60 backdrop-blur-xl border-b border-stone-200/50 sticky top-0 z-40">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <Menu className="w-5 h-5 text-stone-600" />
          </button>

          {/* Search */}
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
        <div className="flex items-center gap-3">
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
            aria-label="User profile menu"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 pl-3 pr-4 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 cursor-pointer"
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
    </header>
  );
}

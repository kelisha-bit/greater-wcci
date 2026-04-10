import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Heart, Gift, HandHeart, TrendingUp, TrendingDown } from 'lucide-react';
import { statCardColors } from '../constants/colors';

interface StatsCardProps {
  title: string;
  value: number;
  change: number;
  icon: 'users' | 'heart' | 'gift' | 'hand-heart';
  color: 'amber' | 'rose' | 'emerald' | 'blue';
  prefix?: string;
  onClick?: () => void;
}

const icons = {
  users: Users,
  heart: Heart,
  gift: Gift,
  'hand-heart': HandHeart,
};

const getNavigationPath = (title: string): string => {
  switch (title) {
    case 'Total Members':
      return '/members';
    case 'Sunday Attendance':
      return '/attendance';
    case 'Monthly Donations':
      return '/donations';
    case 'Active Volunteers':
      return '/members?filter=volunteers';
    default:
      return '/';
  }
};

export default function StatsCard({ title, value, change, icon, color, prefix = '', onClick }: StatsCardProps) {
  const navigate = useNavigate();
  const Icon = icons[icon];
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest).toLocaleString());
  const [displayValue, setDisplayValue] = useState('0');

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 2,
      ease: 'easeOut',
    });

    const unsubscribe = rounded.on('change', (latest) => {
      setDisplayValue(latest);
    });

    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value, count, rounded]);

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(getNavigationPath(title));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`relative bg-gradient-to-br ${statCardColors[color].bg} border border-white/50 rounded-2xl p-6 shadow-xl shadow-stone-200/50 cursor-pointer hover:shadow-2xl transition-all duration-300 overflow-hidden group`}
    >
      {/* Decorative gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${statCardColors[color].gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      
      {/* Animated background circle */}
      <motion.div
        className={`absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br ${statCardColors[color].gradient} opacity-10 group-hover:scale-150 transition-transform duration-500`}
      />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-600 mb-2 uppercase tracking-wide">{title}</p>
            <p className="text-4xl font-bold text-stone-900 tracking-tight">
              {prefix}{displayValue}
            </p>
          </div>
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
            className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${statCardColors[color].gradient} flex items-center justify-center shadow-lg shadow-${color}-200/50`}
          >
            <Icon className="w-7 h-7 text-white" />
          </motion.div>
        </div>

        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
            change >= 0 
              ? 'bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-200/50' 
              : 'bg-rose-100 text-rose-700 shadow-sm shadow-rose-200/50'
          }`}>
            {change >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {Math.abs(change)}%
          </div>
          <span className="text-xs text-stone-500 font-medium">vs last month</span>
        </div>
      </div>
      
      {/* Hover indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-stone-300 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </motion.div>
  );
}

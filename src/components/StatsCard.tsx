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
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`bg-gradient-to-br ${statCardColors[color].bg} border rounded-2xl p-6 shadow-lg shadow-stone-200/50 cursor-pointer hover:shadow-xl transition-all duration-200`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-stone-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-stone-800">
            {prefix}{displayValue}
          </p>
        </div>
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${statCardColors[color].gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
          change >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
        }`}>
          {change >= 0 ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {Math.abs(change)}%
        </div>
        <span className="text-xs text-stone-500">vs last month</span>
      </div>
    </motion.div>
  );
}

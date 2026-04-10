import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cake, Gift } from 'lucide-react';
import { membersApi } from '../services/api';
import type { UpcomingBirthday } from '../services/api';

export default function UpcomingBirthdays() {
  const navigate = useNavigate();
  const [items, setItems] = useState<UpcomingBirthday[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await membersApi.getUpcomingBirthdays({
          limit: 8,
          maxDaysAhead: 60,
        });
        if (!cancelled && res.success && res.data) {
          setItems(res.data);
        } else if (!cancelled) {
          setItems([]);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subtitle = (daysUntil: number) => {
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    return `In ${daysUntil} days`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="h-full bg-white/90 backdrop-blur-xl rounded-3xl border border-stone-200/60 p-6 shadow-xl shadow-stone-200/40 min-h-[200px] flex flex-col"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-serif font-bold text-stone-800">
            Upcoming birthdays
          </h3>
          <p className="text-sm text-stone-500">Next 60 days</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/members')}
          className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
        >
          Members
        </button>
      </div>

      <div className="flex-1 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse h-16 bg-stone-100 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-stone-500 py-6 text-center">
            No birthdays in the next 60 days, or dates aren&apos;t set on member
            profiles.
          </p>
        ) : (
          items.map((row, index) => (
            <motion.button
              key={row.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => navigate(`/members/${row.id}`)}
              className="w-full text-left p-3 rounded-xl bg-gradient-to-r from-rose-50/80 to-transparent border border-stone-100 hover:border-rose-200/60 transition-all flex items-center gap-3"
            >
              {row.profileImageUrl ? (
                <img
                  src={row.profileImageUrl}
                  alt=""
                  className="w-11 h-11 rounded-full object-cover border border-stone-200 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-rose-200 to-amber-200 flex items-center justify-center shrink-0">
                  <Cake className="w-5 h-5 text-rose-800/70" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-800 truncate">{row.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-rose-500" />
                    Turns {row.turningAge}
                  </span>
                  <span>{row.nextBirthdayLabel}</span>
                  <span className="text-rose-600 font-medium">
                    {subtitle(row.daysUntil)}
                  </span>
                </div>
              </div>
            </motion.button>
          ))
        )}
      </div>
    </motion.div>
  );
}

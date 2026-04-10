import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Music, BookOpen, Heart, Utensils, Briefcase } from 'lucide-react';
import { ministriesApi } from '../services/api';

const iconByKeyword: { test: (n: string) => boolean; icon: typeof Music }[] = [
  { test: (n) => /worship|music/i.test(n), icon: Music },
  { test: (n) => /children|kid|nursery/i.test(n), icon: Heart },
  { test: (n) => /bible|study|education/i.test(n), icon: BookOpen },
  { test: (n) => /kitchen|food|meal/i.test(n), icon: Utensils },
  { test: (n) => /outreach|mission|evangel/i.test(n), icon: Users },
  { test: (n) => /admin|office|finance/i.test(n), icon: Briefcase },
];

function iconForName(name: string) {
  for (const { test, icon } of iconByKeyword) {
    if (test(name)) return icon;
  }
  return Users;
}

const defaultGradients = [
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-purple-400 to-violet-500',
  'from-slate-400 to-gray-500',
];

export default function MinistryGroups() {
  const navigate = useNavigate();
  const [ministries, setMinistries] = useState<
    { name: string; members: number; icon: typeof Users; color: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await ministriesApi.listWithMemberCounts();
        if (cancelled) return;
        if (res.success && res.data) {
          const sorted = [...res.data].sort((a, b) => b.memberCount - a.memberCount);
          setMinistries(
            sorted.slice(0, 8).map((m, i) => ({
              name: m.name,
              members: m.memberCount,
              icon: iconForName(m.name),
              color: defaultGradients[i % defaultGradients.length],
            }))
          );
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxMembers = Math.max(...ministries.map((m) => m.members), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="h-full bg-white/90 backdrop-blur-xl rounded-3xl border border-stone-200/60 p-6 shadow-xl shadow-stone-200/40 flex flex-col lg:col-span-2"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-serif font-bold text-stone-800">Ministry Groups</h3>
          <p className="text-sm text-stone-500">Active ministry participation</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/members')}
          className="text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          View All
        </button>
      </div>

      <div className="flex-1 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : ministries.length === 0 ? (
          <p className="text-sm text-stone-500 py-4">
            No ministries found. Add rows in the ministries table and link members via
            member_ministries.
          </p>
        ) : (
          ministries.map((ministry, index) => (
            <motion.div
              key={ministry.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              whileHover={{ x: 4 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-stone-50 to-transparent hover:from-amber-50 cursor-pointer transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-lg bg-gradient-to-br ${ministry.color} flex items-center justify-center shadow-md`}
              >
                <ministry.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800 text-sm truncate">{ministry.name}</p>
                <p className="text-xs text-stone-500">{ministry.members} members</p>
              </div>
              <div className="w-16 h-2 bg-stone-100 rounded-full overflow-hidden shrink-0">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(ministry.members / maxMembers) * 100}%` }}
                  transition={{ duration: 1, delay: 0.8 + index * 0.05 }}
                  className={`h-full rounded-full bg-gradient-to-r ${ministry.color}`}
                />
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

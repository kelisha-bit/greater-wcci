import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { membersApi } from '../services/api';

interface DemographicData {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-stone-200 rounded-xl p-3 shadow-xl">
        <p className="font-semibold text-stone-800">{payload[0]?.name}</p>
        <p className="text-sm text-stone-600">
          Members: <span className="font-medium">{payload[0]?.value.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

const DemographicsChart = memo(function DemographicsChart() {
  const [data, setData] = useState<DemographicData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await membersApi.getAgeDemographics();
        if (cancelled) return;
        if (res.success && res.data) {
          setData(res.data);
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

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6 shadow-lg shadow-stone-200/50"
    >
      <div className="mb-6">
        <h3 className="text-lg font-serif font-bold text-stone-800">Member Demographics</h3>
        <p className="text-sm text-stone-500">
          Age distribution (members with date of birth)
        </p>
      </div>

      <div className="h-56">
        {loading ? (
          <div className="h-full flex items-center justify-center text-stone-400 text-sm animate-pulse">
            Loading…
          </div>
        ) : total === 0 ? (
          <div className="h-full flex items-center justify-center text-stone-500 text-sm text-center px-4">
            No age data yet. Add dates of birth on member profiles to see this chart.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                animationDuration={1500}
                animationBegin={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && total > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-stone-600 truncate">{item.name.split(' ')[0]}</span>
              <span className="text-xs font-medium text-stone-800 ml-auto tabular-nums">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
});

export default DemographicsChart;

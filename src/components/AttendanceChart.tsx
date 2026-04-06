import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { attendanceApi } from '../services/api';

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
}

interface AttendanceData {
  name: string;
  attendance: number;
  visitors: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-stone-200 rounded-xl p-3 shadow-xl">
        <p className="font-semibold text-stone-800 mb-2">{label}</p>
        <p className="text-sm text-amber-600">
          Present: <span className="font-medium">{payload[0]?.value?.toLocaleString()}</span>
        </p>
        <p className="text-sm text-emerald-600">
          Late: <span className="font-medium">{payload[1]?.value?.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

const emptyYear = (): AttendanceData[] =>
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
    (name) => ({ name, attendance: 0, visitors: 0 })
  );

const AttendanceChart = memo(function AttendanceChart() {
  const [data, setData] = useState<AttendanceData[]>(emptyYear);
  const [loading, setLoading] = useState(true);

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      const year = new Date().getFullYear();
      const response = await attendanceApi.getMonthlyAttendanceTrend(year);

      if (response.success && response.data?.length) {
        setData(response.data);
      } else {
        setData(emptyYear());
      }
    } catch (error) {
      console.error('Failed to fetch attendance data:', error);
      setData(emptyYear());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  const maxVal = Math.max(
    ...data.flatMap((d) => [d.attendance, d.visitors]),
    1
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6 shadow-lg shadow-stone-200/50"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-serif font-bold text-stone-800">Attendance Trends</h3>
          <p className="text-sm text-stone-500">
            Present vs late check-ins by month ({new Date().getFullYear()})
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
            <span className="text-xs text-stone-600">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
            <span className="text-xs text-stone-600">Late</span>
          </div>
        </div>
      </div>

      <div className="h-72">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-stone-400">Loading attendance data...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#78716c', fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#78716c', fontSize: 12 }}
                tickFormatter={(value) =>
                  maxVal >= 1000 ? `${Math.round(value / 1000)}k` : String(Math.round(value))
                }
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="attendance"
                stroke="#f59e0b"
                strokeWidth={3}
                fill="#f59e0b"
                fillOpacity={0.22}
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="#10b981"
                strokeWidth={3}
                fill="#10b981"
                fillOpacity={0.22}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
});

export default AttendanceChart;

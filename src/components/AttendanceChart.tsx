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
      className="bg-white/90 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6 shadow-xl shadow-stone-200/50 hover:shadow-2xl transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-serif font-bold text-stone-800 mb-1">Attendance Trends</h3>
          <p className="text-sm text-stone-500">
            Present vs late check-ins by month ({new Date().getFullYear()})
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-sm" />
            <span className="text-xs font-medium text-stone-600">Present</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-sm" />
            <span className="text-xs font-medium text-stone-600">Late</span>
          </div>
        </div>
      </div>

      <div className="h-72">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
              <div className="text-stone-400 text-sm">Loading attendance data...</div>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                </linearGradient>
                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#78716c', fontSize: 12, fontWeight: 500 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#78716c', fontSize: 12, fontWeight: 500 }}
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
                fill="url(#colorAttendance)"
              />
              <Area
                type="monotone"
                dataKey="visitors"
                stroke="#10b981"
                strokeWidth={3}
                fill="url(#colorVisitors)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
});

export default AttendanceChart;

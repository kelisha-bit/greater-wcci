import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { donationsApi } from '../services/api';

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
}

interface DonationData {
  name: string;
  amount: number;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-stone-200 rounded-xl p-3 shadow-xl">
        <p className="font-semibold text-stone-800 mb-1">{label}</p>
        <p className="text-sm text-emerald-600">
          Donations: <span className="font-medium">${payload[0]?.value?.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

const DonationsChart = memo(function DonationsChart() {
  const [data, setData] = useState<DonationData[]>(
    ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
      (name) => ({ name, amount: 0 })
    )
  );
  const [totalYear, setTotalYear] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchDonationsData = async () => {
    try {
      setLoading(true);
      
      // Get current year data
      const currentYear = new Date().getFullYear();
      const yearStart = `${currentYear}-01-01`;
      const yearEnd = `${currentYear}-12-31`;
      
      const response = await donationsApi.getDonations({
        dateFrom: yearStart,
        dateTo: yearEnd,
        pageSize: 15000,
      });

      if (response.success && response.data) {
        const monthlyTotals = new Map<number, number>();
        let yearlyTotal = 0;

        response.data.forEach((donation) => {
          const d = new Date(donation.date);
          if (Number.isNaN(d.getTime())) return;
          if (d.getFullYear() !== currentYear) return;
          const monthIndex = d.getMonth();
          const current = monthlyTotals.get(monthIndex) || 0;
          monthlyTotals.set(monthIndex, current + donation.amount);
          yearlyTotal += donation.amount;
        });

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const chartData: DonationData[] = months.map((month, i) => ({
          name: month,
          amount: monthlyTotals.get(i) || 0,
        }));

        setData(chartData);
        setTotalYear(yearlyTotal);
      }
    } catch (error) {
      console.error('Failed to fetch donations data:', error);
      // Keep using existing data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonationsData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6 shadow-lg shadow-stone-200/50"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-serif font-bold text-stone-800">Donations Overview</h3>
          <p className="text-sm text-stone-500">Monthly giving trends</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-emerald-600">${totalYear.toLocaleString()}</p>
          <p className="text-xs text-stone-500">Total this year</p>
        </div>
      </div>

      <div className="h-72">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-stone-400">Loading donations data...</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar
                dataKey="amount"
                radius={[8, 8, 0, 0]}
                animationDuration={2000}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#14b8a6'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
});

export default DonationsChart;

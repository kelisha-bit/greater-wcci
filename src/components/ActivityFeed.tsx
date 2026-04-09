import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { UserPlus, Gift, Calendar, Plus, Send } from 'lucide-react';
import { membersApi, donationsApi, eventsApi } from '../services/api';

interface Activity {
  id: string;
  type: 'member' | 'donation' | 'event' | 'prayer' | 'message';
  message: string;
  time: string;
  at: number;
  icon: typeof UserPlus;
  color: string;
}

export default function ActivityFeed() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentActivities = async () => {
    try {
      setLoading(true);

      const [membersResponse, donationsResponse, eventsResponse] = await Promise.all([
        membersApi.getMembers(1, 25),
        donationsApi.getDonations({ pageSize: 25 }),
        eventsApi.getEvents({ limit: 15, upcoming: true }),
      ]);

      const newActivities: Activity[] = [];

      if (membersResponse.success && membersResponse.data) {
        for (const member of membersResponse.data) {
          const raw = member.createdAt || (member.joinDate ? `${member.joinDate}T12:00:00` : '');
          const at = raw ? new Date(raw).getTime() : 0;
          if (!at || Number.isNaN(at)) continue;
          newActivities.push({
            id: `member-${member.id}`,
            type: 'member',
            message: `${member.name} added to directory`,
            at,
            time: formatDistanceToNow(at, { addSuffix: true }),
            icon: UserPlus,
            color: 'bg-blue-100 text-blue-600',
          });
        }
      }

      if (donationsResponse.success && donationsResponse.data) {
        for (const donation of donationsResponse.data) {
          const at = new Date(donation.date).getTime();
          if (Number.isNaN(at)) continue;
          newActivities.push({
            id: `donation-${donation.id}`,
            type: 'donation',
            message: `${donation.donorName || 'Donor'} gave $${donation.amount.toLocaleString()} (${donation.fundType})`,
            at,
            time: formatDistanceToNow(at, { addSuffix: true }),
            icon: Gift,
            color: 'bg-emerald-100 text-emerald-600',
          });
        }
      }

      if (eventsResponse.success && eventsResponse.data) {
        for (const event of eventsResponse.data) {
          const at = new Date(event.date).getTime();
          if (Number.isNaN(at)) continue;
          newActivities.push({
            id: `event-${event.id}`,
            type: 'event',
            message: `${event.title} · ${event.date}`,
            at,
            time: formatDistanceToNow(at, { addSuffix: true }),
            icon: Calendar,
            color: 'bg-rose-100 text-rose-600',
          });
        }
      }

      newActivities.sort((a, b) => b.at - a.at);
      setActivities(newActivities.slice(0, 12));
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentActivities();
  }, []);

  const handleAddMember = () => {
    navigate('/members?action=new');
  };

  const handleRecordDonation = () => {
    navigate('/donations?action=new');
  };

  const handleSendMessage = () => {
    navigate('/announcements?action=new');
  };

  const handleViewAll = () => {
    navigate('/reports?type=activity');
  };

  const handleActivityClick = (activity: Activity) => {
    switch (activity.type) {
      case 'member':
        navigate('/members');
        break;
      case 'donation':
        navigate('/donations');
        break;
      case 'event':
        navigate('/events');
        break;
      case 'message':
        navigate('/announcements');
        break;
      default:
        break;
    }
  };

  const Icon = ({ activity }: { activity: Activity }) => {
    const C = activity.icon;
    return <C className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6 shadow-lg shadow-stone-200/50 min-h-[200px]"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-serif font-bold text-stone-800">Recent Activity</h3>
          <p className="text-sm text-stone-500">Latest updates</p>
        </div>
        <button
          type="button"
          onClick={handleViewAll}
          className="text-sm text-amber-600 hover:text-amber-700 font-medium"
        >
          View All
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse flex items-start gap-3">
                <div className="w-9 h-9 bg-stone-100 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-stone-100 rounded mb-2"></div>
                  <div className="h-3 bg-stone-100 rounded w-20"></div>
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="text-sm text-stone-500 py-2">
            No recent activity yet. Add members, donations, or events to see them here.
          </p>
        ) : (
          activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + index * 0.05 }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleActivityClick(activity)}
              className="flex items-start gap-3 cursor-pointer hover:bg-stone-50 p-2 rounded-lg transition-colors"
            >
              <div
                className={`w-9 h-9 rounded-lg ${activity.color} flex items-center justify-center flex-shrink-0`}
              >
                <Icon activity={activity} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700 truncate">{activity.message}</p>
                <p className="text-xs text-stone-400 mt-0.5">{activity.time}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="mt-6 pt-6 border-t border-stone-100">
        <p className="text-xs font-medium text-stone-500 mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleAddMember}
            className="flex-1 min-w-[80px] py-2 px-3 rounded-lg bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Member
          </button>
          <button
            type="button"
            onClick={handleRecordDonation}
            className="flex-1 min-w-[80px] py-2 px-3 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-medium hover:bg-emerald-100 transition-colors flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Donation
          </button>
          <button
            type="button"
            onClick={handleSendMessage}
            className="flex-1 min-w-[80px] py-2 px-3 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium hover:bg-amber-100 transition-colors flex items-center justify-center gap-1"
          >
            <Send className="w-3 h-3" />
            Message
          </button>
        </div>
      </div>
    </motion.div>
  );
}

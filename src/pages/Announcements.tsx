import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Calendar, Send, Users,
  Edit, Trash2, X, Bell, Megaphone, Mail
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import { announcementTypeColors, announcementStatusColors } from '../constants/colors';

const announcementsData = [
  { id: 1, title: 'Christmas Eve Service Schedule', content: 'Join us for our special Christmas Eve candlelight service at 6:00 PM. Childcare will be provided for ages 0-5.', date: '2024-12-24', type: 'event', status: 'published', author: 'Pastor Michael', channels: ['email', 'sms', 'app'] },
  { id: 2, title: 'Annual Business Meeting', content: 'Our annual business meeting will be held on January 15th after the second service. All members are encouraged to attend.', date: '2025-01-15', type: 'meeting', status: 'published', author: 'Admin', channels: ['email', 'app'] },
  { id: 3, title: 'Youth Winter Retreat Registration', content: 'Registration is now open for the Youth Winter Retreat! Sign up by December 20th. Cost is $150 per student.', date: '2024-12-20', type: 'event', status: 'published', author: 'Youth Ministry', channels: ['email', 'sms'] },
  { id: 4, title: 'Volunteer Appreciation Dinner', content: 'We are celebrating all our wonderful volunteers with a special dinner on December 22nd at 5:00 PM in the Fellowship Hall.', date: '2024-12-22', type: 'event', status: 'draft', author: 'Admin', channels: ['email'] },
  { id: 5, title: 'New Member Class Starting', content: 'Our next new member class begins January 7th. Sign up at the welcome desk or contact the church office.', date: '2025-01-07', type: 'general', status: 'published', author: 'Pastor Michael', channels: ['email', 'app'] },
  { id: 6, title: 'Food Drive Results', content: 'Thank you for your generosity! We collected over 2,000 cans for the local food bank. Your support makes a difference!', date: '2024-12-10', type: 'general', status: 'published', author: 'Outreach Team', channels: ['email', 'sms', 'app'] },
];

export default function Announcements() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<typeof announcementsData[0] | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredAnnouncements = announcementsData.filter(announcement =>
    announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    announcement.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Header />
      <ErrorBoundary>
      <main className="p-6 lg:p-8">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif font-bold text-stone-800">Announcements</h1>
              <p className="text-stone-600 mt-1">Manage church communications</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors flex items-center gap-2">
                <Send className="w-4 h-4" />
                Send All
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Announcement
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">24</p>
                <p className="text-xs text-stone-500">This Month</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">18</p>
                <p className="text-xs text-stone-500">Published</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                <Mail className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">5.2K</p>
                <p className="text-xs text-stone-500">Emails Sent</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-stone-800">89%</p>
                <p className="text-xs text-stone-500">Open Rate</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/80 backdrop-blur-xl border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </motion.div>

        {/* Announcements List */}
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement, index) => (
            <motion.div
              key={announcement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.005 }}
              onClick={() => setSelectedAnnouncement(announcement)}
              className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-5 cursor-pointer hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${announcementTypeColors[announcement.type as keyof typeof announcementTypeColors]}`}>
                      {announcement.type.charAt(0).toUpperCase() + announcement.type.slice(1)}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${announcementStatusColors[announcement.status as keyof typeof announcementStatusColors]}`}>
                      {announcement.status.charAt(0).toUpperCase() + announcement.status.slice(1)}
                    </span>
                  </div>
                  <h3 className="font-semibold text-stone-800 mb-2">{announcement.title}</h3>
                  <p className="text-sm text-stone-600 line-clamp-2">{announcement.content}</p>
                  
                  <div className="flex items-center gap-4 mt-3 text-xs text-stone-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(announcement.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5" />
                      {announcement.author}
                    </div>
                    <div className="flex items-center gap-1">
                      {announcement.channels.includes('email') && <Mail className="w-3.5 h-3.5" />}
                      {announcement.channels.includes('sms') && <Send className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 rounded-lg hover:bg-stone-100 transition-colors">
                    <Edit className="w-4 h-4 text-stone-500" />
                  </button>
                  <button className="p-2 rounded-lg hover:bg-rose-50 transition-colors">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View/Edit Modal */}
        <AnimatePresence>
          {selectedAnnouncement && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedAnnouncement(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${announcementTypeColors[selectedAnnouncement.type as keyof typeof announcementTypeColors]}`}>
                      {selectedAnnouncement.type}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${announcementStatusColors[selectedAnnouncement.status as keyof typeof announcementStatusColors]}`}>
                      {selectedAnnouncement.status}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedAnnouncement(null)}
                    className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-stone-500" />
                  </button>
                </div>

                <h2 className="text-xl font-serif font-bold text-stone-800 mb-3">{selectedAnnouncement.title}</h2>
                <p className="text-stone-600 mb-4">{selectedAnnouncement.content}</p>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Calendar className="w-4 h-4 text-stone-400" />
                    {new Date(selectedAnnouncement.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-stone-600">
                    <Bell className="w-4 h-4 text-stone-400" />
                    Posted by {selectedAnnouncement.author}
                  </div>
                </div>

                <div className="p-3 bg-stone-50 rounded-xl mb-4">
                  <p className="text-xs text-stone-500 mb-2">Channels</p>
                  <div className="flex items-center gap-2">
                    {selectedAnnouncement.channels.map(channel => (
                      <span key={channel} className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-xs font-medium text-stone-600">
                        {channel.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Now
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Modal */}
        <AnimatePresence>
          {showAddModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowAddModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-serif font-bold text-stone-800">New Announcement</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-stone-500" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                    <input type="text" className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Content</label>
                    <textarea rows={4} className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Type</label>
                      <select className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                        <option>Event</option>
                        <option>Meeting</option>
                        <option>General</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                      <input type="date" className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">Channels</label>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded border-stone-300 text-amber-500" />
                        <span className="text-sm text-stone-700">Email</span>
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 cursor-pointer">
                        <input type="checkbox" className="rounded border-stone-300 text-amber-500" />
                        <span className="text-sm text-stone-700">SMS</span>
                      </label>
                      <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 cursor-pointer">
                        <input type="checkbox" defaultChecked className="rounded border-stone-300 text-amber-500" />
                        <span className="text-sm text-stone-700">App</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow">
                    Create Announcement
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      </ErrorBoundary>
    </>
  );
}

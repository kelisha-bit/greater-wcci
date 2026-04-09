import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Plus, Play, Pause, Calendar, Clock, User,
  BookOpen, Download, X
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import { useAuth } from '../contexts/AuthContext';
import { seriesColors } from '../constants/colors';

const sermonsData = [
  { id: 1, title: 'The Gift of Grace', scripture: 'Ephesians 2:8-9', speaker: 'Pastor Michael', date: '2024-12-15', duration: '42:15', series: 'Advent 2024', description: 'Exploring the unmerited favor of God and how it transforms our lives.' },
  { id: 2, title: 'Preparing the Way', scripture: 'Mark 1:1-8', speaker: 'Pastor Michael', date: '2024-12-08', duration: '38:42', series: 'Advent 2024', description: 'John the Baptist\'s call to prepare our hearts for the coming Messiah.' },
  { id: 3, title: 'Hope in Darkness', scripture: 'Isaiah 9:2-7', speaker: 'Pastor Sarah', date: '2024-12-01', duration: '45:20', series: 'Advent 2024', description: 'Finding hope even in the darkest times through the promise of the Messiah.' },
  { id: 4, title: 'Living with Thanksgiving', scripture: 'Psalm 100', speaker: 'Pastor Michael', date: '2024-11-24', duration: '35:18', series: 'Thanksgiving', description: 'Cultivating a heart of gratitude in all circumstances.' },
  { id: 5, title: 'The Heart of Service', scripture: 'Mark 10:45', speaker: 'Pastor Sarah', date: '2024-11-17', duration: '40:55', series: 'Kingdom Living', description: 'Following Jesus\' example of servant leadership.' },
  { id: 6, title: 'Faith That Moves Mountains', scripture: 'Matthew 17:20', speaker: 'Pastor Michael', date: '2024-11-10', duration: '44:30', series: 'Kingdom Living', description: 'Understanding the power of even the smallest amount of faith.' },
  { id: 7, title: 'The Armor of God', scripture: 'Ephesians 6:10-18', speaker: 'Pastor Michael', date: '2024-11-03', duration: '48:12', series: 'Spiritual Warfare', description: 'Equipping ourselves with God\'s armor for spiritual battle.' },
  { id: 8, title: 'Prayer Changes Things', scripture: 'James 5:16', speaker: 'Pastor Sarah', date: '2024-10-27', duration: '36:45', series: 'Prayer', description: 'The transformative power of righteous prayer.' },
];

export default function Sermons() {
  const { isAdminOrStaff } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState('all');
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [selectedSermon, setSelectedSermon] = useState<typeof sermonsData[0] | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const filteredSermons = sermonsData.filter(sermon => {
    const matchesSearch = sermon.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          sermon.scripture.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeries = selectedSeries === 'all' || sermon.series === selectedSeries;
    return matchesSearch && matchesSeries;
  });

  const series = [...new Set(sermonsData.map(s => s.series))];

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
              <h1 className="text-3xl font-serif font-bold text-stone-800">Sermons</h1>
              <p className="text-stone-600 mt-1">Manage sermon library and media</p>
            </div>
            <div className="flex items-center gap-3">
              {isAdminOrStaff && (
                <>
                  <button className="px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                  <button 
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Sermon
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4 mb-6"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search sermons by title or scripture..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <select
              value={selectedSeries}
              onChange={(e) => setSelectedSeries(e.target.value)}
              className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              <option value="all">All Series</option>
              {series.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Sermons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSermons.map((sermon, index) => (
            <motion.div
              key={sermon.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4 }}
              onClick={() => setSelectedSermon(sermon)}
              className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
            >
              {/* Thumbnail */}
              <div className={`h-32 bg-gradient-to-br ${seriesColors[sermon.series as keyof typeof seriesColors] || 'from-stone-400 to-gray-500'} relative flex items-center justify-center`}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPlayingId(playingId === sermon.id ? null : sermon.id);
                  }}
                  className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                >
                  {playingId === sermon.id ? (
                    <Pause className="w-6 h-6 text-stone-800" />
                  ) : (
                    <Play className="w-6 h-6 text-stone-800 ml-1" />
                  )}
                </button>
                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/50 text-white text-xs">
                  {sermon.duration}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-600 text-xs font-medium">
                    {sermon.series}
                  </span>
                </div>
                <h3 className="font-semibold text-stone-800 mb-1">{sermon.title}</h3>
                <p className="text-sm text-amber-600 mb-3">{sermon.scripture}</p>
                
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <div className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5" />
                    {sermon.speaker}
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(sermon.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Sermon Detail Modal */}
        <AnimatePresence>
          {selectedSermon && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedSermon(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
              >
                <div className={`h-40 bg-gradient-to-br ${seriesColors[selectedSermon.series as keyof typeof seriesColors] || 'from-stone-400 to-gray-500'} relative flex items-center justify-center`}>
                  <button
                    onClick={() => setPlayingId(playingId === selectedSermon.id ? null : selectedSermon.id)}
                    className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors"
                  >
                    {playingId === selectedSermon.id ? (
                      <Pause className="w-8 h-8 text-stone-800" />
                    ) : (
                      <Play className="w-8 h-8 text-stone-800 ml-1" />
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedSermon(null)}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <span className="px-3 py-1 rounded-lg bg-white/20 text-white text-sm font-medium">
                      {selectedSermon.series}
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-black/50 text-white text-sm">
                      {selectedSermon.duration}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h2 className="text-2xl font-serif font-bold text-stone-800 mb-2">{selectedSermon.title}</h2>
                  <p className="text-lg text-amber-600 mb-4">{selectedSermon.scripture}</p>
                  
                  <p className="text-stone-600 mb-6">{selectedSermon.description}</p>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-3 text-sm">
                      <User className="w-4 h-4 text-stone-400" />
                      <span className="text-stone-700">{selectedSermon.speaker}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      <span className="text-stone-700">{new Date(selectedSermon.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-stone-400" />
                      <span className="text-stone-700">{selectedSermon.duration}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <BookOpen className="w-4 h-4 text-stone-400" />
                      <span className="text-stone-700">{selectedSermon.scripture}</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Audio
                    </button>
                    <button className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center justify-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      View Notes
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add Sermon Modal */}
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
                  <h2 className="text-xl font-serif font-bold text-stone-800">Add New Sermon</h2>
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
                    <input type="text" className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Scripture</label>
                      <input type="text" placeholder="e.g., John 3:16" className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Speaker</label>
                      <select className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30">
                        <option>Pastor Michael</option>
                        <option>Pastor Sarah</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                      <input type="date" className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Series</label>
                      <select className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30">
                        <option>Advent 2024</option>
                        <option>Kingdom Living</option>
                        <option>New Series</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                    <textarea rows={3} className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Audio File</label>
                    <div className="border-2 border-dashed border-stone-200 rounded-xl p-6 text-center">
                      <p className="text-sm text-stone-500">Drag and drop audio file or click to browse</p>
                      <p className="text-xs text-stone-400 mt-1">MP3, M4A up to 100MB</p>
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
                    Add Sermon
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

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, Plus, Clock, MapPin, Users, ChevronLeft, ChevronRight,
  Edit, Trash2, X, Loader2
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import { formatDate } from '../utils/helpers';
import { eventTypeColors, eventTypeBgColors } from '../constants/colors';
import { useEvents, useCreateEvent, useUpdateEvent, useDeleteEvent } from '../hooks/useData';
import { useNotification } from '../hooks/useNotification';
import type { Event } from '../services/api';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function Events() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const { show: showToast } = useNotification();

  const handleManageAttendees = (eventId: string) => {
    navigate(`/attendance?eventId=${eventId}`);
  };

  // Form states
  const [formData, setFormData] = useState<Partial<Event>>({
    title: '',
    date: '',
    time: '',
    location: '',
    type: 'service',
    description: '',
    capacity: 0,
    status: 'upcoming'
  });

  // Data hooks
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useEvents();
  const { create: createEvent, isLoading: isCreating } = useCreateEvent();
  const { update: updateEvent, isLoading: isUpdating } = useUpdateEvent(selectedEvent?.id || '');
  const { delete: deleteEvent } = useDeleteEvent();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const getEventsForDay = (day: number) => {
    if (!events) return [];
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    return days;
  }, [firstDay, daysInMonth]);

  const handleAddEvent = async () => {
    if (!formData.title || !formData.date || !formData.time) {
      showToast('error', 'Missing Fields', 'Please fill in all required fields');
      return;
    }

    const res = await createEvent({
      title: formData.title!,
      date: formData.date!,
      time: formData.time!,
      location: formData.location || '',
      type: formData.type || 'service',
      description: formData.description || '',
      capacity: Number(formData.capacity) || 0,
      status: 'upcoming',
      attendees: 0
    });

    if (res) {
      showToast('success', 'Event Created', 'New event has been added successfully');
      setShowAddModal(false);
      resetForm();
      refetchEvents?.();
    } else {
      showToast('error', 'Creation Failed', 'Could not create event');
    }
  };

  const handleUpdateEvent = async () => {
    if (!selectedEvent) return;

    const res = await updateEvent({
      ...formData
    });

    if (res) {
      showToast('success', 'Event Updated', 'Event details have been updated');
      setShowEditModal(false);
      setSelectedEvent(null);
      resetForm();
      refetchEvents?.();
    } else {
      showToast('error', 'Update Failed', 'Could not update event');
    }
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    const success = await deleteEvent(id);
    if (success) {
      showToast('success', 'Event Deleted', 'The event has been removed');
      setSelectedEvent(null);
      refetchEvents?.();
    } else {
      showToast('error', 'Delete Failed', 'Could not delete event');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      date: '',
      time: '',
      location: '',
      type: 'service',
      description: '',
      capacity: 0,
      status: 'upcoming'
    });
  };

  const openEditModal = (event: Event) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      type: event.type,
      description: event.description,
      capacity: event.capacity,
      status: event.status
    });
    setShowEditModal(true);
  };

  if (eventsLoading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      </>
    );
  }

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
              <h1 className="text-3xl font-serif font-bold text-stone-800">Events</h1>
              <p className="text-stone-600 mt-1">Plan and manage church events</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-white/80 border border-stone-200 rounded-xl p-1">
                <button
                  onClick={() => setView('calendar')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-amber-500 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
                >
                  Calendar
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'list' ? 'bg-amber-500 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
                >
                  List
                </button>
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Event
              </button>
            </div>
          </div>
        </motion.div>

        {view === 'calendar' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
            >
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-serif font-bold text-stone-800">{months[month]} {year}</h2>
                <div className="flex items-center gap-2">
                  <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-stone-100 transition-colors">
                    <ChevronLeft className="w-5 h-5 text-stone-600" />
                  </button>
                  <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-stone-100 transition-colors">
                    <ChevronRight className="w-5 h-5 text-stone-600" />
                  </button>
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {daysOfWeek.map(day => (
                  <div key={day} className="text-center py-2 text-xs font-semibold text-stone-500 uppercase">
                    {day}
                  </div>
                ))}
                {calendarDays.map((day, index) => {
                  const dayEvents = day ? getEventsForDay(day) : [];
                  return (
                    <div
                      key={index}
                      className={`min-h-[80px] p-1 border border-stone-100 rounded-lg ${day ? 'bg-white/50 hover:bg-amber-50/50 cursor-pointer' : 'bg-stone-50/50'}`}
                    >
                      {day && (
                        <>
                          <span className="text-sm font-medium text-stone-700">{day}</span>
                          <div className="mt-1 space-y-0.5">
                            {dayEvents.slice(0, 2).map(event => (
                              <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`text-xs px-1.5 py-0.5 rounded truncate ${eventTypeBgColors[event.type as keyof typeof eventTypeBgColors]} text-stone-700 cursor-pointer hover:opacity-80`}
                              >
                                {event.title}
                              </div>
                            ))}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-stone-500 px-1.5">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Upcoming Events */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6"
            >
              <h3 className="text-lg font-serif font-bold text-stone-800 mb-4">Upcoming Events</h3>
              <div className="space-y-3">
                {(events || []).filter(e => new Date(e.date) >= new Date()).slice(0, 5).map(event => (
                  <motion.div
                    key={event.id}
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setSelectedEvent(event)}
                    className="p-3 rounded-xl bg-stone-50 hover:bg-amber-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-1.5 h-12 rounded-full bg-gradient-to-b ${eventTypeColors[event.type as keyof typeof eventTypeColors] || 'from-stone-400 to-stone-500'}`} />
                      <div className="flex-1">
                        <p className="font-medium text-stone-800 text-sm">{event.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                          <Calendar className="w-3 h-3" />
                          {formatDate(event.date)}
                          <Clock className="w-3 h-3 ml-2" />
                          {event.time}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
                {(!events || events.length === 0) && (
                  <p className="text-sm text-stone-500 text-center py-8">No upcoming events</p>
                )}
              </div>
            </motion.div>
          </div>
        ) : (
          /* List View */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100">
                    <th className="text-left py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Event</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Date & Time</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Location</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Attendees</th>
                    <th className="text-left py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Type</th>
                    <th className="text-right py-4 px-6 text-xs font-semibold text-stone-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events?.map((event, index) => (
                    <motion.tr
                      key={event.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-stone-50 hover:bg-amber-50/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedEvent(event)}
                    >
                      <td className="py-4 px-6">
                        <p className="font-medium text-stone-800">{event.title}</p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="text-sm text-stone-600">
                          {formatDate(event.date)}
                        </div>
                        <div className="text-xs text-stone-500">{event.time}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          {event.location}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm text-stone-600">
                          <Users className="w-3.5 h-3.5 text-stone-400" />
                          {event.attendees}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${eventTypeBgColors[event.type as keyof typeof eventTypeBgColors] || 'bg-stone-100'} text-stone-700`}>
                          {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(event);
                            }}
                            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                            title="Edit Event"
                          >
                            <Edit className="w-4 h-4 text-stone-500" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                                handleDeleteEvent(event.id);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Event"
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Event Detail Modal */}
        <AnimatePresence>
          {selectedEvent && !showEditModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setSelectedEvent(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
              >
                <div className={`h-20 bg-gradient-to-r ${eventTypeColors[selectedEvent.type as keyof typeof eventTypeColors] || 'from-stone-400 to-stone-500'} relative`}>
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="absolute top-4 right-4 p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
                <div className="p-6">
                  <h2 className="text-2xl font-serif font-bold text-stone-800 mb-4">{selectedEvent.title}</h2>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-stone-400" />
                      <span className="text-stone-700">{formatDate(selectedEvent.date)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-stone-400" />
                      <span className="text-stone-700">{selectedEvent.time}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="w-4 h-4 text-stone-400" />
                      <span className="text-stone-700">{selectedEvent.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Users className="w-4 h-4 text-stone-400" />
                      <span className="text-stone-700">{selectedEvent.attendees} registered</span>
                    </div>
                  </div>

                  <div className="mt-4 p-4 bg-stone-50 rounded-xl">
                    <p className="text-sm text-stone-600">{selectedEvent.description || 'No description provided.'}</p>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button 
                      onClick={() => openEditModal(selectedEvent)}
                      className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Event
                    </button>
                    <button 
                      onClick={() => handleManageAttendees(selectedEvent.id)}
                      className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
                    >
                      Manage Attendees
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
                          handleDeleteEvent(selectedEvent.id);
                          setSelectedEvent(null);
                        }
                      }}
                      className="py-2.5 px-4 rounded-xl bg-rose-500 text-white font-medium shadow-lg shadow-rose-500/25 hover:bg-rose-600 hover:shadow-rose-500/40 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add/Edit Event Modal */}
        <AnimatePresence>
          {(showAddModal || showEditModal) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
                resetForm();
              }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-serif font-bold text-stone-800">
                    {showEditModal ? 'Edit Event' : 'Create New Event'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-stone-500" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Event Title</label>
                    <input 
                      type="text" 
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Date</label>
                      <input 
                        type="date" 
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Time</label>
                      <input 
                        type="time" 
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Location</label>
                    <input 
                      type="text" 
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Event Type</label>
                    <select 
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30"
                    >
                      <option value="service">Service</option>
                      <option value="youth">Youth</option>
                      <option value="study">Study</option>
                      <option value="fellowship">Fellowship</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                    <textarea 
                      rows={3} 
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30" 
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setShowEditModal(false);
                      resetForm();
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={showEditModal ? handleUpdateEvent : handleAddEvent}
                    disabled={isCreating || isUpdating}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow disabled:opacity-50"
                  >
                    {isCreating || isUpdating ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      showEditModal ? 'Update Event' : 'Create Event'
                    )}
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

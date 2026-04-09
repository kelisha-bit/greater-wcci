import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users, Plus } from 'lucide-react';
import { eventsApi } from '../services/api';
import type { Event } from '../services/api';

interface EventDisplay {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  type: 'service' | 'youth' | 'study' | 'special' | 'fellowship' | 'other';
}

const typeColors: Record<string, string> = {
  service: 'from-amber-400 to-orange-500',
  youth: 'from-blue-400 to-indigo-500',
  study: 'from-emerald-400 to-teal-500',
  special: 'from-rose-400 to-pink-500',
  fellowship: 'from-violet-400 to-purple-500',
  other: 'from-stone-400 to-stone-500',
};

export default function EventsSection() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventDisplay[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsApi.getEvents({ 
        upcoming: true, 
        limit: 10 
      });
      
      if (response.success && response.data) {
        const transformedEvents: EventDisplay[] = response.data.map((event: Event) => ({
          id: event.id,
          title: event.title,
          date: new Date(event.date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          }),
          time: event.time,
          location: event.location,
          attendees: event.attendees,
          type: (event.type in typeColors
            ? event.type
            : 'other') as EventDisplay['type'],
        }));
        setEvents(transformedEvents);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleEventClick = (eventId: string) => {
    navigate(`/events/${eventId}`);
  };

  const handleAddEvent = () => {
    navigate('/events?action=new');
  };

  const handleViewAllEvents = () => {
    navigate('/events');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6 shadow-lg shadow-stone-200/50 min-h-[200px]"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-serif font-bold text-stone-800">Upcoming Events</h3>
          <p className="text-sm text-stone-500">Next 7 days</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleViewAllEvents}
            className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            View All
          </button>
          <button 
            onClick={handleAddEvent}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-20 bg-stone-100 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          events.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleEventClick(event.id)}
              className="p-4 rounded-xl bg-gradient-to-r from-stone-50 to-transparent border border-stone-100 hover:border-amber-200 cursor-pointer transition-all"
            >
              <div className="flex items-start gap-4">
                <div className={`w-1.5 h-full min-h-[60px] rounded-full bg-gradient-to-b ${typeColors[event.type] || typeColors.other}`} />
                
                <div className="flex-1">
                  <h4 className="font-semibold text-stone-800 mb-2">{event.title}</h4>
                  <div className="flex flex-wrap gap-4 text-xs text-stone-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {event.date}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {event.time}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {event.attendees} attending
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

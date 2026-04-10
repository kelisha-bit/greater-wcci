import { memo, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../services/api';
import type { Event } from '../services/api';

type DayCell = {
  date: Date;
  inMonth: boolean;
  isToday: boolean;
  count: number;
};

function isoDay(d: Date): string {
  // Local calendar day key
  return format(d, 'yyyy-MM-dd');
}

function safeDate(s: string): Date | null {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

const EventCalendar = memo(function EventCalendar() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await eventsApi.getEvents({ upcoming: true, limit: 200 });
        if (cancelled) return;
        setEvents(res.success && res.data ? res.data : []);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      const d = safeDate(e.date);
      if (!d) continue;
      const key = isoDay(d);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    }
    for (const [k, arr] of map) {
      arr.sort((a, b) => {
        const ta = (a.time || '').localeCompare(b.time || '');
        if (ta !== 0) return ta;
        return a.title.localeCompare(b.title);
      });
      map.set(k, arr);
    }
    return map;
  }, [events]);

  const dayCells: DayCell[] = useMemo(() => {
    const today = new Date();
    const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const cells: DayCell[] = [];
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 1)) {
      const key = isoDay(d);
      cells.push({
        date: d,
        inMonth: isSameMonth(d, month),
        isToday: isSameDay(d, today),
        count: eventsByDay.get(key)?.length ?? 0,
      });
    }
    return cells;
  }, [eventsByDay, month]);

  const selectedKey = isoDay(selected);
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];

  const moveMonth = (delta: number) => {
    const next = startOfMonth(addMonths(month, delta));
    setMonth(next);
    // Keep selection within shown month when navigating
    const s = startOfMonth(addMonths(selected, delta));
    setSelected((prev) => (isSameMonth(prev, next) ? prev : s));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="h-full bg-white/90 backdrop-blur-xl rounded-3xl border border-stone-200/60 p-6 shadow-xl shadow-stone-200/40 flex flex-col"
    >
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-serif font-bold text-stone-800">Event Calendar</h3>
          <p className="text-sm text-stone-500">Plan and review upcoming church events</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="px-3 py-2 rounded-xl border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            View All
          </button>
          <button
            type="button"
            onClick={() => navigate('/events?action=add')}
            className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => moveMonth(-1)}
          className="p-2 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4 text-stone-600" />
        </button>
        <div className="text-sm font-semibold text-stone-800 tabular-nums">
          {format(month, 'MMMM yyyy')}
        </div>
        <button
          type="button"
          onClick={() => moveMonth(1)}
          className="p-2 rounded-xl hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4 text-stone-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-xs text-stone-500 mb-2 px-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="text-center font-medium">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {dayCells.map((cell) => {
          const isSelected = isSameDay(cell.date, selected);
          const key = isoDay(cell.date);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(cell.date)}
              className={[
                'relative rounded-2xl border p-2 text-left transition-all',
                cell.inMonth ? 'bg-white hover:bg-stone-50' : 'bg-stone-50/60 hover:bg-stone-50',
                isSelected ? 'border-amber-400 ring-2 ring-amber-200' : 'border-stone-200/60',
              ].join(' ')}
            >
              <div className="flex items-center justify-between">
                <div
                  className={[
                    'text-xs font-semibold tabular-nums',
                    cell.inMonth ? 'text-stone-800' : 'text-stone-400',
                  ].join(' ')}
                >
                  {format(cell.date, 'd')}
                </div>
                {cell.isToday && (
                  <div className="w-2 h-2 rounded-full bg-emerald-500" aria-label="Today" />
                )}
              </div>

              <div className="mt-1 min-h-[10px]">
                {cell.count > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-8 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
                    <span className="text-[11px] font-medium text-stone-500 tabular-nums">
                      {cell.count}
                    </span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-5 pt-5 border-t border-stone-100 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-stone-800">
            {format(selected, 'EEE, MMM d')}
          </div>
          {!loading && selectedEvents.length > 0 && (
            <div className="text-xs text-stone-500 tabular-nums">
              {selectedEvents.length} event{selectedEvents.length === 1 ? '' : 's'}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
              <div className="text-stone-400 text-sm">Loading events...</div>
            </div>
          </div>
        ) : selectedEvents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-center text-sm text-stone-500 px-4">
            No events scheduled for this day.
          </div>
        ) : (
          <div className="space-y-3 overflow-auto pr-1">
            {selectedEvents.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => navigate(`/events/${e.id}`)}
                className="w-full text-left p-3 rounded-2xl bg-gradient-to-r from-stone-50 to-transparent border border-stone-100 hover:border-amber-200 transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="w-2 h-10 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-stone-800 truncate">{e.title}</div>
                    <div className="mt-1 text-xs text-stone-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="tabular-nums">{e.time || '—'}</span>
                      <span className="text-stone-300">•</span>
                      <span className="truncate">{e.location || 'Location TBD'}</span>
                      {typeof e.attendees === 'number' && e.attendees > 0 && (
                        <>
                          <span className="text-stone-300">•</span>
                          <span className="tabular-nums">{e.attendees} attending</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default EventCalendar;


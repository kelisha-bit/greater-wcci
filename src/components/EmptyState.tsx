import { motion } from 'framer-motion';
import { Search, Inbox, Calendar, FileText, Users } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'search' | 'inbox' | 'calendar' | 'file' | 'users';
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const icons = {
  search: Search,
  inbox: Inbox,
  calendar: Calendar,
  file: FileText,
  users: Users,
};

export default function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  const Icon = icons[icon];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-stone-400" />
      </div>
      <h3 className="text-lg font-serif font-bold text-stone-800 mb-2">{title}</h3>
      <p className="text-sm text-stone-500 text-center max-w-sm mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

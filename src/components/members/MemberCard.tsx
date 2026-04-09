import { motion } from 'framer-motion';
import { 
  Mail, 
  Phone, 
  Calendar, 
  Edit, 
  Trash2, 
  MoreHorizontal,
  Heart,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import type { Member } from '../../services/api';
import { 
  ministryColors, 
  memberStatusColors,
  departmentColors 
} from '../../constants/colors';

interface MemberCardProps {
  member: Member;
  index: number;
  selected: boolean;
  canManage: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function memberInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatJoinDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMonths = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth());
  
  if (diffMonths < 1) {
    return 'Joined recently';
  } else if (diffMonths < 12) {
    return `Joined ${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`;
  } else {
    const years = Math.floor(diffMonths / 12);
    return `Joined ${years} year${years === 1 ? '' : 's'} ago`;
  }
}

export function MemberCard({ 
  member, 
  index, 
  selected, 
  canManage,
  onSelect, 
  onClick, 
  onEdit, 
  onDelete 
}: MemberCardProps) {
  const gradientColor = ministryColors[member.primaryMinistry as keyof typeof ministryColors] || 'from-stone-400 to-gray-500';
  const statusStyle = memberStatusColors[member.status as keyof typeof memberStatusColors] || 'bg-stone-100 text-stone-600';
  
  const firstDepartment = member.departments?.[0];
  const departmentStyle = firstDepartment 
    ? departmentColors[firstDepartment as keyof typeof departmentColors] 
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative bg-white rounded-2xl border border-stone-200/60 shadow-sm hover:shadow-xl hover:border-amber-200/60 transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* Top gradient accent bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradientColor}`} />
      
      <div className="p-5">
        {/* Header: Avatar + Name + Status */}
        <div className="flex items-start gap-4 mb-4">
          {/* Checkbox for selection */}
          <div 
            className="pt-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(member.id, e.target.checked)}
              className="w-4 h-4 rounded border-stone-300 text-amber-500 focus:ring-amber-500/20 cursor-pointer"
            />
          </div>
          
          {/* Avatar */}
          <div
            className={`w-14 h-14 rounded-xl shrink-0 overflow-hidden flex items-center justify-center shadow-md ${
              member.profileImageUrl
                ? 'bg-stone-200'
                : `bg-gradient-to-br ${gradientColor}`
            }`}
          >
            {member.profileImageUrl ? (
              <img
                src={member.profileImageUrl}
                alt={member.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const span = document.createElement('span');
                    span.className = 'text-white font-bold text-lg';
                    span.innerText = memberInitials(member.name);
                    parent.appendChild(span);
                    parent.classList.remove('bg-stone-200');
                    parent.classList.add('bg-gradient-to-br');
                    gradientColor.split(' ').forEach((cls: string) => parent.classList.add(cls));
                  }
                }}
              />
            ) : (
              <span className="text-white font-bold text-lg">
                {memberInitials(member.name)}
              </span>
            )}
          </div>
          
          {/* Name and Role */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-stone-800 text-base truncate group-hover:text-amber-700 transition-colors">
              {member.name}
            </h3>
            <p className="text-sm text-stone-500 truncate">{member.role}</p>
            
            {/* Status Badge - inline with name area */}
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle}`}>
                {member.status === 'active' && <CheckCircle2 className="w-3 h-3" />}
                {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Ministry & Department */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center gap-2">
            <Heart className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-sm text-stone-700 font-medium">
              {member.primaryMinistry || 'No ministry assigned'}
            </span>
          </div>
          
          {firstDepartment && (
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${departmentStyle}`}>
                {firstDepartment}
              </span>
              {member.departments && member.departments.length > 1 && (
                <span className="text-[10px] text-stone-400">
                  +{member.departments.length - 1} more
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Contact Info */}
        <div className="space-y-2 mb-4">
          <a 
            href={`mailto:${member.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-amber-600 transition-colors group/email"
          >
            <div className="p-1 rounded-md bg-stone-100 group-hover/email:bg-amber-100 transition-colors">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <span className="truncate">{member.email}</span>
          </a>
          
          <a 
            href={`tel:${member.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-sm text-stone-600 hover:text-amber-600 transition-colors group/phone"
          >
            <div className="p-1 rounded-md bg-stone-100 group-hover/phone:bg-amber-100 transition-colors">
              <Phone className="w-3.5 h-3.5" />
            </div>
            <span>{member.phone}</span>
          </a>
        </div>
        
        {/* Join Date */}
        <div className="flex items-center gap-2 text-xs text-stone-400 mb-4">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatJoinDate(member.joinDate)}</span>
        </div>
        
        {/* Action Buttons */}
        <div 
          className="flex items-center justify-between pt-4 border-t border-stone-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            {canManage && (
              <button
                onClick={onEdit}
                className="p-2 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                title="Edit member"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {canManage && (
              <button
                onClick={onDelete}
                className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                title="Delete member"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              className="p-2 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all"
              title="More actions"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            className="flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 transition-colors"
            onClick={onClick}
          >
            View Profile
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/0 to-orange-500/0 group-hover:from-amber-500/5 group-hover:via-amber-500/2 group-hover:to-orange-500/5 transition-all duration-500 pointer-events-none" />
    </motion.div>
  );
}

export function MemberCardSkeleton({ index }: { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-2xl border border-stone-200/60 shadow-sm overflow-hidden"
    >
      <div className="h-1.5 w-full bg-stone-200 animate-pulse" />
      <div className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <div className="w-4 h-4 rounded bg-stone-200 animate-pulse mt-1" />
          <div className="w-14 h-14 rounded-xl bg-stone-200 animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-stone-200 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-stone-200 rounded animate-pulse" />
            <div className="h-5 w-16 bg-stone-200 rounded-full animate-pulse" />
          </div>
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 w-2/3 bg-stone-200 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-stone-200 rounded animate-pulse" />
        </div>
        <div className="h-8 w-full bg-stone-100 rounded animate-pulse mt-4" />
      </div>
    </motion.div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Phone, MapPin, Calendar,
  Cake, Edit, ChevronRight,
  MessageCircle,
  CalendarDays, AlertTriangle, HandHeart, Gift
} from 'lucide-react';
import { ministryColors } from '../constants/colors';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import { useCurrentUserProfile, useMember } from '../hooks/useData';
import { useNavigate, useParams } from 'react-router-dom';
import { getMemberStatusConfig } from '../constants/statusConfig';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
  const navigate = useNavigate();
  const { isAdminOrStaff } = useAuth();
  const params = useParams();
  const memberId = params.id ?? null;
  const currentUserProfile = useCurrentUserProfile();
  const memberProfileById = useMember(memberId);

  const { data: memberProfile, isLoading, error } = memberId
    ? memberProfileById
    : currentUserProfile;

  const [imageError, setImageError] = useState(false);

  // Reset image error state when profile data changes
  useEffect(() => {
    setImageError(false);
  }, [memberProfile?.profileImageUrl]);

  // Show loading state
  if (isLoading) {
    return (
      <>
        <Header />
        <ErrorBoundary>
          <main className="p-6 lg:p-8">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
              <p className="text-stone-600">Loading profile...</p>
            </div>
          </main>
        </ErrorBoundary>
      </>
    );
  }

  // Show error state
  if (error || !memberProfile) {
    return (
      <>
        <Header />
        <ErrorBoundary>
          <main className="p-6 lg:p-8">
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-stone-800 mb-2">Unable to Load Profile</h2>
              <p className="text-stone-600">{error || 'Profile not found'}</p>
            </div>
          </main>
        </ErrorBoundary>
      </>
    );
  }

  const name = memberProfile?.name;
  const avatar = name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
  const statusConfig = getMemberStatusConfig(memberProfile?.status || 'pending');
  const ministryGradient =
    (ministryColors as Record<string, string>)[memberProfile?.primaryMinistry ?? ''] ||
    'from-amber-400 to-orange-500';

  const stats = [
    { label: 'Status', value: statusConfig.label, icon: statusConfig.icon, color: statusConfig.color, bg: statusConfig.bg },
    { label: 'Join Date', value: memberProfile?.joinDate ? new Date(memberProfile.joinDate).toLocaleDateString() : 'Unknown', icon: CalendarDays, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Role', value: memberProfile?.role || 'Not assigned', icon: HandHeart, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Primary Ministry', value: memberProfile?.primaryMinistry || 'Not assigned', icon: Gift, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  return (
    <>
      <Header />
      <ErrorBoundary>
      <main className="p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 text-sm text-stone-500 mb-2">
            <span>Members</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-stone-800 font-medium">
              {memberId ? 'Member Profile' : 'My Profile'}
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-stone-800">Member Profile</h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1 space-y-6">
            {/* Main Profile Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 overflow-hidden shadow-lg shadow-stone-200/50"
            >
              {/* Cover & Avatar */}
              <div className={`h-32 bg-gradient-to-r ${ministryGradient} relative`}>
                <div className="absolute -bottom-12 left-6">
                  <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${ministryGradient} flex items-center justify-center text-white font-bold text-3xl shadow-xl border-4 border-white overflow-hidden`}>
                    {memberProfile?.profileImageUrl && !imageError ? (
                      <img
                        src={memberProfile.profileImageUrl}
                        alt={name || 'Profile'}
                        className="w-full h-full object-cover"
                        onError={() => setImageError(true)}
                      />
                    ) : (
                      avatar
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="pt-16 px-6 pb-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-serif font-bold text-stone-800">{name || 'Unknown Member'}</h2>
                    <p className="text-stone-500">{memberProfile?.role || 'Member'}</p>
                  </div>
                  <span className={`px-3 py-1.5 rounded-full ${statusConfig.bg} ${statusConfig.color} text-xs font-medium`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Bio */}
                <p className="text-sm text-stone-600 leading-relaxed mb-6">
                  {memberProfile?.joinDate
                    ? `Member of our church community since ${new Date(memberProfile.joinDate).toLocaleDateString()}.`
                    : 'Welcome to our church community.'}
                </p>

                {/* Actions */}
                <div className="flex gap-3">
                  {memberId ? (
                    <button
                      className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                      onClick={() => navigate('/members')}
                      aria-label="Go back to members list"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      Back to Members
                    </button>
                  ) : (
                    isAdminOrStaff && (
                      <button
                        className="flex-1 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-100 transition-colors flex items-center justify-center gap-2"
                        onClick={() => navigate('/settings')}
                        aria-label="Edit profile information"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </button>
                    )
                  )}
                  <button
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
                    disabled
                    aria-label="Messaging feature coming soon"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Message
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Contact Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6 shadow-lg shadow-stone-200/50"
            >
              <h3 className="text-sm font-semibold text-stone-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-500" />
                Contact Information
              </h3>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Email</p>
                    <p className="text-sm font-medium text-stone-800">{memberProfile?.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Phone</p>
                    <p className="text-sm font-medium text-stone-800">{memberProfile?.phone || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-stone-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-stone-600" />
                  </div>
                  <div>
                    <p className="text-xs text-stone-500">Address</p>
                    <p className="text-sm font-medium text-stone-800">{memberProfile?.address || 'Not provided'}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Details & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-4 shadow-lg shadow-stone-200/50"
                >
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-stone-800">{stat.value}</p>
                  <p className="text-xs text-stone-500 mt-1">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Profile Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6 shadow-lg shadow-stone-200/50"
            >
              <h3 className="text-lg font-semibold text-stone-800 mb-4">Profile Overview</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                  <Cake className="w-4 h-4 text-stone-400" />
                  <div>
                    <p className="text-xs text-stone-500">Date of Birth</p>
                    <p className="text-sm font-medium text-stone-800">
                      {memberProfile?.dateOfBirth ? new Date(memberProfile.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Not provided'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                  <Calendar className="w-4 h-4 text-stone-400" />
                  <div>
                    <p className="text-xs text-stone-500">Member Since</p>
                    <p className="text-sm font-medium text-stone-800">
                      {memberProfile?.joinDate ? new Date(memberProfile.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white/80 backdrop-blur-xl rounded-2xl border border-stone-200/50 p-6 shadow-lg shadow-stone-200/50"
            >
              <h3 className="text-lg font-semibold text-stone-800 mb-4">Ministry Participation</h3>
              {memberProfile?.ministries?.length ? (
                <div className="space-y-3">
                  {memberProfile.ministries.map((link) => (
                    <div
                      key={link.id}
                      className="rounded-2xl border border-stone-200/50 bg-stone-50 p-4"
                    >
                      <p className="text-sm font-semibold text-stone-800">
                        {link.ministryName || 'Unknown ministry'}
                      </p>
                      <p className="text-xs text-stone-500 mt-1">
                        {link.role.charAt(0).toUpperCase() + link.role.slice(1)} • Joined {new Date(link.joinedDate).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-500">This member is not linked to any ministries yet.</p>
              )}
            </motion.div>
          </div>
        </div>
      </main>
      </ErrorBoundary>
    </>
  );
}

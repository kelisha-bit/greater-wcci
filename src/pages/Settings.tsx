import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Church, User, Bell, Shield, Palette, Globe,
  Save, Camera, Mail, Phone, MapPin, Clock, Loader2
} from 'lucide-react';
import Header from '../components/Header';
import ErrorBoundary from '../components/ErrorBoundary';
import { useNotification } from '../hooks/useNotification';
import { useAuth } from '../contexts/AuthContext';
import { membersApi, settingsApi, authApi } from '../services/api';

const tabs = [
  { id: 'general', label: 'General', icon: Church },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'appearance', label: 'Appearance', icon: Palette },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const { show: showToast } = useNotification();
  const { profile, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });

  const [churchData, setChurchData] = useState({
    churchName: '',
    churchEmail: '',
    churchPhone: '',
    churchAddress: '',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'light',
    accentColor: 'amber',
    fontSize: 14,
  });

  const [notifications, setNotifications] = useState([
    { title: 'New Member Registrations', description: 'Get notified when someone joins the church', enabled: true },
    { title: 'Donation Alerts', description: 'Receive notifications for new donations', enabled: true },
    { title: 'Event Reminders', description: 'Reminders for upcoming events', enabled: true },
    { title: 'Prayer Requests', description: 'New prayer requests from members', enabled: false },
    { title: 'Weekly Reports', description: 'Weekly summary of church activities', enabled: true },
    { title: 'Member Anniversaries', description: 'Birthday and membership anniversaries', enabled: false },
  ]);

  const [serviceTimes, setServiceTimes] = useState([
    { id: 1, title: 'Sunday Service', time: '10:00 AM - 11:30 AM', editing: false },
    { id: 2, title: 'Wednesday Bible Study', time: '7:00 PM - 8:30 PM', editing: false },
  ]);

  const [sessions, setSessions] = useState([
    { id: 1, device: 'Chrome on MacOS', lastActive: 'Current session', isActive: true },
    { id: 2, device: 'Safari on iPhone', lastActive: 'Last active 2 hours ago', isActive: false },
  ]);

  const handleUpdatePassword = async () => {
     if (!passwords.new) {
       showToast('error', 'Required Field', 'Please enter a new password.');
       return;
     }
     if (passwords.new !== passwords.confirm) {
       showToast('error', 'Password Mismatch', 'New passwords do not match.');
       return;
     }
 
     setIsSaving(true);
     try {
       const response = await authApi.updatePassword(passwords.new);
       if (response.success) {
         showToast('success', 'Password Updated', 'Your password has been successfully updated.');
         setPasswords({ current: '', new: '', confirm: '' });
       } else {
        showToast('error', 'Update Failed', response.error || 'Failed to update password.');
      }
    } catch {
      showToast('error', 'Error', 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (profile) {
      setProfileData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        role: profile.role || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await settingsApi.getSettings();
        if (response.success && response.data) {
          setChurchData({
            churchName: response.data.churchName || '',
            churchEmail: response.data.churchEmail || '',
            churchPhone: response.data.churchPhone || '',
            churchAddress: response.data.churchAddress || '',
          });
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        // Loading complete
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let success = true;
      let errorMessage = '';

      if (activeTab === 'profile' && profile?.id) {
        const response = await membersApi.updateMember(profile.id, {
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          role: profileData.role,
        });
        if (response.success) {
          await refreshProfile();
        } else {
          success = false;
          errorMessage = response.error || 'Failed to update profile.';
        }
      } else if (activeTab === 'general') {
        const response = await settingsApi.updateSettings({
          churchName: churchData.churchName,
          churchEmail: churchData.churchEmail,
          churchPhone: churchData.churchPhone,
          churchAddress: churchData.churchAddress,
        });
        if (!response.success) {
          success = false;
          errorMessage = response.error || 'Failed to update church settings.';
        }
      } else if (activeTab === 'appearance') {
        // Apply appearance settings immediately
        applyAppearanceSettings();
        showToast('success', 'Appearance Updated', 'Your appearance preferences have been applied.');
      }

      if (success) {
        showToast('success', 'Settings Saved', 'Your changes have been successfully applied.');
      } else {
        showToast('error', 'Update Failed', errorMessage);
      }
    } catch {
      showToast('error', 'Error', 'An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    setIsUploading(true);
    try {
      const response = await membersApi.uploadAndSetProfilePhoto(profile.id, file);
      if (response.success) {
        await refreshProfile();
        showToast('success', 'Photo Updated', 'Your profile photo has been successfully updated.');
      } else {
        showToast('error', 'Upload Failed', response.error || 'Failed to upload photo.');
      }
    } catch {
      showToast('error', 'Error', 'An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyAppearanceSettings = () => {
    // Apply theme
    document.documentElement.classList.remove('light', 'dark');
    if (appearanceSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (appearanceSettings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.classList.add('light');
    }

    // Apply font size
    document.documentElement.style.fontSize = `${appearanceSettings.fontSize}px`;
  };

  const handleThemeChange = (theme: string) => {
    setAppearanceSettings(prev => ({ ...prev, theme }));
  };

  const handleAccentColorChange = (color: string) => {
    setAppearanceSettings(prev => ({ ...prev, accentColor: color }));
  };

  const handleFontSizeChange = (size: number) => {
    setAppearanceSettings(prev => ({ ...prev, fontSize: size }));
  };

  const handleNotificationToggle = (index: number) => {
    setNotifications(prev => prev.map((notif, i) => 
      i === index ? { ...notif, enabled: !notif.enabled } : notif
    ));
  };

  const handleServiceTimeEdit = (id: number) => {
    setServiceTimes(prev => prev.map(service => 
      service.id === id ? { ...service, editing: !service.editing } : service
    ));
  };

  const handleServiceTimeSave = (id: number, newTime: string) => {
    setServiceTimes(prev => prev.map(service => 
      service.id === id ? { ...service, time: newTime, editing: false } : service
    ));
    showToast('success', 'Service Time Updated', 'Service time has been updated successfully.');
  };

  const handleSessionRevoke = (id: number) => {
    setSessions(prev => prev.filter(session => session.id !== id));
    showToast('success', 'Session Revoked', 'The session has been successfully revoked.');
  };

  const avatar = profileData.name 
    ? profileData.name.split(' ').map(n => n[0]).join('').toUpperCase() 
    : '??';

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
          <h1 className="text-3xl font-serif font-bold text-stone-800">Settings</h1>
          <p className="text-stone-600 mt-1">Manage your church settings and preferences</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Tabs */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-64 flex-shrink-0"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1"
          >
            <div className="bg-white/80 backdrop-blur-xl rounded-xl border border-stone-200/50 p-6">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-serif font-bold text-stone-800 mb-4">Church Information</h2>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Church Name</label>
                        <input
                          type="text"
                          value={churchData.churchName}
                          onChange={(e) => setChurchData(prev => ({ ...prev, churchName: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                          placeholder="Grace Community Church"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Denomination</label>
                        <input
                          type="text"
                          defaultValue="Non-Denominational"
                          className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input
                            type="email"
                            value={churchData.churchEmail}
                            onChange={(e) => setChurchData(prev => ({ ...prev, churchEmail: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            placeholder="info@gracechurch.org"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input
                            type="tel"
                            value={churchData.churchPhone}
                            onChange={(e) => setChurchData(prev => ({ ...prev, churchPhone: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            placeholder="(555) 123-4567"
                          />
                        </div>
                      </div>
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 w-4 h-4 text-stone-400" />
                          <textarea
                            rows={2}
                            value={churchData.churchAddress}
                            onChange={(e) => setChurchData(prev => ({ ...prev, churchAddress: e.target.value }))}
                            className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            placeholder="123 Faith Avenue, Grace City, GC 12345"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-stone-100 pt-6">
                    <h3 className="text-md font-semibold text-stone-800 mb-4">Service Times</h3>
                    <div className="space-y-3">
                      {serviceTimes.map((service) => (
                        <div key={service.id} className="flex items-center gap-4 p-3 bg-stone-50 rounded-xl">
                          <Clock className="w-5 h-5 text-amber-500" />
                          <div className="flex-1">
                            <p className="font-medium text-stone-800">{service.title}</p>
                            {service.editing ? (
                              <input
                                type="text"
                                defaultValue={service.time}
                                className="text-sm text-stone-600 bg-white border border-stone-200 rounded px-2 py-1 w-full"
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleServiceTimeSave(service.id, (e.target as HTMLInputElement).value);
                                  }
                                }}
                                onBlur={(e) => handleServiceTimeSave(service.id, e.target.value)}
                                autoFocus
                              />
                            ) : (
                              <p className="text-sm text-stone-500">{service.time}</p>
                            )}
                          </div>
                          <button 
                            onClick={() => handleServiceTimeEdit(service.id)}
                            className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                          >
                            {service.editing ? 'Cancel' : 'Edit'}
                          </button>
                        </div>
                      ))}
                      <button className="w-full py-2.5 rounded-xl border border-dashed border-stone-300 text-stone-500 text-sm hover:bg-stone-50 transition-colors">
                        + Add Service Time
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-serif font-bold text-stone-800 mb-4">Profile Settings</h2>
                  
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold overflow-hidden shadow-lg border-2 border-white">
                        {profile?.profileImageUrl ? (
                          <img 
                            src={profile.profileImageUrl} 
                            alt={profileData.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          avatar
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePhotoUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <button 
                        onClick={handlePhotoClick}
                        disabled={isUploading}
                        className="absolute -bottom-2 -right-2 p-2 rounded-lg bg-white border border-stone-200 shadow-md hover:bg-stone-50 transition-colors disabled:opacity-50"
                      >
                        <Camera className="w-4 h-4 text-stone-600" />
                      </button>
                    </div>
                    <div>
                      <h3 className="font-semibold text-stone-800">{profileData.name || 'Your Name'}</h3>
                      <p className="text-sm text-stone-500">{profileData.role || 'Member'}</p>
                      <button 
                        onClick={handlePhotoClick}
                        disabled={isUploading}
                        className="mt-2 text-sm text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
                      >
                        {isUploading ? 'Uploading...' : 'Change Photo'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        placeholder="pastor@gracechurch.org"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Role</label>
                      <select 
                        value={profileData.role}
                        onChange={(e) => setProfileData(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      >
                        <option value="">Select Role</option>
                        <option value="Senior Pastor">Senior Pastor</option>
                        <option value="Associate Pastor">Associate Pastor</option>
                        <option value="Admin">Admin</option>
                        <option value="Volunteer">Volunteer</option>
                        <option value="Member">Member</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-serif font-bold text-stone-800 mb-4">Notification Preferences</h2>
                  
                  <div className="space-y-4">
                    {notifications.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                        <div>
                          <p className="font-medium text-stone-800">{item.title}</p>
                          <p className="text-sm text-stone-500">{item.description}</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={item.enabled}
                            onChange={() => handleNotificationToggle(index)}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-serif font-bold text-stone-800 mb-4">Security Settings</h2>
                  
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="text-sm text-amber-800">
                      <strong>Two-Factor Authentication</strong> is currently enabled on your account.
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-stone-800 mb-4">Change Password</h3>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Current Password</label>
                        <input
                          type="password"
                          value={passwords.current}
                          onChange={(e) => setPasswords(prev => ({ ...prev, current: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">New Password</label>
                        <input
                          type="password"
                          value={passwords.new}
                          onChange={(e) => setPasswords(prev => ({ ...prev, new: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwords.confirm}
                          onChange={(e) => setPasswords(prev => ({ ...prev, confirm: e.target.value }))}
                          className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                      <button 
                        onClick={handleUpdatePassword}
                        disabled={isSaving}
                        className="px-4 py-2.5 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-900 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isSaving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-stone-100 pt-6">
                    <h3 className="font-semibold text-stone-800 mb-4">Active Sessions</h3>
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg ${session.isActive ? 'bg-emerald-100' : 'bg-blue-100'} flex items-center justify-center`}>
                              <Globe className={`w-4 h-4 ${session.isActive ? 'text-emerald-600' : 'text-blue-600'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-stone-800">{session.device}</p>
                              <p className="text-xs text-stone-500">{session.lastActive}</p>
                            </div>
                          </div>
                          {session.isActive ? (
                            <span className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium">Active</span>
                          ) : (
                            <button 
                              onClick={() => handleSessionRevoke(session.id)}
                              className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div className="space-y-6">
                  <h2 className="text-lg font-serif font-bold text-stone-800 mb-4">Appearance Settings</h2>
                  
                  <div>
                    <h3 className="font-semibold text-stone-800 mb-4">Theme</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <button 
                        onClick={() => handleThemeChange('light')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          appearanceSettings.theme === 'light' 
                            ? 'border-amber-500 bg-white ring-2 ring-amber-500/20' 
                            : 'border-stone-200 bg-white hover:border-stone-300'
                        }`}
                      >
                        <p className="text-sm font-medium text-stone-800">Light</p>
                      </button>
                      <button 
                        onClick={() => handleThemeChange('dark')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          appearanceSettings.theme === 'dark' 
                            ? 'border-amber-500 bg-stone-800 ring-2 ring-amber-500/20' 
                            : 'border-stone-200 bg-stone-800 hover:border-stone-300'
                        }`}
                      >
                        <p className="text-sm font-medium text-white">Dark</p>
                      </button>
                      <button 
                        onClick={() => handleThemeChange('system')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          appearanceSettings.theme === 'system' 
                            ? 'border-amber-500 bg-gradient-to-r from-white to-stone-800 ring-2 ring-amber-500/20' 
                            : 'border-stone-200 bg-gradient-to-r from-white to-stone-800 hover:border-stone-300'
                        }`}
                      >
                        <p className="text-sm font-medium text-stone-600">System</p>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-stone-800 mb-4">Accent Color</h3>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => handleAccentColorChange('amber')}
                        className={`w-10 h-10 rounded-lg bg-amber-500 hover:scale-110 transition-transform ${
                          appearanceSettings.accentColor === 'amber' ? 'ring-2 ring-offset-2 ring-amber-500/30' : ''
                        }`} 
                        title="Amber" 
                      />
                      <button 
                        onClick={() => handleAccentColorChange('blue')}
                        className={`w-10 h-10 rounded-lg bg-blue-500 hover:scale-110 transition-transform ${
                          appearanceSettings.accentColor === 'blue' ? 'ring-2 ring-offset-2 ring-blue-500/30' : ''
                        }`} 
                        title="Blue" 
                      />
                      <button 
                        onClick={() => handleAccentColorChange('emerald')}
                        className={`w-10 h-10 rounded-lg bg-emerald-500 hover:scale-110 transition-transform ${
                          appearanceSettings.accentColor === 'emerald' ? 'ring-2 ring-offset-2 ring-emerald-500/30' : ''
                        }`} 
                        title="Emerald" 
                      />
                      <button 
                        onClick={() => handleAccentColorChange('rose')}
                        className={`w-10 h-10 rounded-lg bg-rose-500 hover:scale-110 transition-transform ${
                          appearanceSettings.accentColor === 'rose' ? 'ring-2 ring-offset-2 ring-rose-500/30' : ''
                        }`} 
                        title="Rose" 
                      />
                      <button 
                        onClick={() => handleAccentColorChange('violet')}
                        className={`w-10 h-10 rounded-lg bg-violet-500 hover:scale-110 transition-transform ${
                          appearanceSettings.accentColor === 'violet' ? 'ring-2 ring-offset-2 ring-violet-500/30' : ''
                        }`} 
                        title="Violet" 
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-stone-800 mb-4">Font Size</h3>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-stone-500">A</span>
                      <input
                        type="range"
                        min="12"
                        max="18"
                        value={appearanceSettings.fontSize}
                        onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                        className="flex-1 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <span className="text-lg text-stone-500">A</span>
                      <span className="text-sm text-stone-600 font-medium min-w-[3rem]">{appearanceSettings.fontSize}px</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t border-stone-100">
                <button
                  onClick={handleSave}
                  disabled={isSaving || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      </ErrorBoundary>
    </>
  );
}

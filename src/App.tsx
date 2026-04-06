import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { UIProvider, useUI } from './contexts/UIContext';
import { APIProvider } from './contexts/APIContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Notification } from './components/Notifications';

// Lazy load pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const Events = lazy(() => import('./pages/Events'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Donations = lazy(() => import('./pages/Donations'));
const Sermons = lazy(() => import('./pages/Sermons'));
const Reports = lazy(() => import('./pages/Reports'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));

/**
 * Layout: sidebar + outlet for child routes (requires auth — see AppRoutes).
 */
function AppLayout() {
  const { sidebarOpen, notification, hideNotification } = useUI();

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100">
      <Sidebar />
      <div className={`min-h-screen min-w-0 transition-all duration-300 ml-0 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Outlet />
      </div>
      <div className="fixed bottom-6 right-6 z-[60]">
        <Notification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          isVisible={notification.isVisible}
          onDismiss={hideNotification}
        />
      </div>
    </div>
  );
}

function AppRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100">
        <p className="text-stone-600">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-stone-50"><p className="text-stone-500">Loading…</p></div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-stone-50"><p className="text-stone-500">Loading…</p></div>}>
      <Routes>
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/events" element={<Events />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/donations" element={<Donations />} />
          <Route path="/sermons" element={<Sermons />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/announcements" element={<Announcements />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/members/:id" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <APIProvider>
            <UIProvider>
              <AppRoutes />
            </UIProvider>
          </APIProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

// Simple 404 Not Found component
function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-serif font-bold text-stone-300 mb-4">404</h1>
        <p className="text-xl text-stone-600 mb-6">Page not found</p>
        <a
          href="/"
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-shadow"
        >
          Go Home
        </a>
      </div>
    </div>
  );
}

export default App;

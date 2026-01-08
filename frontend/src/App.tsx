import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

// Pages
import LandingPage from './pages/landing/LandingPage';
import HomePage from './pages/home/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import EventsPage from './pages/events/EventsPage';
import EventDetailPage from './pages/events/EventDetailPage';
import TourProviderDetailPage from './pages/tour-providers/TourProviderDetailPage';
import MapPage from './pages/map/MapPage';
import ProfilePage from './pages/profile/ProfilePage';
import RoleUpgradePage from './pages/profile/RoleUpgradePage';
import ChatPage from './pages/chat/ChatPage';
import MyEventsPage from './pages/provider/MyEventsPage';
import EventFormPage from './pages/provider/EventFormPage';
import MyListingsPage from './pages/provider/MyListingsPage';
import ListingFormPage from './pages/provider/ListingFormPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagementPage from './pages/admin/UserManagementPage';
import UpgradeRequestsPage from './pages/admin/UpgradeRequestsPage';
import TourProviderModerationPage from './pages/admin/TourProviderModerationPage';
import AdminEventsPage from './pages/admin/AdminEventsPage';

// Inner component that uses auth context
function AppContent() {
  const { isLoading, isAuthenticated } = useAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="app-loading">
        <LoadingSpinner size="large" />
        <p>Đang tải...</p>
      </div>
    );
  }

  // If not authenticated, show only landing page, login, and register
  if (!isAuthenticated) {
    return (
      <MainLayout>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          {/* Redirect all other routes to landing page */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    );
  }

  // Authenticated routes
  return (
    <MainLayout>
      <Routes>
        {/* Authenticated Home */}
        <Route path="/" element={<HomePage />} />

        {/* Auth pages redirect to home when logged in */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />

        {/* Main Content Routes */}
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route path="/tour-providers/:id" element={<TourProviderDetailPage />} />
        <Route path="/map" element={<MapPage />} />

        {/* User Routes */}
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/profile/upgrade" element={<RoleUpgradePage />} />
        <Route path="/chat" element={<ChatPage />} />

        {/* Event Provider Routes */}
        <Route
          path="/my-events"
          element={
            <ProtectedRoute requiredRoles={['Event Provider']}>
              <MyEventsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-events/new"
          element={
            <ProtectedRoute requiredRoles={['Event Provider']}>
              <EventFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-events/:id/edit"
          element={
            <ProtectedRoute requiredRoles={['Event Provider']}>
              <EventFormPage />
            </ProtectedRoute>
          }
        />

        {/* Tour Provider Routes */}
        <Route
          path="/my-listings"
          element={
            <ProtectedRoute requiredRoles={['Tour Provider']}>
              <MyListingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-listings/new"
          element={
            <ProtectedRoute requiredRoles={['Tour Provider']}>
              <ListingFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-listings/:id/edit"
          element={
            <ProtectedRoute requiredRoles={['Tour Provider']}>
              <ListingFormPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute requireAdmin>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/upgrade-requests"
          element={
            <ProtectedRoute requireAdmin>
              <UpgradeRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tour-providers"
          element={
            <ProtectedRoute requireAdmin>
              <TourProviderModerationPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute requireAdmin>
              <AdminEventsPage />
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </MainLayout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { YearFilterProvider } from '@/contexts/YearFilterContext';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import NotFoundPage from '@/pages/NotFoundPage';
import AccessDeniedPage from '@/pages/AccessDeniedPage';
import AdminLayout from '@/layouts/AdminLayout';
import StaffLayout from '@/layouts/StaffLayout';
import { AdminRoute } from '@/components/auth/AdminRoute';
import { StaffRoute } from '@/components/auth/StaffRoute';
import { DirectRouteRedirect } from '@/components/auth/DirectRouteRedirect';

// Admin Pages
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminStaff from '@/pages/admin/Staff';
import AdminSubjects from '@/pages/admin/Subjects';
import AdminLabs from '@/pages/admin/Labs';
import AdminRooms from '@/pages/admin/Rooms';
import AdminTimeSlots from '@/pages/admin/TimeSlots';
import AdminRules from '@/pages/admin/Rules';
import AdminSpecialSessions from '@/pages/admin/SpecialSessions';
import AdminGenerate from '@/pages/admin/Generate';
import AdminTimetable from '@/pages/admin/Timetable';
import AdminNotifications from '@/pages/admin/Notifications';
import AdminHistory from '@/pages/admin/History';
import AdminUsers from '@/pages/admin/Users';
import AdminSettings from '@/pages/admin/Settings';

// Staff Pages
import StaffDashboard from '@/pages/staff/Dashboard';
import StaffTimetable from '@/pages/staff/Timetable';
import StaffSubjects from '@/pages/staff/Subjects';
import StaffHours from '@/pages/staff/Hours';
import StaffDepartmentTimetable from '@/pages/staff/DepartmentTimetable';
import StaffNotifications from '@/pages/staff/Notifications';
import StaffProfile from '@/pages/staff/Profile';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <YearFilterProvider>
            <Router>
              <OfflineBanner />
              <Toaster position="top-right" />
              <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/access-denied" element={<AccessDeniedPage />} />

              {/* Direct Protected Routes (Protected by Centralized Session Guard) */}
              <Route path="/dashboard" element={<DirectRouteRedirect adminTarget="/admin/dashboard" staffTarget="/staff/dashboard" />} />
              <Route path="/timetable" element={<DirectRouteRedirect adminTarget="/admin/timetable" staffTarget="/staff/timetable" />} />
              <Route path="/generate" element={<DirectRouteRedirect adminTarget="/admin/generate" requiredRole="admin" />} />
              <Route path="/staff" element={<DirectRouteRedirect adminTarget="/admin/staff" requiredRole="admin" />} />
              <Route path="/subjects" element={<DirectRouteRedirect adminTarget="/admin/subjects" staffTarget="/staff/subjects" />} />
              <Route path="/labs" element={<DirectRouteRedirect adminTarget="/admin/labs" requiredRole="admin" />} />
              <Route path="/rooms" element={<DirectRouteRedirect adminTarget="/admin/rooms" requiredRole="admin" />} />
              <Route path="/time-slots" element={<DirectRouteRedirect adminTarget="/admin/time-slots" requiredRole="admin" />} />
              <Route path="/scheduling-rules" element={<DirectRouteRedirect adminTarget="/admin/rules" requiredRole="admin" />} />
              <Route path="/rules" element={<DirectRouteRedirect adminTarget="/admin/rules" requiredRole="admin" />} />
              <Route path="/special-sessions" element={<DirectRouteRedirect adminTarget="/admin/special-sessions" requiredRole="admin" />} />
              <Route path="/notifications" element={<DirectRouteRedirect adminTarget="/admin/notifications" staffTarget="/staff/notifications" />} />
              <Route path="/history" element={<DirectRouteRedirect adminTarget="/admin/history" requiredRole="admin" />} />
              <Route path="/users" element={<DirectRouteRedirect adminTarget="/admin/users" requiredRole="admin" />} />
              <Route path="/settings" element={<DirectRouteRedirect adminTarget="/admin/settings" requiredRole="admin" />} />

              {/* Admin Routes */}
              <Route path="/admin" element={<AdminRoute />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="analytics" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="timetable" element={<AdminTimetable />} />
                  <Route path="generate" element={<AdminGenerate />} />
                  <Route path="staff" element={<AdminStaff />} />
                  <Route path="subjects" element={<AdminSubjects />} />
                  <Route path="labs" element={<AdminLabs />} />
                  <Route path="rooms" element={<AdminRooms />} />
                  <Route path="time-slots" element={<AdminTimeSlots />} />
                  <Route path="rules" element={<AdminRules />} />
                  <Route path="special-sessions" element={<AdminSpecialSessions />} />
                  <Route path="notifications" element={<AdminNotifications />} />
                  <Route path="audit" element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="history" element={<AdminHistory />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
              </Route>

              {/* Staff Routes */}
              <Route path="/staff" element={<StaffRoute />}>
                <Route element={<StaffLayout />}>
                  <Route index element={<Navigate to="/staff/dashboard" replace />} />
                  <Route path="dashboard" element={<StaffDashboard />} />
                  <Route path="timetable" element={<StaffTimetable />} />
                  <Route path="department-timetable" element={<StaffDepartmentTimetable />} />
                  <Route path="subjects" element={<StaffSubjects />} />
                  <Route path="hours" element={<StaffHours />} />
                  <Route path="notifications" element={<StaffNotifications />} />
                  <Route path="profile" element={<StaffProfile />} />
                </Route>
              </Route>

              {/* 404 Not Found */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </YearFilterProvider>
      </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

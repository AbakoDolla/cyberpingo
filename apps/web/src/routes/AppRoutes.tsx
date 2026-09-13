import { Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import ChallengePage from '@/pages/Challenge';
import CoursePage from '@/pages/Course';
import CoursesPage from '@/pages/Courses';
import DashboardPage from '@/pages/Dashboard';
import LandingPage from '@/pages/Landing';
import LeaderboardPage from '@/pages/Leaderboard';
import LessonPage from '@/pages/Lesson';
import LoginPage from '@/pages/Login';
import ProfilePage from '@/pages/Profile';
import RegisterPage from '@/pages/Register';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

/** Single source of truth for the CyberPingo route map. */
export const AppRoutes = (): JSX.Element => (
  <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />

    <Route element={<AppLayout />}>
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/courses/:courseId" element={<CoursePage />} />
      <Route path="/lessons/:lessonId" element={<LessonPage />} />
      <Route path="/challenges/:challengeId" element={<ChallengePage />} />
      <Route path="/leaderboard" element={<LeaderboardPage />} />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
    </Route>

    <Route path="*" element={<LandingPage />} />
  </Routes>
);

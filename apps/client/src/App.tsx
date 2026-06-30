import { Navigate, Route, Routes } from "react-router-dom";
import { useBootstrapAuth } from "@/features/auth/use-bootstrap-auth";
import { ProtectedRoute } from "@/components/layout/protected-route";
import { AdminLayout } from "@/components/layout/admin-layout";
import LoginPage from "@/features/auth/login-page";
import DashboardPage from "@/features/dashboard/dashboard-page";
import QuizBuilderPage from "@/features/quiz-builder/quiz-builder-page";
import LiveControlPage from "@/features/live-control/live-control-page";
import AnalyticsPage from "@/features/analytics/analytics-page";
import JoinPage from "@/features/participant/join-page";
import PlayPage from "@/features/participant/play-page";

export default function App() {
  useBootstrapAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/join" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/join" element={<JoinPage />} />
      <Route path="/join/:joinCode" element={<JoinPage />} />
      <Route path="/play/:eventId" element={<PlayPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/quizzes/:quizId" element={<QuizBuilderPage />} />
          <Route path="/admin/events/:eventId/control" element={<LiveControlPage />} />
          <Route path="/admin/events/:eventId/analytics" element={<AnalyticsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

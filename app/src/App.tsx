import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/controllers/useAuth";
import { ThemeProvider } from "@/controllers/useTheme";
import { LandingView } from "@/views/LandingView";
import { LoginView } from "@/views/LoginView";
import { RequestAccessView } from "@/views/RequestAccessView";
import { DashboardView } from "@/views/DashboardView";
import type { ReactNode } from "react";

/** Redirects to /login when there is no authenticated session. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<LandingView />} />
      <Route path="/login" element={<LoginView />} />
      <Route path="/request-access" element={<RequestAccessView />} />

      {/* Authenticated */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <DashboardView />
          </RequireAuth>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

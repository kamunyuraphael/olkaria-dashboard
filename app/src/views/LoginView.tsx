import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
  AuthLayout,
  AuthButton,
  AuthError,
  authInputClass,
  authLabelClass,
} from "@/components/layout/AuthLayout";
import { useAuth } from "@/controllers/useAuth";

export function LoginView() {
  const { login, isLoading, error, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async () => {
    await login({ email, password });
  };

  if (isAuthenticated) return <Navigate to="/app" replace />;

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access the analysis dashboard with your approved account."
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/request-access" className="text-[var(--color-primary)] font-medium hover:underline">
            Request access
          </Link>
        </>
      }
    >
      <AuthError message={error} />
      <div className="flex flex-col gap-4">
        <div>
          <label className={authLabelClass}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="you@institution.ac.ke"
            className={authInputClass}
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-[var(--color-text-secondary)]">Password</label>
            <button className="text-xs text-[var(--color-primary)] hover:underline cursor-pointer">Forgot?</button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="••••••••"
            className={authInputClass}
          />
        </div>
        <AuthButton onClick={submit} disabled={isLoading}>
          {isLoading ? "Signing in…" : "Sign in"}
        </AuthButton>
      </div>
    </AuthLayout>
  );
}

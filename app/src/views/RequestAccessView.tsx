import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AuthLayout,
  AuthButton,
  AuthError,
  authInputClass,
  authLabelClass,
} from "@/components/layout/AuthLayout";
import { useAuth } from "@/controllers/useAuth";
import type { AccessRequest, UserRole } from "@/models/auth.types";

export function RequestAccessView() {
  const { requestAccess, isLoading, error } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<AccessRequest>({
    name: "",
    email: "",
    institution: "",
    role: "researcher",
    purpose: "",
  });

  const set = <K extends keyof AccessRequest>(key: K, value: AccessRequest[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    await requestAccess(form);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <AuthLayout
        title="Request submitted"
        subtitle="Your access request is now pending review."
        footer={
          <Link to="/" className="text-[var(--color-primary)] font-medium hover:underline">
            Back to home
          </Link>
        }
      >
        <div className="px-4 py-3.5 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--color-warning-subtle)] text-[var(--color-warning)] text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-warning)]" />
              Pending review
            </span>
          </div>
          <p className="text-sm text-[var(--color-text-tertiary)] leading-relaxed">
            We'll email {form.email || "you"} once an administrator has reviewed the request. Approval is
            manual because each analysis run fits models on demand.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Request access"
      subtitle="Accounts are approved individually. Tell us who you are and what you plan to use the tool for."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-[var(--color-primary)] font-medium hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <AuthError message={error} />
      <div className="flex flex-col gap-4">
        <div>
          <label className={authLabelClass}>Full name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Jane Wanjiru"
            className={authInputClass}
          />
        </div>
        <div>
          <label className={authLabelClass}>Institutional email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@institution.ac.ke"
            className={authInputClass}
          />
        </div>
        <div>
          <label className={authLabelClass}>Institution / organisation</label>
          <input
            type="text"
            value={form.institution}
            onChange={(e) => set("institution", e.target.value)}
            placeholder="Mount Kenya University"
            className={authInputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-2">Primary role</label>
          <div className="flex gap-2">
            {(["researcher", "policy"] as const).map((r) => (
              <button
                key={r}
                onClick={() => set("role", r as Exclude<UserRole, "admin">)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-150 border cursor-pointer ${
                  form.role === r
                    ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                    : "bg-[var(--color-surface)] text-[var(--color-text-tertiary)] border-[var(--color-border)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                }`}
              >
                {r === "researcher" ? "Researcher" : "Policy maker"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={authLabelClass}>Intended use</label>
          <textarea
            value={form.purpose}
            onChange={(e) => set("purpose", e.target.value)}
            rows={3}
            placeholder="Which sites and gases are you studying, and what will the outputs support?"
            className={`${authInputClass} resize-none`}
          />
        </div>
        <AuthButton onClick={submit} disabled={isLoading}>
          {isLoading ? "Submitting…" : "Submit request"}
        </AuthButton>
      </div>
    </AuthLayout>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageShell, outlineBtn, primaryBtn } from "@/components/ui/PageShell";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/controllers/useAuth";
import {
  listUsers, updateUser, resetUserPassword, deleteUser,
  listAccessRequests, approveAccessRequest, rejectAccessRequest,
} from "@/lib/adminClient";
import { timeAgo } from "@/components/results/JobBits";
import type { AdminUser, AccessRequestRow } from "@/models/auth.types";

type Tab = "requests" | "users";
type Pending =
  | { kind: "delete"; user: AdminUser }
  | { kind: "reset"; user: AdminUser }
  | { kind: "reject"; req: AccessRequestRow };

function errText(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong.";
}

/** Shows a one-time temporary password the admin must hand to the person. */
function PasswordReveal({ who, password, emailed, onClose }: { who: string; password: string; emailed?: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <ConfirmDialog title="Temporary password" confirmLabel="Done" onConfirm={onClose} onCancel={onClose}>
      <p>
        Give this to <strong>{who}</strong> through a private channel. It is shown only once, and they will be asked to
        choose their own password at first sign-in.
      </p>
      <p className="mt-2 text-xs text-[var(--color-text-tertiary)]">
        {emailed ? "It was also emailed to them." : "Email isn't set up, so it was not emailed. Share it yourself."}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 px-3 py-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] font-mono text-sm text-[var(--color-text-primary)] break-all">
          {password}
        </code>
        <button
          onClick={() => {
            void navigator.clipboard?.writeText(password).then(() => setCopied(true));
          }}
          className={outlineBtn}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </ConfirmDialog>
  );
}

export function AdminView() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState<Tab>("requests");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<AccessRequestRow[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [reveal, setReveal] = useState<{ who: string; password: string; emailed?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [u, r] = await Promise.all([listUsers(), listAccessRequests("pending")]);
      setUsers(u);
      setRequests(r);
      setError(null);
    } catch (e) {
      setError(errText(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError(errText(e));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const approve = (r: AccessRequestRow) =>
    run(async () => {
      const { temporaryPassword, emailed } = await approveAccessRequest(r.id);
      setReveal({ who: r.name, password: temporaryPassword, emailed });
    });

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === "delete") return run(async () => void (await deleteUser(pending.user.id)));
    if (pending.kind === "reject") return run(async () => void (await rejectAccessRequest(pending.req.id)));
    return run(async () => {
      const { temporaryPassword, emailed } = await resetUserPassword(pending.user.id);
      setReveal({ who: pending.user.name, password: temporaryPassword, emailed });
    });
  };

  return (
    <PageShell title="Admin" subtitle="Approve access requests and manage accounts" wide>
      <div className="flex gap-1.5">
        {(["requests", "users"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-medium border cursor-pointer transition-colors ${
              tab === t
                ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                : "bg-[var(--color-surface)] text-[var(--color-text-tertiary)] border-[var(--color-border)]"
            }`}
          >
            {t === "requests" ? `Requests ${requests.length}` : `Users ${users.length}`}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

      {tab === "requests" && (
        <div className="flex flex-col gap-2">
          {requests.length === 0 && (
            <Card className="p-8 text-center text-sm text-[var(--color-text-tertiary)]">No pending requests.</Card>
          )}
          {requests.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    {r.name} <span className="font-normal text-[var(--color-text-quaternary)]">· {r.role}</span>
                  </p>
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 break-all">
                    {r.email} · {r.institution} · {timeAgo(r.createdAt)}
                  </p>
                  <p className="text-sm text-[var(--color-text-secondary)] mt-2 leading-relaxed">{r.purpose}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => approve(r)} disabled={busy} className={`${primaryBtn} !py-2`}>
                    Approve
                  </button>
                  <button onClick={() => setPending({ kind: "reject", req: r })} disabled={busy} className={outlineBtn}>
                    Reject
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="flex flex-col gap-2">
          {users.map((u) => {
            const isMe = u.id === me?.id;
            return (
              <Card key={u.id} className={`p-4 ${u.disabled ? "opacity-70" : ""}`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {u.name}
                      {isMe && <span className="ml-2 text-xs font-normal text-[var(--color-text-quaternary)]">(you)</span>}
                      {u.disabled && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--color-danger-subtle)] text-[var(--color-danger)]">
                          Disabled
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 break-all">
                      {u.email} · {u.institution}
                    </p>
                    <p className="text-[11px] text-[var(--color-text-quaternary)] mt-0.5">
                      {u.runs} run{u.runs === 1 ? "" : "s"} · {u.lastLoginAt ? `last sign-in ${timeAgo(u.lastLoginAt)}` : "never signed in"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={u.role}
                      disabled={busy || isMe}
                      onChange={(e) => run(() => updateUser(u.id, { role: e.target.value }).then(() => undefined))}
                      className="px-2.5 py-2 text-sm border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)] cursor-pointer"
                      aria-label={`Role for ${u.name}`}
                    >
                      <option value="researcher">Researcher</option>
                      <option value="policy">Policy maker</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button onClick={() => setPending({ kind: "reset", user: u })} disabled={busy} className={outlineBtn}>
                      Reset password
                    </button>
                    {!isMe && (
                      <>
                        <button
                          onClick={() => run(() => updateUser(u.id, { disabled: !u.disabled }).then(() => undefined))}
                          disabled={busy}
                          className={outlineBtn}
                        >
                          {u.disabled ? "Enable" : "Disable"}
                        </button>
                        <button
                          onClick={() => setPending({ kind: "delete", user: u })}
                          disabled={busy}
                          className={`${outlineBtn} !border-[var(--color-danger)] !text-[var(--color-danger)]`}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {pending?.kind === "delete" && (
        <ConfirmDialog title={`Delete ${pending.user.name}?`} confirmLabel="Delete permanently" danger busy={busy} onConfirm={confirm} onCancel={() => setPending(null)}>
          This removes the account and all {pending.user.runs} of their runs, results and uploaded files. It can't be undone.
          To keep their data, use <strong>Disable</strong> instead.
        </ConfirmDialog>
      )}
      {pending?.kind === "reset" && (
        <ConfirmDialog title={`Reset ${pending.user.name}'s password?`} confirmLabel="Reset" busy={busy} onConfirm={confirm} onCancel={() => setPending(null)}>
          Their current password stops working immediately and a temporary one is generated.
        </ConfirmDialog>
      )}
      {pending?.kind === "reject" && (
        <ConfirmDialog title="Reject this request?" confirmLabel="Reject" danger busy={busy} onConfirm={confirm} onCancel={() => setPending(null)}>
          {pending.req.name} ({pending.req.email}) will not get an account.
        </ConfirmDialog>
      )}
      {reveal && <PasswordReveal who={reveal.who} password={reveal.password} emailed={reveal.emailed} onClose={() => setReveal(null)} />}
    </PageShell>
  );
}

import { apiGet, apiPostJson } from "@/lib/apiClient";
import type { AdminUser, AccessRequestRow } from "@/models/auth.types";

export async function changePasswordRequest(currentPassword: string, newPassword: string) {
  const r = await apiPostJson<{ user: unknown }>("/api/auth/change-password", { currentPassword, newPassword });
  return r.user;
}

export async function deleteAccountRequest(password: string) {
  await apiPostJson<void>("/api/auth/me", { password }, "DELETE");
}

export const listUsers = () => apiGet<AdminUser[]>("/api/users");
export const updateUser = (id: string, patch: { role?: string; disabled?: boolean }) =>
  apiPostJson<{ ok: true }>(`/api/users/${id}`, patch, "PATCH");
export const resetUserPassword = (id: string) =>
  apiPostJson<{ temporaryPassword: string; emailed?: boolean }>(`/api/users/${id}/reset-password`, {});
export const deleteUser = (id: string) => apiPostJson<{ deletedJobs: number }>(`/api/users/${id}`, {}, "DELETE");

export const listAccessRequests = (status = "pending") =>
  apiGet<AccessRequestRow[]>(`/api/auth/access-requests?status=${status}`);
export const approveAccessRequest = (id: string) =>
  apiPostJson<{ temporaryPassword: string; emailed?: boolean }>(`/api/auth/access-requests/${id}/approve`, {});
export const rejectAccessRequest = (id: string) => apiPostJson<void>(`/api/auth/access-requests/${id}/reject`, {});

export const deleteJob = (id: string) => apiPostJson<void>(`/api/jobs/${id}`, {}, "DELETE");

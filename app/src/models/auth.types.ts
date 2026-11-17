export type UserRole = "researcher" | "policy" | "admin";

export type AccessStatus = "none" | "pending" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  institution: string;
  role: UserRole;
  /** Saved "home" location; pre-fills new analyses. null until the user sets one. */
  /** True after an admin-issued temporary password; the user must pick their own. */
  mustChangePassword?: boolean;
  defaultLocation?: { label?: string; latitude: number; longitude: number } | null;
}

export interface AccessRequest {
  name: string;
  email: string;
  institution: string;
  role: Exclude<UserRole, "admin">;
  purpose: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  institution: string;
  role: UserRole;
  disabled: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  runs: number;
}

export interface AccessRequestRow {
  id: string;
  name: string;
  email: string;
  institution: string;
  role: Exclude<UserRole, "admin">;
  purpose: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

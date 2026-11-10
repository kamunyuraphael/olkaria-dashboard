export type UserRole = "researcher" | "policy" | "admin";

export type AccessStatus = "none" | "pending" | "approved" | "rejected";

export interface User {
  id: string;
  name: string;
  email: string;
  institution: string;
  role: UserRole;
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

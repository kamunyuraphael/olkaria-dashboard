// Mirrors the analogous types in app/src/models/*.types.ts. No shared
// package between app/ and server/ yet, so keep these in sync by hand —
// same convention as the rest of this project.

export type ModuleType = "satellite" | "co2-ann" | "dispersion";

/**
 * Matches the frontend's UploadJobStatus poll-stage union
 * (app/src/controllers/useUploadAnalysis.ts) for co2-ann and dispersion.
 * "satellite" module jobs (Module A) use their own queued/fetching/running
 * status set — not modeled here yet, since that module's upload-vs-live-fetch
 * question is still open.
 */
export type JobStage = "queued" | "running" | "complete" | "failed";

export type UserRole = "researcher" | "policy";
export type AccessRequestStatus = "pending" | "approved" | "rejected";

export type DispersionGas = "CO2" | "CH4" | "H2S";

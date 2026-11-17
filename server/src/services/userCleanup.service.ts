import fs from "node:fs/promises";
import { AnalysisJob } from "@/models/AnalysisJob.model.js";
import { Co2AnnResult } from "@/models/Co2AnnResult.model.js";
import { DispersionResult } from "@/models/DispersionResult.model.js";
import { User } from "@/models/User.model.js";

/** Permanently removes a user, their runs, stored results and uploaded input files. */
export async function deleteUserAndData(userId: string): Promise<{ jobs: number }> {
  const jobs = await AnalysisJob.find({ requestedBy: userId });
  for (const job of jobs) {
    for (const f of job.inputFiles) {
      await fs.rm(f.storedPath, { force: true }).catch(() => undefined);
    }
    if (job.resultRef) {
      if (job.resultModel === "DispersionResult") await DispersionResult.deleteOne({ _id: job.resultRef });
      else await Co2AnnResult.deleteOne({ _id: job.resultRef });
    }
  }
  await AnalysisJob.deleteMany({ requestedBy: userId });
  await User.deleteOne({ _id: userId });
  return { jobs: jobs.length };
}

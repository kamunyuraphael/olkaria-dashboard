import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * One job document per analyze request, for both the upload module
 * (dispersion) and the coordinate-driven module (co2-ann). Covers the full
 * lifecycle so GET /jobs/:id can be answered from Mongo alone — BullMQ owns
 * execution/retries, this is the durable status + result pointer the API
 * reads.
 */
const analysisJobSchema = new Schema(
  {
    moduleType: { type: String, enum: ["co2-ann", "dispersion"], required: true },
    stage: {
      type: String,
      enum: ["queued", "running", "complete", "failed", "cancelled"],
      default: "queued",
      required: true,
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },

    // Uploaded input files, saved to disk by multer before the job is
    // enqueued. Dispersion only now — co2-ann moved to coordinates below.
    // `role` disambiguates which slot a file filled: "metData" | "CO2" |
    // "CH4" | "H2S".
    inputFiles: [
      {
        role: { type: String, required: true },
        storedPath: { type: String, required: true },
        originalName: { type: String, required: true },
        _id: false,
      },
    ],

    // co2-ann jobs only: coordinates + buffer radius the analysis-service
    // fetches satellite CO2/weather data for, instead of uploaded files —
    // see analysis-service/src/satellite/simulate.py.
    coordinates: {
      type: {
        // Which gas this satellite ANN run targets. Jobs created before SO2/CH4
        // were wired up have no value stored, so they read back as CO2.
        gas: { type: String, enum: ["SO2", "CH4", "CO2"], default: "CO2" },
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        radiusKm: { type: Number, required: true },
        startDate: { type: String },
        endDate: { type: String },
      },
      required: false,
      _id: false,
    },

    // co2-ann jobs only. "satellite" = coordinates above; "upload" = one
    // combined data file in inputFiles (role "data"). Jobs created before
    // uploads existed have no value stored, so they read back as satellite.
    dataSource: { type: String, enum: ["satellite", "upload"], default: "satellite" },
    // Gas for upload jobs (satellite jobs keep theirs inside `coordinates`).
    gas: { type: String, enum: ["SO2", "CH4", "CO2"] },
    // Free-text site/dataset label the user typed, shown on the results.
    siteLabel: { type: String },

    queuedAt: { type: Date, default: () => new Date() },
    startedAt: { type: Date }, // set by the worker when it actually begins processing
    completedAt: { type: Date },
    failureReason: { type: String },

    // Points at Co2AnnResult or DispersionResult depending on moduleType.
    resultModel: { type: String, enum: ["Co2AnnResult", "DispersionResult"] },
    resultRef: { type: Schema.Types.ObjectId, refPath: "resultModel" },
  },
  { timestamps: true }
);

analysisJobSchema.index({ requestedBy: 1, createdAt: -1 });

export type AnalysisJobDoc = InferSchemaType<typeof analysisJobSchema>;
export const AnalysisJob = model("AnalysisJob", analysisJobSchema);

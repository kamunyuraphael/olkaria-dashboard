import { Schema, model, type InferSchemaType } from "mongoose";

// Mirrors app/src/models/co2ann.types.ts Co2AnnResult — the 2 confirmed
// outputs: actual-vs-predicted (SARIMA + ANN) time series, and Pearson
// correlation of CO2 against each weather covariate.
const co2AnnResultSchema = new Schema(
  {
    job: { type: Schema.Types.ObjectId, ref: "AnalysisJob", required: true, unique: true },
    timeSeries: {
      dates: { type: [String], required: true },
      actual: { type: [Number], required: true },
      // null entries are gaps, not zeros — the ANN's own test split can
      // come up shorter than the SARIMA comparison window (see
      // analysis-service's co2_ann/pipeline.py run_co2_ann docstring).
      ann: { type: [Schema.Types.Mixed], required: true },
      sarima: { type: [Number], required: true },
    },
    correlations: [
      {
        feature: { type: String, required: true },
        r: { type: Number, required: true },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

export type Co2AnnResultDoc = InferSchemaType<typeof co2AnnResultSchema>;
export const Co2AnnResult = model("Co2AnnResult", co2AnnResultSchema);

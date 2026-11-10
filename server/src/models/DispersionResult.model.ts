import { Schema, model, type InferSchemaType } from "mongoose";

// Mirrors app/src/models/dispersion.types.ts DispersionResult — one document
// per job, holding an array of per-gas results (only for gases whose
// emission-source file was uploaded). 5 outputs per gas: 4 spatial fields
// (1hr/8hr/24hr/monthly contour GeoJSON) + 1 diurnal-by-receptor series.
const dispersionResultSchema = new Schema(
  {
    job: { type: Schema.Types.ObjectId, ref: "AnalysisJob", required: true, unique: true },
    gases: [
      {
        gas: { type: String, enum: ["CO2", "CH4", "H2S"], required: true },
        fields: [
          {
            window: { type: String, enum: ["1hr", "8hr", "24hr", "monthly"], required: true },
            // Raw GeoJSON FeatureCollection produced by geojsoncontour — stored
            // as Mixed since its shape is the analysis-service's to define.
            geojson: { type: Schema.Types.Mixed, default: null },
            unit: { type: String, default: "µg m⁻³" },
            _id: false,
          },
        ],
        diurnalByReceptor: { type: Schema.Types.Mixed, required: true }, // Record<string, DiurnalReceptorPoint[]>
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

export type DispersionResultDoc = InferSchemaType<typeof dispersionResultSchema>;
export const DispersionResult = model("DispersionResult", dispersionResultSchema);

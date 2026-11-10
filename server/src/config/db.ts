import mongoose from "mongoose";
import { env } from "@/config/env.js";

export async function connectDb() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(env.MONGO_URI);
  console.log("[db] connected:", mongoose.connection.name);
}

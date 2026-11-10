/**
 * Bootstraps the first admin account. There's no self-service signup
 * (see API_CONTRACT.md) and every other account is created by an admin
 * approving an access request - so the very first admin has to come from
 * somewhere outside that loop. Run once per environment:
 *
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run seed:admin
 *
 * ADMIN_NAME / ADMIN_INSTITUTION are optional (sensible defaults below).
 * Safe to re-run - exits cleanly without changes if that email already
 * has an account.
 */
import { connectDb } from "@/config/db.js";
import { User } from "@/models/User.model.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const BCRYPT_ROUNDS = 12;

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables and re-run.");
    process.exitCode = 1;
    return;
  }

  const name = process.env.ADMIN_NAME ?? "Admin";
  const institution = process.env.ADMIN_INSTITUTION ?? "Olkaria Dashboard";

  await connectDb();

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.log(`[seed:admin] ${email} already has an account (role: ${existing.role}) - no changes made.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await User.create({ name, email: email.toLowerCase(), institution, role: "admin", passwordHash });
  console.log(`[seed:admin] created admin user ${user.email} (id: ${user._id.toString()})`);
}

main()
  .catch((err) => {
    console.error("[seed:admin] failed:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());

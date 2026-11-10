import jwt from "jsonwebtoken";
import { env } from "@/config/env.js";

export interface TokenPayload {
  sub: string; // user id
  role: "researcher" | "policy" | "admin";
}

export function signToken(payload: TokenPayload): string {
  const options: jwt.SignOptions = { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.JWT_SECRET, options);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

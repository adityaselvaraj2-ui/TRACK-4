import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import * as dataService from "./dataService.js";
import type { JwtPayload, UserRole } from "../types/index.js";

const SALT_ROUNDS = 12;
const TOKEN_EXPIRY = "1h";

export async function registerUser(input: {
  email: string;
  password: string;
  role?: UserRole;
}): Promise<{ token: string; user: { id: string; email: string; role: UserRole } }> {
  const existing = await dataService.findUserByEmail(input.email);
  if (existing) {
    throw new Error("Email already registered");
  }

  const role: UserRole = input.role === "Admin" ? "Admin" : "Viewer";
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await dataService.createUser({
    email: input.email,
    passwordHash,
    role,
  });

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ token: string; user: { id: string; email: string; role: UserRole } }> {
  const user = await dataService.findUserByEmail(input.email);
  if (!user) {
    throw new Error("Invalid email or password");
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const token = signToken({ sub: user.id, email: user.email, role: user.role });
  return { token, user: { id: user.id, email: user.email, role: user.role } };
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
}

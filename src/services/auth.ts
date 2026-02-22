import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import db from "../db";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface UserPayload {
  userId: string;
  email: string;
  username: string;
}

export function registerUser(email: string, username: string, password: string) {
  const passwordHash = bcrypt.hashSync(password, 10);
  const id = uuidv4();
  db.prepare(
    "INSERT INTO users (id, email, username, password_hash) VALUES (?, ?, ?, ?)"
  ).run(id, email, username, passwordHash);

  // Create default free subscription
  db.prepare(
    "INSERT INTO subscriptions (id, user_id, plan, billing_cycle, status) VALUES (?, ?, 'free', 'monthly', 'active')"
  ).run(uuidv4(), id);

  const user = db.prepare("SELECT id, email, username, created_at, updated_at FROM users WHERE id = ?").get(id);
  return user;
}

export function loginUser(email: string, password: string): { token: string; user: Omit<UserRow, "password_hash"> } | null {
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!user) return null;

  if (!bcrypt.compareSync(password, user.password_hash)) return null;

  const payload: UserPayload = {
    userId: user.id,
    email: user.email,
    username: user.username,
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

  const { password_hash: _, ...userWithoutPassword } = user;
  return { token, user: userWithoutPassword };
}

export function verifyToken(token: string): UserPayload {
  return jwt.verify(token, JWT_SECRET) as UserPayload;
}
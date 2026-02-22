import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import db from "../db";

interface SubscriptionRow {
  plan: string;
}

export function checkPlan(allowedPlans: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userId = req.user!.userId;
    const sub = db.prepare(
      "SELECT plan FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1"
    ).get(userId) as SubscriptionRow | undefined;

    const plan = sub?.plan || "free";

    if (!allowedPlans.includes(plan)) {
      res.status(403).json({ error: "This feature requires a paid plan", currentPlan: plan, requiredPlans: allowedPlans });
      return;
    }

    next();
  };
}

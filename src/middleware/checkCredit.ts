import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "./auth";
import { consumeCredit } from "../services/credits";

export function checkCredit(type: "scan" | "pregrade") {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const userId = req.user!.userId;
    const result = consumeCredit(userId, type);

    if (!result.success) {
      res.status(403).json({
        error: "Monthly limit reached",
        used: result.used,
        limit: result.limit,
      });
      return;
    }

    next();
  };
}
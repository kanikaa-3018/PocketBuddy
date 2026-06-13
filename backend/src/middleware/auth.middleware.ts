import { Request, Response, NextFunction } from "express";
import { validateSession } from "../services/auth.service.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  token?: string;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: Token empty" });
    }

    const user = await validateSession(token);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: Invalid or expired session" });
    }

    req.userId = user._id.toString();
    req.token = token;
    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Internal auth error" });
  }
}

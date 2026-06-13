import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware.js";
import {
  signUpUser,
  signInWithPassword,
  signInWithPhone,
  deleteSession,
  validateSession
} from "../services/auth.service.js";

export async function signup(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password, fullName, phone } = req.body;
    if (!email || !fullName) {
      return res.status(400).json({ error: "Email and full name are required" });
    }
    const result = await signUpUser({ email, password, fullName, phone });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Signup failed" });
  }
}

export async function loginWithPassword(req: AuthenticatedRequest, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const result = await signInWithPassword({ email, password });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Invalid credentials" });
  }
}

export async function loginWithPhone(req: AuthenticatedRequest, res: Response) {
  try {
    const { phone, fullName } = req.body;
    if (!phone) {
      return res.status(400).json({ error: "Phone number is required" });
    }
    const result = await signInWithPhone({ phone, fullName });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Phone verification failed" });
  }
}

export async function logout(req: AuthenticatedRequest, res: Response) {
  try {
    const token = req.token || req.body.token || req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      await deleteSession(token);
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Logout failed" });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.json({ user: null });
    }
    const token = authHeader.replace("Bearer ", "");
    const user = await validateSession(token);
    if (!user) {
      return res.json({ user: null });
    }
    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        phone: user.phone || null
      }
    });
  } catch (error) {
    res.json({ user: null });
  }
}

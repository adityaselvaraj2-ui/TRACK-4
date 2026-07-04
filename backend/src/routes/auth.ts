import { Router } from "express";
import { loginUser, registerUser } from "../services/authService.js";
import type { UserRole } from "../types/index.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password, role } = req.body as {
      email?: string;
      password?: string;
      role?: UserRole;
    };

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "password must be at least 6 characters" });
      return;
    }

    const result = await registerUser({ email, password, role });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Registration failed";
    res.status(400).json({ error: message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const result = await loginUser({ email, password });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(401).json({ error: message });
  }
});

export default router;

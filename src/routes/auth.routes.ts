import { Router } from "express";
import {
  getMyDetails,
  login,
  register,
  refreshToken,
  adminLogin,
  googleLogin,
  getAllUsers,
  updateProfile,
} from "../controllers/auth.controller";
import { authenticate, isAdmin } from "../middlewares/auth";

const router = Router();

router.post("/login", login);
router.post("/register", register);

router.get("/me", authenticate, getMyDetails);
router.put("/profile", authenticate, updateProfile);
router.post("/refresh", refreshToken);

router.post("/admin/login", adminLogin);
router.post("/google", googleLogin);

// Admin-only user management
router.get("/users", authenticate, isAdmin, getAllUsers);

export default router;


import { Router } from "express";
import { getMyDetails, login, register } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";
import { signRefreshToken } from "../util/jwt";


const router = Router()

router.post("/login", login)
router.post("/register", register)

router.get("/me", authenticate, getMyDetails)
router.post("/refresh-token", authenticate, signRefreshToken)

export default router


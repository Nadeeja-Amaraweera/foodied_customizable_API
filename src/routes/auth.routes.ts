import { Router } from "express";
import { getMyDetails, login, register ,refreshToken, adminLogin, googleLogin} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";


const router = Router()

router.post("/login", login)
router.post("/register", register)

router.get("/me", authenticate, getMyDetails)
router.post("/refresh", refreshToken)

router.post("/admin/login", adminLogin)
router.post('/google', googleLogin); 

export default router


import { Router } from "express";
import { getMyDetails, login, register ,refreshToken} from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth";


const router = Router()

router.post("/login", login)
router.post("/register", register)

router.get("/me", authenticate, getMyDetails)
router.post("/refresh", refreshToken)


export default router


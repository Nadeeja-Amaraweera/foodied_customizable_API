import jwt from "jsonwebtoken"
import dotenv from "dotenv"
import { NextFunction, Request, Response } from "express"

dotenv.config()
const JWT_SECRET = process.env.JWT_SECRET as string

export interface AuthRequest extends Request{
    user?:any
}

export const authenticate = async (
    req:AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).json({
            message:"token is missing"
        })
    }

    const token = authHeader.split(" ")[1]
    try {
        const payload = jwt.verify(token,JWT_SECRET)
        req.user = payload
        next()
    } catch (error) {
        console.error(error)
        res.status(401).json({
            message:"Invalid or expire token"
        })
    }
}

export const isAdmin = (req:AuthRequest, res:Response, next:NextFunction)=>{
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.roles?.includes("ADMIN")) {
        return res.status(403).json({ message: "Access Denied. Admin Only." });
    }

    next();
}
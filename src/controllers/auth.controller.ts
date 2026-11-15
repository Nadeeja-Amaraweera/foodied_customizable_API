import { Request, Response } from "express";
import { UserModel, UserRole } from "../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken"
import { signAccessToken, signRefreshToken } from "../util/jwt";
import { AuthRequest } from "../middlewares/auth";

// Register Controller
export const register = async (req:Request, res:Response) => {
    try {
        const {name,email,password} = req.body
        const extUser = await UserModel.findOne({email})
        if (extUser) {
            return res.status(400).json({
                message:"User already exists..."
            })
        }

        const salt = bcrypt.genSaltSync(10)
        const hashPassword = bcrypt.hashSync(password, salt)

        const newUser = new UserModel({
            name,
            email,
            password: hashPassword,
            roles: [UserRole.USER],
            approve:true
        })
        await newUser.save()
        res.status(201).json({
            message:"User Registerd successfully"
        })

    } catch (err) {
        console.log(err)
        res.status(500).json({
            message: "Registration fail",
            error: err
        })
    }
}

// Login Controller
export const login = async (req:Request,res:Response) => {
    const {email , password} = req.body

    if (!email || !password) {
        return res.status(400).json({
            message:"missing data...!"
        })
    }
    try {
        const user = await UserModel.findOne({email})
        if (!user) {
            return res.status(401).json({
                message:"Email not found...!"
            })
        }

        if (!user.password) {
            return res.status(400).json({
                message: "Password is missing...!"
            })
        }

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
            return res.status(401).json({
                message:"Wrong Password...!"
            })
        }

        const accessToken = signAccessToken(user)
        const refreshToken = signRefreshToken(user)

        res.status(200).json({
            message:"OK",
            data:{
                email:user.email,
                roles:user.roles,
                access_token: accessToken,
                refresh_token: refreshToken
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            message:"Internal Server error while login"
        })
    }
}

// Get User Details Controller
export const getMyDetails = async (req: AuthRequest, res: Response) => {

    if (!req.user) {
        return res.status(401).json({
            message: "Unauthorized"
        })
    }

    const user = await UserModel.findById(req.user.sub).select("-password")
    if (!user) {
        return res.status(401).json({
            message:"User not found"
        })
    }
    
    const {email, roles, _id} = user

    res.status(200).json({
        message: "OK",
        data:
        {
            id:_id,
            email,
            roles
        }
    })
    
}

// Refresh controller
export const refreshToken = async (req:Request, res:Response) => {
    const {refreshToken} =  req.body

    if (!refreshToken) {
        return res.status(401).json({ message: "Refresh token missing" });
    }

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET as string
        ) as {sub:string}

        const user = await UserModel.findById(decoded.sub)

        if (!user) {
            return res.status(401).json({ message: "User Not found" });
        }

        const newAccessToken = signAccessToken(user)

        res.status(200).json({
            message:"Token Refreshed",
            data:{
                access_token : newAccessToken
            }
        })

    } catch (error) {
        console.error(error)
        return res.status(401).json({ message: "Invalid or expired refresh token" });
    }
}
import { Request, Response } from "express";
import { UserModel, UserRole } from "../models/user.model";
import bcrypt from "bcryptjs";

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
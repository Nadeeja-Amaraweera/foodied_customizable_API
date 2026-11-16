import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

import { UserModel } from "./models/user.model";

dotenv.config();

const MONGO_LOCAL_URL = process.env.MONGO_LOCAL_URL as string;

const createAdminUser = async () =>{
    try {
        
        await mongoose.connect(MONGO_LOCAL_URL)
        console.log("Database connected for add sample admin")

        const adminEmail = "nadeeja@gmail.com"
        const adminPassword = "123456"

        const existingAdmin = await UserModel.findOne({email: adminEmail})
        if (existingAdmin) {
            console.log("Admin already exists with this email!");
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(adminPassword,salt)

        const newAdmin = new UserModel ({
            name:"Super Admin",
            email:adminEmail,
            password:hashPassword,
            roles:["ADMIN", "USER"]
        })

        await newAdmin.save()

        console.log("Admin User Created Successfully!");
        console.log(`Email: ${adminEmail}`);
        console.log(`Password: ${adminPassword}`);
    } catch (error) {
        mongoose.disconnect();
        process.exit(0);
    }
}

createAdminUser()
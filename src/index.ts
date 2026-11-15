import express from "express"
import mongoose from "mongoose";
import dotenv from "dotenv"

const MONGO_URL = process.env.MONGO_LOCAL_URL || ""
const PORT = process.env.PORT || 3000

const app = express()

mongoose.connect(MONGO_URL)
.then(()=>{
    console.log("DB Connected")
    app.listen(PORT,()=>{
        console.log(`Server is running on http://localhost:${PORT}`)
    })
}).catch((err)=>{
    console.log("Fail DB connection")
})
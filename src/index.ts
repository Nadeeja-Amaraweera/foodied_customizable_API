import express from "express"
import mongoose from "mongoose";
import AuthRouter from "./routes/auth.routes"
import ProductRouter from "./routes/product.routes"
import dotenv from "dotenv"
import cors from "cors"
import path from "path"

const MONGO_URL = process.env.MONGO_LOCAL_URL || ""
const PORT = process.env.PORT || 3000

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use("/api/v1/auth",AuthRouter)
app.use("/api/v1/products",ProductRouter)

mongoose.connect(MONGO_URL)
.then(()=>{
    console.log("DB Connected")
    app.listen(PORT,()=>{
        console.log(`Server is running on http://localhost:${PORT}`)
    })
}).catch((err)=>{
    console.log("Fail DB connection")
})
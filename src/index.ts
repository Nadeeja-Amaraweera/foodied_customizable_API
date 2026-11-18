import dotenv from "dotenv"
dotenv.config()

import express from "express"
import mongoose from "mongoose";
import AuthRouter from "./routes/auth.routes"
import ProductRouter from "./routes/product.routes"
import OrderRouter from "./routes/order.routes"
import ChatRouter from "./routes/chat.routes"
import cors from "cors"

const MONGO_URL = process.env.MONGO_LOCAL_URL || process.env.MONGO_URL || process.env.MONGODB_URI || ""
const PORT = process.env.PORT || 3000

const app = express()

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended:true}))

// Health & Root Endpoints
app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Foodied Backend API is running", version: "1.0.0" });
});
app.get("/api/v1", (req, res) => {
    res.json({
        status: "ok",
        message: "Foodied API v1",
        database: mongoose.connection.name,
        endpoints: {
            auth: "/api/v1/auth",
            products: "/api/v1/products",
            orders: "/api/v1/orders",
            chat: "/api/v1/chat"
        }
    });
});

app.use("/api/v1/auth",AuthRouter)
app.use("/api/v1/products",ProductRouter)
app.use("/api/v1/orders",OrderRouter)
app.use("/api/v1/chat",ChatRouter)

mongoose.connect(MONGO_URL, {
    dbName: "food_customize_db_mongo"
})
.then(()=>{
    console.log(`DB Connected (${mongoose.connection.name})`)
    app.listen(PORT,()=>{
        console.log(`Server is running on http://localhost:${PORT}`)
    })
}).catch((err)=>{
    console.log("Fail DB connection", err.message)
})
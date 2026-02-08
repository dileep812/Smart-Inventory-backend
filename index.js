// Load environment variables
import 'dotenv/config';


// Import dependencies
import express from 'express';
import http from "http";
import cookieParser from 'cookie-parser';
import passport from "passport"
import cors from "cors"



import authRoutes from './routes/authRoute.js';
import categoryRoutes from "./routes/categoryRoute.js"
import teamRoutes from "./routes/teamRoute.js"
import productRoutes from "./routes/productRoute.js";
import posRoutes from "./routes/posRoute.js";
import { setupSocket } from "./config/socket.js";

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Set port from environment or default to 3000
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

//to read cookies
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_LINK?.trim() || "http://localhost:5173",
    credentials: true
}))
// Parse JSON bodies
app.use(express.json());


// Passport initialization
app.use(passport.initialize());


// ======================
// Routes
// ======================

// Auth routes (public)
app.get("/", (req, res) => {
    return res.status(200).json({ message: "i am working" });
});
app.use('/backend/auth', authRoutes);
app.use("/backend/category",categoryRoutes)
app.use("/backend/team",teamRoutes)
app.use("/backend/products", productRoutes)
app.use("/backend/pos", posRoutes)

// Basic health check


setupSocket(server);
server.listen(PORT,()=>console.log("Server is started"));
// Load environment variables
import 'dotenv/config';


// Import dependencies
import express from 'express';
import cookieParser from 'cookie-parser';
import passport from "passport"
import cors from "cors"
import db from "./config/db.js";

import authRoutes from './routes/authRoute.js';
import categoryRoutes from "./routes/categoryRoute.js"
import teamRoutes from "./routes/teamRoute.js"
// Initialize Express app
const app = express();

// Set port from environment or default to 3000
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

//to read cookies
app.use(cookieParser());
app.use(cors({
    origin:"http://localhost:5173",
    cerdentials:true
}))
// Parse JSON bodies
app.use(express.json());


// Passport initialization
app.use(passport.initialize());


// ======================
// Routes
// ======================

// Auth routes (public)
app.use('/backend/auth', authRoutes);
app.use("/backend/category",categoryRoutes)
app.use("/backend/team",teamRoutes)

app.listen(3000,()=>console.log("Server is started"));
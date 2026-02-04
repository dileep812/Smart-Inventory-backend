// Load environment variables
import 'dotenv/config';


// Import dependencies
import express from 'express';
import cookieParser from 'cookie-parser';
import passport from "passport"
import db from "./config/db.js";

import authRoutes from './routes/authRoute.js';

// Initialize Express app
const app = express();

// Set port from environment or default to 3000
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

//to read cookies
app.use(cookieParser());

// Parse JSON bodies
app.use(express.json());


// Passport initialization
app.use(passport.initialize());


// ======================
// Routes
// ======================

// Auth routes (public)
app.use('/backend/auth', authRoutes);

app.listen(3000,()=>console.log("Server is started"));
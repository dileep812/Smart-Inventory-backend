import express from 'express';
import {postSignup,logout,postLogin,getMe} from '../controllers/authController.js';
import {verifyToken} from "../middleware/isToken.js"
const router=express.Router();

router.get("/me",verifyToken,getMe);

// POST /auth/signup - Handle registration
router.post('/signup', postSignup);


// POST /auth/login - Handle login
router.post('/login', postLogin);

// GET /auth/logout - Handle logout
router.get('/logout',logout);



// // GET /auth/google - Initiate Google OAuth
// router.get('/google', googleAuth);

// // Route where Google sends the user back
// router.get('/google/callback', googleCallback);


export default router;

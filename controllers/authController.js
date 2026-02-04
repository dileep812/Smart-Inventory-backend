import jwt from "jsonwebtoken";
import passport from "../config/passport.js";

// Centralized cookie configuration for consistency
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/", 
    maxAge: 24 * 60 * 60 * 1000 // 1 day
};

/**
 * Helper to generate JWT and set the access_token cookie
 */
const generateTokenAndSetCookie = (user, res) => {
    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role,
            shopId: user.shop_id
        },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.cookie("access_token", token, cookieOptions);

    return res.json({
        success: true,
        message: "Authentication successful",
        user: {
            id: user.id,
            email: user.email,
            shop: user.shop_name
        }
    });
};

export const postLogin = (req, res, next) => {
    passport.authenticate("local", { session: false }, (err, user, info) => {
        if (err || !user) {
            return res.status(401).json({ success: false, error: info?.message || "Auth failed" });
        }
        return generateTokenAndSetCookie(user, res);
    })(req, res, next);
};

export const postSignup = (req, res, next) => {
    passport.authenticate("local", { session: false }, (err, user, info) => {
        if (err || !user) {
            return res.status(401).json({ success: false, error: info?.message || "Registration failed" });
        }
        return generateTokenAndSetCookie(user, res);
    })(req, res, next);
};

export const logout = (req, res) => {
    // To clear a cookie, options (except maxAge/expires) must match exactly how it was set
    res.clearCookie('access_token', { 
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        path: "/" 
    });

    return res.status(200).json({ 
        success: true, 
        message: "Logged out successfully" 
    });
};
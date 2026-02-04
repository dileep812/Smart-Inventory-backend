import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    // 1. Get token from cookies (requires cookie-parser)
    const token = req.cookies.access_token;

    // 2. If no token, return unauthorized
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: "Access Denied: No token provided." 
        });
    }

    try {
        // 3. Verify signature and expiration
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 4. Attach user data to the request object
        req.user = decoded; 
        next(); // Move to the next function (the controller)
    } catch (error) {
        // 5. Handle specific JWT errors
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Session expired. Please log in again." });
        }
        return res.status(403).json({ message: "Invalid token signature." });
    }
};
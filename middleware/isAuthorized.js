const authorize = (roles = []) => {
    return (req, res, next) => {
        // 1. Check if user exists (Unauthenticated)
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: "Authentication required: Please log in." 
            });
        }

        // 2. Check if user has the right role (Unauthorized/Forbidden)
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Access denied: ${req.user.role} role does not have permission for this action.` 
            });
        }

        next();
    };
};

// Specific Exports
export const isOwner = authorize(['owner']);
export const isManager = authorize(['owner', 'manager']); // Managers can do what managers do, but Owners can too
export const isStaff = authorize(['owner', 'manager', 'staff']); // Everyone can access
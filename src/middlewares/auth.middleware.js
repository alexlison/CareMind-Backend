import jwt from "jsonwebtoken";

// AUTH MIDDLEWARE
export const authenticate = (req, res, next) => {
    try {
        const token = req.headers.token;

        if (!token) {
            return res.status(401).json({
                Status: "Error",
                message: "Access denied. No token provided"
            });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();

    } catch (error) {
        return res.status(401).json({
            Status: "Error",
            message: "Invalid or expired token"
        });
    }
};
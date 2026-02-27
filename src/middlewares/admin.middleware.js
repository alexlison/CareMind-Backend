export const isAdmin = (req, res, next) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        status: "FAILED",
        message: "Access denied. Admin only.",
        data: null
      });
    }
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Authentication error",
      data: null
    });
  }
};
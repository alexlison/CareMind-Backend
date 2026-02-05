export const isCaregiver = (req, res, next) => {
  const userRole = req.user?.role || "";
  
  if (userRole !== "caregiver") {
    return res.status(403).json({
      status: "FORBIDDEN",
      message: "Caregiver access required",
      data: null
    });
  }
  next();
};
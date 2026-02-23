export const isPatient = (req, res, next) => {
  const userRole = req.user?.role || "";
  
  if (userRole !== "patient") {
    return res.status(403).json({
      status: "FORBIDDEN",
      message: "Patient access required",
      data: null
    });
  }
  next();
};
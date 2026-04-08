export const requireEmployer = (req: any, res: any, next: any) => {
  // Make sure user exists (auth ran before)
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    });
  }

  //  Check role
  if (req.user.role !== "EMPLOYER") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Employer access only",
    });
  }

  next();
};

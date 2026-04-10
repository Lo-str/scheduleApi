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

export const requireEmployee = (req: any, res: any, next: any) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
    })
  }

  if (req.user.role !== "EMPLOYEE") {
    return res.status(403).json({
      success: false,
      error: "Forbidden: Employee access only",
    })
  }

  next()
}

//RBAC means: control access based on user roles.
// only employers can access employee management endpoints
// employees can only manage their own availability.

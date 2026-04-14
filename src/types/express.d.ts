declare namespace Express {
    interface Request {
      user?: {
        role: string
      }
    }
  }

import jwt from "jsonwebtoken";
import AppError from "../utils/AppError.js";

const authMiddleware = (req, res, next) => {
  try {
    const accessToken =
      req.cookies?.accessToken || req.headers?.authorization?.split(" ")[1];

    if (!accessToken) {
      throw new AppError("Authentication required", 401);
    }

    const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    if (error.name === "TokenExpiredError") {
      return next(new AppError("Access token expired", 401));
    }

    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Invalid access token", 401));
    }

    next(error);
  }
};

export default authMiddleware;

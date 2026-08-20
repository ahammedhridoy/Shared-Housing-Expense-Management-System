import {
  loginUser,
  registerUser,
  refreshAccessToken,
  logoutUser,
} from "../services/auth.service.js";
import * as authService from "../services/auth.service.js";
import AppError from "../utils/AppError.js";

const accessTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 15 * 60 * 1000,
};

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// Register a new user
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError("Name, email and password are required", 400);
    }

    if (password.length < 6) {
      throw new AppError("Password must be at least 6 characters", 400);
    }

    const result = await registerUser({
      name,
      email,
      password,
    });

    res.cookie("accessToken", result.accessToken, accessTokenCookieOptions);

    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Login a user
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError("Email and password are required", 400);
    }

    const result = await loginUser({
      email,
      password,
    });

    res.cookie("accessToken", result.accessToken, accessTokenCookieOptions);

    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get the current authenticated user
export const getCurrentUser = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Authenticated user",
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Refresh an access token
export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    const result = await refreshAccessToken(refreshToken);

    res.cookie("accessToken", result.accessToken, accessTokenCookieOptions);

    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: {
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Logout a user
export const logout = async (req, res, next) => {
  try {
    const refreshToken =
      req.cookies?.refreshToken ||
      req.body?.refreshToken ||
      req.headers?.authorization?.split(" ")[1];

    await logoutUser(refreshToken);

    res.clearCookie("accessToken", accessTokenCookieOptions);

    res.clearCookie("refreshToken", refreshTokenCookieOptions);

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

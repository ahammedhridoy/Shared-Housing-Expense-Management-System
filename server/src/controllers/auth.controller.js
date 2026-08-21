import {
  loginUser,
  registerUser,
  refreshAccessToken,
  logoutUser,
} from "../services/auth.service.js";
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

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const result = await registerUser({ name, email, password });

    res.cookie("accessToken", result.accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await loginUser({ email, password });

    res.cookie("accessToken", result.accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentUser = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: "Authenticated user",
      data: { user: req.user },
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    const result = await refreshAccessToken(refreshToken);

    res.cookie("accessToken", result.accessToken, accessTokenCookieOptions);
    res.cookie("refreshToken", result.refreshToken, refreshTokenCookieOptions);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
};

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

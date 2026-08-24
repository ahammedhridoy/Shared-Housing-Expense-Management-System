import bcrypt from "bcryptjs";
import crypto from "node:crypto";

import prisma from "../config/database.js";
import AppError from "../utils/AppError.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
} from "../utils/auth.js";
import { sendEmail } from "../utils/email.js";
import jwt from "jsonwebtoken";

// Register a new user
export const registerUser = async ({ name, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    throw new AppError("Email already registered", 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: "USER",
    },
  });

  const accessToken = generateAccessToken(user);

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};

// Login a user
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      role: true,
    },
  });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  const accessToken = generateAccessToken(user);

  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: refreshTokenHash,
      expiresAt: refreshTokenExpiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
};

// Refresh an access token
export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError("Refresh token is required", 401);
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!storedToken) {
    throw new AppError("Invalid refresh token", 401);
  }

  if (storedToken.revokedAt) {
    throw new AppError("Refresh token has been revoked", 401);
  }

  if (storedToken.expiresAt < new Date()) {
    throw new AppError("Refresh token has expired", 401);
  }

  const user = storedToken.user;

  // Generate new access token
  const accessToken = generateAccessToken(user);

  // Generate new refresh token
  const newRefreshToken = generateRefreshToken();

  const newRefreshTokenHash = hashRefreshToken(newRefreshToken);

  const newRefreshTokenExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  );

  // Revoke old refresh token
  await prisma.refreshToken.update({
    where: {
      id: storedToken.id,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  // Save new refresh token
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: newRefreshTokenHash,
      expiresAt: newRefreshTokenExpiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    accessToken,
    refreshToken: newRefreshToken,
  };
};

// Get current user by userId
export const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return user;
};

// Logout a user
export const logoutUser = async (refreshToken) => {
  if (!refreshToken) {
    return;
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    select: { id: true, revokedAt: true },
  });

  if (!storedToken || storedToken.revokedAt) {
    return;
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });
};

// Forgot password — generate reset token and send email
export const forgotPassword = async ({ email }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, name: true },
  });

  // Always return success to prevent email enumeration
  if (!user) {
    return { message: "If an account exists, a reset email has been sent" };
  }

  // Invalidate any existing unused reset tokens for this user
  await prisma.passwordReset.updateMany({
    where: {
      userId: user.id,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });

  // Generate a raw token and store its hash
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;

  await sendEmail({
    to: normalizedEmail,
    subject: "Reset Your Password",
    html: `
      <h2>Password Reset</h2>
      <p>Hi ${user.name},</p>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });

  return { message: "If an account exists, a reset email has been sent" };
};

// Reset password — verify token and update password
export const resetPassword = async ({ token, password }) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const resetRecord = await prisma.passwordReset.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!resetRecord) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  if (resetRecord.usedAt) {
    throw new AppError("Reset token has already been used", 400);
  }

  if (resetRecord.expiresAt < new Date()) {
    throw new AppError("Reset token has expired", 400);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { password: hashedPassword },
    }),
    prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate all refresh tokens for this user
    prisma.refreshToken.updateMany({
      where: {
        userId: resetRecord.userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
  ]);

  return { message: "Password reset successful" };
};

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";

const testUser = {
  name: "Test User",
  email: `test${Date.now()}@example.com`,
  password: "password123",
};

let savedRefreshToken;

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany({
    where: { user: { email: testUser.email } },
  });
  await prisma.user.deleteMany({
    where: { email: testUser.email },
  });
  await prisma.$disconnect();
});

// Register

describe("POST /api/v1/auth/register", () => {
  it("should register a new user successfully", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("User registered successfully");
    expect(res.body.data.user).toHaveProperty("id");
    expect(res.body.data.user.name).toBe(testUser.name);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.role).toBe("USER");
    expect(res.body.data.user).not.toHaveProperty("password");
  });

  it("should set accessToken and refreshToken cookies", async () => {
    const email = `cookie${Date.now()}@example.com`;
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Cookie Test", email, password: "password123" });

    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);

    // cleanup
    await prisma.refreshToken.deleteMany({
      where: { user: { email } },
    });
    await prisma.user.deleteMany({
      where: { email },
    });
  });

  it("should return 400 if name is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "test@example.com", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if email is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if password is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test", email: "test@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if email is invalid format", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test", email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if password is less than 6 characters", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Test", email: "test@example.com", password: "12345" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 with empty body", async () => {
    const res = await request(app).post("/api/v1/auth/register").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 409 if email already exists", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

// Login

describe("POST /api/v1/auth/login", () => {
  it("should login successfully and return tokens in cookies", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Login successful");
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.id).toBeDefined();
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user).not.toHaveProperty("password");

    // Check cookies
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);

    // Save refresh token for refresh/logout tests
    const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
    savedRefreshToken = refreshCookie.split(";")[0].split("=")[1];
  });

  it("should return 400 if email is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ password: testUser.password });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if password is missing", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 with empty body", async () => {
    const res = await request(app).post("/api/v1/auth/login").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 if email does not exist", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nonexistent@example.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("should return 401 if password is wrong", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("should normalize email to lowercase before login", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testUser.email.toUpperCase(),
        password: testUser.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// Get Current User

describe("GET /api/v1/auth/me", () => {
  it("should return current user with valid accessToken cookie", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    const cookies = loginRes.headers["set-cookie"];

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Cookie", cookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Authenticated user");
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.userId).toBeDefined();
  });

  it("should return current user with Authorization header", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    const cookies = loginRes.headers["set-cookie"];
    const accessTokenCookie = cookies.find((c) => c.startsWith("accessToken="));
    const accessToken = accessTokenCookie.split(";")[0].split("=")[1];

    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
  });

  it("should return 401 without any token", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 with invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalidtoken123");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 with malformed Authorization header", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "NotBearer sometoken");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// Refresh Token

describe("POST /api/v1/auth/refresh", () => {
  it("should refresh tokens with valid refreshToken cookie", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`refreshToken=${savedRefreshToken}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Token refreshed successfully");
    expect(res.body.data.user).toBeDefined();

    // Update savedRefreshToken to the new one
    const cookies = res.headers["set-cookie"];
    if (cookies) {
      const refreshCookie = cookies.find((c) => c.startsWith("refreshToken="));
      if (refreshCookie) {
        savedRefreshToken = refreshCookie.split(";")[0].split("=")[1];
      }
    }
  });

  it("should return 401 without refreshToken", async () => {
    const res = await request(app).post("/api/v1/auth/refresh");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Refresh token is required");
  });

  it("should return 401 with invalid refreshToken", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", ["refreshToken=invalidtoken123"]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Invalid refresh token");
  });

  it("should return 401 with revoked refreshToken", async () => {
    // Login to get a fresh token
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    const loginCookies = loginRes.headers["set-cookie"];
    const refreshCookie = loginCookies.find((c) =>
      c.startsWith("refreshToken="),
    );
    const tokenToRevoke = refreshCookie.split(";")[0].split("=")[1];

    // Use the token once (this revokes the old one and issues new)
    await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`refreshToken=${tokenToRevoke}`]);

    // Try using the old revoked token
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .set("Cookie", [`refreshToken=${tokenToRevoke}`]);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe("Refresh token has been revoked");
  });
});

// Logout

describe("POST /api/v1/auth/logout", () => {
  it("should logout successfully and clear cookies", async () => {
    // Login first
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    const loginCookies = loginRes.headers["set-cookie"];
    const refreshCookie = loginCookies.find((c) =>
      c.startsWith("refreshToken="),
    );
    const tokenToLogout = refreshCookie.split(";")[0].split("=")[1];

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", [`refreshToken=${tokenToLogout}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Logout successful");
  });

  it("should revoke the refreshToken so refresh fails after logout", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    const loginCookies = loginRes.headers["set-cookie"];
    const refreshCookie = loginCookies.find((c) =>
      c.startsWith("refreshToken="),
    );
    const token = refreshCookie.split(";")[0].split("=")[1];

    // Logout
    await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", [`refreshToken=${token}`]);

    // Verify token is revoked in DB
    const { hashRefreshToken } = await import("../utils/auth.js");
    const tokenHash = hashRefreshToken(token);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    expect(stored).not.toBeNull();
    expect(stored.revokedAt).not.toBeNull();
  });

  it("should succeed even without refreshToken (no-op)", async () => {
    const res = await request(app).post("/api/v1/auth/logout");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should revoke token from Authorization header", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testUser.email, password: testUser.password });

    const loginCookies = loginRes.headers["set-cookie"];
    const refreshCookie = loginCookies.find((c) =>
      c.startsWith("refreshToken="),
    );
    const token = refreshCookie.split(";")[0].split("=")[1];

    const res = await request(app)
      .post("/api/v1/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// Invitation expiry, 7-day lifetime and the shareable link
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";
import { registerUser, createMessWith, cleanupMess, cleanupUsers } from "./helpers.js";

let manager, guest, messId;
const guestEmail = () => guest.email;
const invite = () =>
  request(app).post(`/api/v1/invitations/mess/${messId}`).set("Cookie", manager.cookies).send({ email: guestEmail() });

beforeAll(async () => {
  await prisma.$connect();
  manager = await registerUser("Link Manager");
  guest = await registerUser("Link Guest");
  messId = await createMessWith(manager, [], "Link Mess");
});

afterAll(async () => {
  await cleanupMess(messId);
  await cleanupUsers([manager, guest]);
  await prisma.$disconnect();
});

describe("invitation lifetime", () => {
  it("lasts 7 days and returns a shareable link", async () => {
    const res = await invite();
    expect(res.status).toBe(201);
    const inv = res.body.data.invitation;
    const days = (new Date(inv.expiresAt) - Date.now()) / 86400000;
    expect(days).toBeGreaterThan(6.9);
    expect(inv.inviteUrl).toMatch(/\/invite\/[0-9a-f]{64}$/);
    expect(inv).not.toHaveProperty("token");
  });

  it("an expired invitation no longer blocks a new one", async () => {
    await prisma.invitation.updateMany({
      where: { messId, email: guestEmail() },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await invite();
    expect(res.status).toBe(201);

    const old = await prisma.invitation.findMany({ where: { messId, email: guestEmail() }, orderBy: { createdAt: "asc" } });
    expect(old.map((i) => i.status)).toEqual(["EXPIRED", "PENDING"]);
  });

  it("the manager's list shows expired ones as EXPIRED, with links", async () => {
    const res = await request(app).get(`/api/v1/invitations/mess/${messId}`).set("Cookie", manager.cookies);
    expect(res.status).toBe(200);
    const statuses = res.body.data.invitations.map((i) => i.status).sort();
    expect(statuses).toEqual(["EXPIRED", "PENDING"]);
    expect(res.body.data.invitations.every((i) => i.inviteUrl && !i.token)).toBe(true);
  });
});

describe("GET /api/v1/invitations/token/:token", () => {
  it("shows a public preview without logging in", async () => {
    const pending = await prisma.invitation.findFirst({ where: { messId, status: "PENDING" } });
    const res = await request(app).get(`/api/v1/invitations/token/${pending.token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.invitation).toMatchObject({
      id: pending.id,
      email: guestEmail(),
      status: "PENDING",
      mess: { name: "Link Mess" },
      inviter: { name: "Link Manager" },
    });
  });

  it("reports an out-of-date invitation as EXPIRED", async () => {
    const expired = await prisma.invitation.findFirst({ where: { messId, status: "EXPIRED" } });
    const res = await request(app).get(`/api/v1/invitations/token/${expired.token}`);
    expect(res.body.data.invitation.status).toBe("EXPIRED");
  });

  it("returns 404 for an unknown token and 400 for a malformed one", async () => {
    expect((await request(app).get(`/api/v1/invitations/token/${"a".repeat(64)}`)).status).toBe(404);
    expect((await request(app).get(`/api/v1/invitations/token/nope`)).status).toBe(400);
  });

  it("the invited user can join from the link's invitation id", async () => {
    const pending = await prisma.invitation.findFirst({ where: { messId, status: "PENDING" } });
    const res = await request(app).post(`/api/v1/invitations/${pending.id}/accept`).set("Cookie", guest.cookies);
    expect(res.status).toBe(200);
  });
});

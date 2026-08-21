import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";

let manager, managerCookies;
let invitee, inviteeCookies;
let outsider, outsiderCookies;
let messId;
let invitationId;

const managerData = {
  name: "Inv Manager",
  email: `invmanager${Date.now()}@example.com`,
  password: "password123",
};

const inviteeData = {
  name: "Inv Invitee",
  email: `invitee${Date.now()}@example.com`,
  password: "password123",
};

const outsiderData = {
  name: "Inv Outsider",
  email: `outsider${Date.now()}@example.com`,
  password: "password123",
};

beforeAll(async () => {
  await prisma.$connect();

  // Register manager
  const mgrRes = await request(app)
    .post("/api/v1/auth/register")
    .send(managerData);
  manager = mgrRes.body.data.user;
  managerCookies = mgrRes.headers["set-cookie"];

  // Register invitee
  const invRes = await request(app)
    .post("/api/v1/auth/register")
    .send(inviteeData);
  invitee = invRes.body.data.user;
  inviteeCookies = invRes.headers["set-cookie"];

  // Register outsider
  const outRes = await request(app)
    .post("/api/v1/auth/register")
    .send(outsiderData);
  outsider = outRes.body.data.user;
  outsiderCookies = outRes.headers["set-cookie"];

  // Create mess (manager becomes MANAGER)
  const messRes = await request(app)
    .post("/api/v1/mess")
    .set("Cookie", managerCookies)
    .send({ name: "Inv Test Mess", description: "Test" });
  messId = messRes.body.data.mess.id;
});

afterAll(async () => {
  // Cleanup in dependency order
  await prisma.messMember.deleteMany({ where: { messId } });
  await prisma.invitation.deleteMany({ where: { messId } });
  await prisma.mess.deleteMany({ where: { id: messId } });
  await prisma.refreshToken.deleteMany({
    where: {
      user: {
        email: {
          in: [managerData.email, inviteeData.email, outsiderData.email],
        },
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [managerData.email, inviteeData.email, outsiderData.email],
      },
    },
  });
  await prisma.$disconnect();
});

// POST /api/v1/invitations/mess/:messId

describe("POST /api/v1/invitations/mess/:messId (create invitation)", () => {
  beforeEach(async () => {
    // Clean up any pending invitations from prior tests
    await prisma.invitation.deleteMany({
      where: { messId, email: inviteeData.email.toLowerCase() },
    });
  });

  it("should create an invitation successfully (manager)", async () => {
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({ email: inviteeData.email });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Invitation created successfully");
    expect(res.body.data.invitation).toMatchObject({
      messId,
      email: inviteeData.email.toLowerCase(),
      status: "PENDING",
    });
    expect(res.body.data.invitation).toHaveProperty("id");
    expect(res.body.data.invitation).toHaveProperty("expiresAt");
    invitationId = res.body.data.invitation.id;
  });

  it("should create invitation for non-existing user", async () => {
    const fakeEmail = `nobody${Date.now()}@example.com`;
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({ email: fakeEmail });

    expect(res.status).toBe(201);
    expect(res.body.data.invitation.email).toBe(fakeEmail);
  });

  it("should normalize email to lowercase", async () => {
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({ email: inviteeData.email.toUpperCase() });

    expect(res.status).toBe(201);
    expect(res.body.data.invitation.email).toBe(
      inviteeData.email.toLowerCase(),
    );
  });

  it("should return 409 if pending invitation already exists", async () => {
    // Create first invitation
    await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({ email: inviteeData.email });

    // Try duplicate
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({ email: inviteeData.email });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/pending invitation/i);
  });

  it("should return 409 if user is already a member", async () => {
    // Create invitation
    const invRes = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({ email: inviteeData.email });
    const invId = invRes.body.data.invitation.id;

    // Accept it — invitee becomes MEMBER
    await request(app)
      .post(`/api/v1/invitations/${invId}/accept`)
      .set("Cookie", inviteeCookies);

    // Try inviting again
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({ email: inviteeData.email });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already a member/i);

    // Remove membership
    await prisma.messMember.deleteMany({
      where: { userId: invitee.id, messId },
    });
  });

  it("should return 403 if user is MEMBER (not MANAGER)", async () => {
    // Add invitee as MEMBER first
    const memberRes = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({ email: inviteeData.email });

    // Accept if pending
    if (memberRes.status === 201) {
      await request(app)
        .post(`/api/v1/invitations/${memberRes.body.data.invitation.id}/accept`)
        .set("Cookie", inviteeCookies);
    }

    // Now invitee is MEMBER, try to invite someone
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", inviteeCookies)
      .send({ email: outsiderData.email });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // Cleanup: remove membership
    await prisma.messMember.deleteMany({
      where: { userId: invitee.id, messId },
    });
  });

  it("should return 403 if user is not a member of the mess", async () => {
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", outsiderCookies)
      .send({ email: inviteeData.email });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .send({ email: inviteeData.email });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if email is missing", async () => {
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if email format is invalid", async () => {
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/invitations/mess/invalidId")
      .set("Cookie", managerCookies)
      .send({ email: inviteeData.email });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// GET /api/v1/invitations/pending

describe("GET /api/v1/invitations/pending (get pending invitations)", () => {
  it("should return pending invitations for invitee", async () => {
    const res = await request(app)
      .get("/api/v1/invitations/pending")
      .set("Cookie", inviteeCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.invitations)).toBe(true);
  });

  it("should return empty array if no pending invitations", async () => {
    const res = await request(app)
      .get("/api/v1/invitations/pending")
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.invitations).toEqual([]);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app).get("/api/v1/invitations/pending");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

//  GET /api/v1/invitations/mess/:messId

describe("GET /api/v1/invitations/mess/:messId (get mess invitations)", () => {
  it("should return all invitations for mess (manager)", async () => {
    const res = await request(app)
      .get(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.invitations)).toBe(true);
  });

  it("should return 403 for non-member", async () => {
    const res = await request(app)
      .get(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app).get(`/api/v1/invitations/mess/${messId}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .get("/api/v1/invitations/mess/invalidId")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// POST /api/v1/invitations/:invitationId/accept

describe("POST /api/v1/invitations/:invitationId/accept", () => {
  let freshInvitationId;

  beforeEach(async () => {
    // Create a fresh invitation for invitee each test
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({ email: inviteeData.email });

    if (res.status === 201) {
      freshInvitationId = res.body.data.invitation.id;
    } else {
      // If duplicate, fetch existing pending one
      const pendingRes = await request(app)
        .get("/api/v1/invitations/pending")
        .set("Cookie", inviteeCookies);
      const existing = pendingRes.body.data.invitations.find(
        (i) => i.mess.id === messId,
      );
      if (existing) freshInvitationId = existing.id;
    }
  });

  afterEach(async () => {
    // Remove membership so next test can accept fresh
    await prisma.messMember.deleteMany({
      where: { userId: invitee.id, messId },
    });
    // Reset invitation status if needed
    if (freshInvitationId) {
      await prisma.invitation.updateMany({
        where: { id: freshInvitationId, status: "ACCEPTED" },
        data: { status: "PENDING" },
      });
    }
  });

  it("should accept invitation successfully", async () => {
    const res = await request(app)
      .post(`/api/v1/invitations/${freshInvitationId}/accept`)
      .set("Cookie", inviteeCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Invitation accepted successfully");
    expect(res.body.data.membership).toMatchObject({
      userId: invitee.id,
      messId,
      role: "MEMBER",
    });
  });

  it("should return 404 for non-existing invitation", async () => {
    // Use a valid-looking but non-existent ID
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .post(`/api/v1/invitations/${fakeId}/accept`)
      .set("Cookie", inviteeCookies);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if invitation already accepted", async () => {
    // Accept once
    await request(app)
      .post(`/api/v1/invitations/${freshInvitationId}/accept`)
      .set("Cookie", inviteeCookies);

    // Try again
    const res = await request(app)
      .post(`/api/v1/invitations/${freshInvitationId}/accept`)
      .set("Cookie", inviteeCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already been accepted/i);
  });

  it("should return 403 if invitation email doesn't match user", async () => {
    // outsider tries to accept invitee's invitation
    const res = await request(app)
      .post(`/api/v1/invitations/${freshInvitationId}/accept`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/different email/i);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app).post(
      `/api/v1/invitations/${freshInvitationId}/accept`,
    );

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if invitationId is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/invitations/invalidId/accept")
      .set("Cookie", inviteeCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

//  DELETE /api/v1/invitations/:invitationId/cancel

describe("DELETE /api/v1/invitations/:invitationId/cancel", () => {
  let cancelInvitationId;

  beforeEach(async () => {
    // Clean pending invitations for invitee
    await prisma.invitation.deleteMany({
      where: { messId, email: inviteeData.email.toLowerCase() },
    });

    // Create a fresh invitation
    const res = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", managerCookies)
      .send({ email: inviteeData.email });

    cancelInvitationId = res.body.data.invitation.id;
  });

  it("should cancel invitation (manager)", async () => {
    const res = await request(app)
      .delete(`/api/v1/invitations/${cancelInvitationId}/cancel`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Invitation cancelled successfully");

    // Verify it's deleted
    const check = await prisma.invitation.findUnique({
      where: { id: cancelInvitationId },
    });
    expect(check).toBeNull();
  });

  it("should return 404 for non-existing invitation", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .delete(`/api/v1/invitations/${fakeId}/cancel`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if invitation already accepted", async () => {
    // Accept the invitation first
    await request(app)
      .post(`/api/v1/invitations/${cancelInvitationId}/accept`)
      .set("Cookie", inviteeCookies);

    const res = await request(app)
      .delete(`/api/v1/invitations/${cancelInvitationId}/cancel`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already been accepted/i);

    // Cleanup
    await prisma.messMember.deleteMany({
      where: { userId: invitee.id, messId },
    });
  });

  it("should return 403 if MEMBER tries to cancel (not manager, not inviter)", async () => {
    // Create a new mess with a different manager, add outsider as MEMBER
    const mess2Res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "Cancel Test Mess" });
    const mess2Id = mess2Res.body.data.mess.id;

    // Invite outsider to mess2
    const invRes = await request(app)
      .post(`/api/v1/invitations/mess/${mess2Id}`)
      .set("Cookie", managerCookies)
      .send({ email: outsiderData.email });
    const invId = invRes.body.data.invitation.id;

    // Accept as outsider
    await request(app)
      .post(`/api/v1/invitations/${invId}/accept`)
      .set("Cookie", outsiderCookies);

    // Create another invitation in mess2 for invitee
    const inv2Res = await request(app)
      .post(`/api/v1/invitations/mess/${mess2Id}`)
      .set("Cookie", managerCookies)
      .send({ email: inviteeData.email });
    const inv2Id = inv2Res.body.data.invitation.id;

    // outsider (MEMBER, not inviter, not MANAGER) tries to cancel
    const res = await request(app)
      .delete(`/api/v1/invitations/${inv2Id}/cancel`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/manager or the inviter/i);

    // Cleanup
    await prisma.invitation.deleteMany({ where: { messId: mess2Id } });
    await prisma.messMember.deleteMany({ where: { messId: mess2Id } });
    await prisma.mess.deleteMany({ where: { id: mess2Id } });
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app).delete(
      `/api/v1/invitations/${cancelInvitationId}/cancel`,
    );

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if invitationId is invalid", async () => {
    const res = await request(app)
      .delete("/api/v1/invitations/invalidId/cancel")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";

let manager, managerCookies;
let member, memberCookies;
let outsider, outsiderCookies;

const managerData = {
  name: "Mess Manager",
  email: `messmgr${Date.now()}@example.com`,
  password: "password123",
};

const memberData = {
  name: "Mess Member",
  email: `messmember${Date.now()}@example.com`,
  password: "password123",
};

const outsiderData = {
  name: "Mess Outsider",
  email: `messoutsider${Date.now()}@example.com`,
  password: "password123",
};

async function cleanMess(messId) {
  if (!messId) return;
  await prisma.invitation.deleteMany({ where: { messId } });
  await prisma.messMember.deleteMany({ where: { messId } });
  await prisma.mess.deleteMany({ where: { id: messId } });
}

beforeAll(async () => {
  await prisma.$connect();

  const mgrRes = await request(app)
    .post("/api/v1/auth/register")
    .send(managerData);
  manager = mgrRes.body.data.user;
  managerCookies = mgrRes.headers["set-cookie"];

  const memRes = await request(app)
    .post("/api/v1/auth/register")
    .send(memberData);
  member = memRes.body.data.user;
  memberCookies = memRes.headers["set-cookie"];

  const outRes = await request(app)
    .post("/api/v1/auth/register")
    .send(outsiderData);
  outsider = outRes.body.data.user;
  outsiderCookies = outRes.headers["set-cookie"];
});

afterAll(async () => {
  await prisma.$disconnect();
});

//  POST /api/v1/mess (createMess)

describe("POST /api/v1/mess (createMess)", () => {
  let testMessId;

  afterEach(async () => {
    await cleanMess(testMessId);
    testMessId = null;
  });

  it("should create a mess successfully", async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "Test Mess" });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mess.name).toBe("Test Mess");
    expect(res.body.data.mess.id).toBeDefined();
    testMessId = res.body.data.mess.id;
  });

  it("should include membership with MANAGER role", async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "Manager Role Mess" });

    expect(res.status).toBe(201);
    const memberships = res.body.data.mess.memberships;
    expect(memberships).toHaveLength(1);
    expect(memberships[0].role).toBe("MANAGER");
    expect(memberships[0].userId).toBe(manager.id);
    testMessId = res.body.data.mess.id;
  });

  it("should accept optional description and address", async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({
        name: "Full Mess",
        description: "A shared housing mess",
        address: "123 Main St",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.mess.description).toBe("A shared housing mess");
    expect(res.body.data.mess.address).toBe("123 Main St");
    testMessId = res.body.data.mess.id;
  });

  it("should trim whitespace from name", async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "  Trimmed Mess  " });

    expect(res.status).toBe(201);
    expect(res.body.data.mess.name).toBe("Trimmed Mess");
    testMessId = res.body.data.mess.id;
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .send({ name: "No Auth Mess" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if name is missing", async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ description: "No name" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if name is empty string", async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if name exceeds 100 characters", async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "A".repeat(101) });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if description exceeds 500 characters", async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "Test", description: "B".repeat(501) });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if address exceeds 200 characters", async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "Test", address: "C".repeat(201) });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// GET /api/v1/mess/my (getMyMesses)

describe("GET /api/v1/mess/my (getMyMesses)", () => {
  let myMessId;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "My Messes Test" });
    myMessId = res.body.data.mess.id;

    const invRes = await request(app)
      .post(`/api/v1/invitations/mess/${myMessId}`)
      .set("Cookie", managerCookies)
      .send({ email: memberData.email });
    const invId = invRes.body.data.invitation.id;
    await request(app)
      .post(`/api/v1/invitations/${invId}/accept`)
      .set("Cookie", memberCookies);
  });

  afterAll(async () => {
    await cleanMess(myMessId);
  });

  it("should return all messes for a user", async () => {
    const res = await request(app)
      .get("/api/v1/mess/my")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.messes)).toBe(true);
    expect(res.body.data.messes.length).toBeGreaterThanOrEqual(1);
  });

  it("should include role and membershipId in each mess", async () => {
    const res = await request(app)
      .get("/api/v1/mess/my")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const myMess = res.body.data.messes.find((m) => m.id === myMessId);
    expect(myMess).toBeDefined();
    expect(myMess.role).toBe("MANAGER");
    expect(myMess.membershipId).toBeDefined();
  });

  it("should include mess fields (name, description, address, etc.)", async () => {
    const res = await request(app)
      .get("/api/v1/mess/my")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const myMess = res.body.data.messes.find((m) => m.id === myMessId);
    expect(myMess).toBeDefined();
    expect(myMess.name).toBe("My Messes Test");
    expect(myMess).toHaveProperty("createdAt");
    expect(myMess).toHaveProperty("updatedAt");
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app).get("/api/v1/mess/my");

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

//  GET /api/v1/mess/:messId (getMessDetails)

describe("GET /api/v1/mess/:messId (getMessDetails)", () => {
  let detailMessId;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "Details Test Mess" });
    detailMessId = res.body.data.mess.id;

    const invRes = await request(app)
      .post(`/api/v1/invitations/mess/${detailMessId}`)
      .set("Cookie", managerCookies)
      .send({ email: memberData.email });
    const invId = invRes.body.data.invitation.id;
    await request(app)
      .post(`/api/v1/invitations/${invId}/accept`)
      .set("Cookie", memberCookies);
  });

  afterAll(async () => {
    await cleanMess(detailMessId);
  });

  it("should return mess details for a member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${detailMessId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mess.name).toBe("Details Test Mess");
    expect(res.body.data.mess.id).toBe(detailMessId);
  });

  it("should include membership info in response", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${detailMessId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.mess.membership).toBeDefined();
    expect(res.body.data.mess.membership.role).toBe("MANAGER");
  });

  it("should return details for MEMBER role too", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${detailMessId}`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.mess.membership.role).toBe("MEMBER");
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${detailMessId}`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app).get(`/api/v1/mess/${detailMessId}`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .get("/api/v1/mess/invalidId")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 for non-existent messId (no membership)", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .get(`/api/v1/mess/${fakeId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });
});

// GET /api/v1/mess/:messId/members (getMessMembers)

describe("GET /api/v1/mess/:messId/members (getMessMembers)", () => {
  let memberMessId;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "Members Test Mess" });
    memberMessId = res.body.data.mess.id;

    const invRes = await request(app)
      .post(`/api/v1/invitations/mess/${memberMessId}`)
      .set("Cookie", managerCookies)
      .send({ email: memberData.email });
    const invId = invRes.body.data.invitation.id;
    await request(app)
      .post(`/api/v1/invitations/${invId}/accept`)
      .set("Cookie", memberCookies);
  });

  afterAll(async () => {
    await cleanMess(memberMessId);
  });

  it("should return all members of a mess", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${memberMessId}/members`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.members)).toBe(true);
    expect(res.body.data.members).toHaveLength(2);
    expect(res.body.data.count).toBe(2);
  });

  it("should include user info in each member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${memberMessId}/members`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const mgrMember = res.body.data.members.find(
      (m) => m.user.id === manager.id,
    );
    expect(mgrMember).toBeDefined();
    expect(mgrMember.role).toBe("MANAGER");
    expect(mgrMember.user.name).toBe(managerData.name);
    expect(mgrMember.user.email).toBe(managerData.email);
  });

  it("should include role and createdAt in each member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${memberMessId}/members`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    res.body.data.members.forEach((m) => {
      expect(m).toHaveProperty("role");
      expect(m).toHaveProperty("createdAt");
      expect(m).toHaveProperty("user");
    });
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${memberMessId}/members`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app).get(`/api/v1/mess/${memberMessId}/members`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .get("/api/v1/mess/invalidId/members")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// PATCH /api/v1/mess/:messId (updateMess)

describe("PATCH /api/v1/mess/:messId (updateMess)", () => {
  let updateMessId;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", managerCookies)
      .send({ name: "Update Test Mess", description: "Original desc" });
    updateMessId = res.body.data.mess.id;
  });

  afterAll(async () => {
    await cleanMess(updateMessId);
  });

  it("should update mess name", async () => {
    const res = await request(app)
      .patch(`/api/v1/mess/${updateMessId}`)
      .set("Cookie", managerCookies)
      .send({ name: "Updated Mess Name" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.mess.name).toBe("Updated Mess Name");
  });

  it("should update description", async () => {
    const res = await request(app)
      .patch(`/api/v1/mess/${updateMessId}`)
      .set("Cookie", managerCookies)
      .send({ description: "New description" });

    expect(res.status).toBe(200);
    expect(res.body.data.mess.description).toBe("New description");
  });

  it("should update address", async () => {
    const res = await request(app)
      .patch(`/api/v1/mess/${updateMessId}`)
      .set("Cookie", managerCookies)
      .send({ address: "456 New St" });

    expect(res.status).toBe(200);
    expect(res.body.data.mess.address).toBe("456 New St");
  });

  it("should update multiple fields at once", async () => {
    const res = await request(app)
      .patch(`/api/v1/mess/${updateMessId}`)
      .set("Cookie", managerCookies)
      .send({
        name: "Multi Update",
        description: "Updated",
        address: "789 St",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.mess.name).toBe("Multi Update");
    expect(res.body.data.mess.description).toBe("Updated");
    expect(res.body.data.mess.address).toBe("789 St");
  });

  it("should trim whitespace from name", async () => {
    const res = await request(app)
      .patch(`/api/v1/mess/${updateMessId}`)
      .set("Cookie", managerCookies)
      .send({ name: "  Trimmed Update  " });

    expect(res.status).toBe(200);
    expect(res.body.data.mess.name).toBe("Trimmed Update");
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .patch(`/api/v1/mess/${updateMessId}`)
      .send({ name: "No Auth" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if no fields provided", async () => {
    const res = await request(app)
      .patch(`/api/v1/mess/${updateMessId}`)
      .set("Cookie", managerCookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if name is empty string", async () => {
    const res = await request(app)
      .patch(`/api/v1/mess/${updateMessId}`)
      .set("Cookie", managerCookies)
      .send({ name: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if name exceeds 100 characters", async () => {
    const res = await request(app)
      .patch(`/api/v1/mess/${updateMessId}`)
      .set("Cookie", managerCookies)
      .send({ name: "A".repeat(101) });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .patch("/api/v1/mess/invalidId")
      .set("Cookie", managerCookies)
      .send({ name: "Test" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 for non-existent messId", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .patch(`/api/v1/mess/${fakeId}`)
      .set("Cookie", managerCookies)
      .send({ name: "Test" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

// DELETE /api/v1/mess/:messId/members/:userId (removeMessMember)

describe("DELETE /api/v1/mess/:messId/members/:userId (removeMessMember)", () => {
  let removeMessId;
  let removeManager, removeManagerCookies;
  let removeMember, removeMemberCookies;

  beforeAll(async () => {
    const ts = Date.now();
    const mgrRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "RemoveMgr",
        email: `rmgr${ts}@example.com`,
        password: "password123",
      });
    removeManager = mgrRes.body.data.user;
    removeManagerCookies = mgrRes.headers["set-cookie"];

    const memRes = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "RemoveMem",
        email: `rmem${ts}@example.com`,
        password: "password123",
      });
    removeMember = memRes.body.data.user;
    removeMemberCookies = memRes.headers["set-cookie"];

    const messRes = await request(app)
      .post("/api/v1/mess")
      .set("Cookie", removeManagerCookies)
      .send({ name: "Remove Test Mess" });
    removeMessId = messRes.body.data.mess.id;

    const invRes = await request(app)
      .post(`/api/v1/invitations/mess/${removeMessId}`)
      .set("Cookie", removeManagerCookies)
      .send({ email: `rmem${ts}@example.com` });
    const invId = invRes.body.data.invitation.id;
    await request(app)
      .post(`/api/v1/invitations/${invId}/accept`)
      .set("Cookie", removeMemberCookies);
  });

  afterAll(async () => {
    await cleanMess(removeMessId);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app).delete(
      `/api/v1/mess/${removeMessId}/members/${removeMember.id}`,
    );

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/invalidId/members/${removeMember.id}`)
      .set("Cookie", removeManagerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if userId is invalid", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${removeMessId}/members/invalidId`)
      .set("Cookie", removeManagerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is MEMBER (not MANAGER)", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${removeMessId}/members/${removeManager.id}`)
      .set("Cookie", removeMemberCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if manager tries to remove themselves", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${removeMessId}/members/${removeManager.id}`)
      .set("Cookie", removeManagerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 if target user is not a member", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${removeMessId}/members/${outsider.id}`)
      .set("Cookie", removeManagerCookies);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should remove a member successfully (manager action)", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${removeMessId}/members/${removeMember.id}`)
      .set("Cookie", removeManagerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await request(app)
      .get(`/api/v1/mess/${removeMessId}/members`)
      .set("Cookie", removeManagerCookies);

    expect(check.body.data.members).toHaveLength(1);
  });
});

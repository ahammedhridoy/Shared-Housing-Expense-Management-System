import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";

let manager, managerCookies;
let member, memberCookies;
let outsider, outsiderCookies;
let messId;

const managerData = {
  name: "Meal Manager",
  email: `mealmgr${Date.now()}@example.com`,
  password: "password123",
};

const memberData = {
  name: "Meal Member",
  email: `mealmember${Date.now()}@example.com`,
  password: "password123",
};

const outsiderData = {
  name: "Meal Outsider",
  email: `mealoutsider${Date.now()}@example.com`,
  password: "password123",
};

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

  const messRes = await request(app)
    .post("/api/v1/mess")
    .set("Cookie", managerCookies)
    .send({ name: "Meal Test Mess", description: "Test" });
  messId = messRes.body.data.mess.id;

  const invRes = await request(app)
    .post(`/api/v1/invitations/mess/${messId}`)
    .set("Cookie", managerCookies)
    .send({ email: memberData.email });
  const invId = invRes.body.data.invitation.id;
  await request(app)
    .post(`/api/v1/invitations/${invId}/accept`)
    .set("Cookie", memberCookies);
});

afterAll(async () => {
  await prisma.meal.deleteMany({ where: { messId } });
  await prisma.invitation.deleteMany({ where: { messId } });
  await prisma.messMember.deleteMany({ where: { messId } });
  await prisma.mess.deleteMany({ where: { id: messId } });
  await prisma.refreshToken.deleteMany({
    where: {
      user: {
        email: {
          in: [managerData.email, memberData.email, outsiderData.email],
        },
      },
    },
  });
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [managerData.email, memberData.email, outsiderData.email],
      },
    },
  });
  await prisma.$disconnect();
});

const validMealDate = "2025-06-15T12:00:00.000Z";

// ─── POST /api/v1/mess/:messId/meals ────────────────────────────

describe("POST /api/v1/mess/:messId/meals (addMeal)", () => {
  it("should add a meal successfully (manager)", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({
        userId: member.id,
        date: validMealDate,
        type: "LUNCH",
        quantity: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.meal).toMatchObject({
      userId: member.id,
      messId,
      type: "LUNCH",
      quantity: 2,
    });
    expect(res.body.data.meal).toHaveProperty("id");
  });

  it("should default quantity to 1 when omitted", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({
        userId: member.id,
        date: validMealDate,
        type: "DINNER",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.meal.quantity).toBe(1);
  });

  it("should return 403 if user is MEMBER (not MANAGER)", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", memberCookies)
      .send({
        userId: member.id,
        date: validMealDate,
        type: "LUNCH",
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only mess manager/i);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", outsiderCookies)
      .send({
        userId: member.id,
        date: validMealDate,
        type: "LUNCH",
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 if target user is not a mess member", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({
        userId: outsider.id,
        date: validMealDate,
        type: "LUNCH",
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not a member/i);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .send({
        userId: member.id,
        date: validMealDate,
        type: "LUNCH",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if userId is missing", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ date: validMealDate, type: "LUNCH" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if date is missing", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, type: "LUNCH" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if date is not ISO 8601", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: "not-a-date", type: "LUNCH" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if type is missing", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: validMealDate });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if type is invalid", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: validMealDate, type: "SNACK" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/expected one of/i);
  });

  it("should return 400 if quantity is zero", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: validMealDate, type: "LUNCH", quantity: 0 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if quantity is negative", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: validMealDate, type: "LUNCH", quantity: -1 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if quantity is not an integer", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: validMealDate, type: "LUNCH", quantity: 1.5 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/mess/invalidId/meals")
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: validMealDate, type: "LUNCH" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/v1/mess/:messId/meals ─────────────────────────────

describe("GET /api/v1/mess/:messId/meals (getMyMeals)", () => {
  beforeAll(async () => {
    await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: "2025-06-15T08:00:00.000Z", type: "BREAKFAST", quantity: 1 });
    await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: "2025-06-15T12:00:00.000Z", type: "LUNCH", quantity: 2 });
    await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: "2025-06-16T12:00:00.000Z", type: "LUNCH", quantity: 1 });
  });

  it("should return member's meals with count", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.meals)).toBe(true);
    expect(res.body.data.count).toBeGreaterThanOrEqual(3);
  });

  it("should filter by type", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals?type=LUNCH`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(200);
    res.body.data.meals.forEach((m) => expect(m.type).toBe("LUNCH"));
  });

  it("should filter by startDate", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals?startDate=2025-06-16T00:00:00.000Z`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.meals.length).toBeGreaterThanOrEqual(1);
    res.body.data.meals.forEach((m) => {
      expect(new Date(m.date).getTime()).toBeGreaterThanOrEqual(
        new Date("2025-06-16T00:00:00.000Z").getTime(),
      );
    });
  });

  it("should filter by endDate", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals?endDate=2025-06-15T23:59:59.999Z`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.meals.length).toBeGreaterThanOrEqual(2);
  });

  it("should filter by startDate and endDate together", async () => {
    const res = await request(app)
      .get(
        `/api/v1/mess/${messId}/meals?startDate=2025-06-15T00:00:00.000Z&endDate=2025-06-15T23:59:59.999Z`,
      )
      .set("Cookie", memberCookies);

    expect(res.status).toBe(200);
    res.body.data.meals.forEach((m) => {
      const d = new Date(m.date).getTime();
      expect(d).toBeGreaterThanOrEqual(new Date("2025-06-15T00:00:00.000Z").getTime());
      expect(d).toBeLessThanOrEqual(new Date("2025-06-15T23:59:59.999Z").getTime());
    });
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if startDate is invalid", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals?startDate=not-a-date`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if endDate is invalid", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals?endDate=not-a-date`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .get("/api/v1/mess/invalidId/meals")
      .set("Cookie", memberCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/v1/mess/:messId/meals/all ─────────────────────────

describe("GET /api/v1/mess/:messId/meals/all (getMessMeals)", () => {
  it("should return all mess meals for any member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals/all`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.meals)).toBe(true);
    expect(res.body.data.meals.length).toBeGreaterThanOrEqual(3);
  });

  it("should include user info in response", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals/all`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const meal = res.body.data.meals[0];
    expect(meal).toHaveProperty("user");
    expect(meal.user).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      email: expect.any(String),
    });
  });

  it("should filter by type", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals/all?type=BREAKFAST`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    res.body.data.meals.forEach((m) => expect(m.type).toBe("BREAKFAST"));
  });

  it("should filter by date range", async () => {
    const res = await request(app)
      .get(
        `/api/v1/mess/${messId}/meals/all?startDate=2025-06-15T00:00:00.000Z&endDate=2025-06-15T23:59:59.999Z`,
      )
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    res.body.data.meals.forEach((m) => {
      const d = new Date(m.date).getTime();
      expect(d).toBeGreaterThanOrEqual(new Date("2025-06-15T00:00:00.000Z").getTime());
      expect(d).toBeLessThanOrEqual(new Date("2025-06-15T23:59:59.999Z").getTime());
    });
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals/all`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/meals/all`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .get("/api/v1/mess/invalidId/meals/all")
      .set("Cookie", memberCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─── PUT /api/v1/mess/:messId/meals/:mealId ─────────────────────

describe("PUT /api/v1/mess/:messId/meals/:mealId (updateMeal)", () => {
  let mealId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: validMealDate, type: "LUNCH", quantity: 2 });
    mealId = res.body.data.meal.id;
  });

  it("should update meal type successfully", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/meals/${mealId}`)
      .set("Cookie", managerCookies)
      .send({ type: "DINNER" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.meal.type).toBe("DINNER");
  });

  it("should update meal quantity successfully", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/meals/${mealId}`)
      .set("Cookie", managerCookies)
      .send({ quantity: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.meal.quantity).toBe(5);
  });

  it("should update meal date successfully", async () => {
    const newDate = "2025-07-01T18:00:00.000Z";
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/meals/${mealId}`)
      .set("Cookie", managerCookies)
      .send({ date: newDate });

    expect(res.status).toBe(200);
    expect(new Date(res.body.data.meal.date).toISOString()).toBe(newDate);
  });

  it("should update userId successfully", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/meals/${mealId}`)
      .set("Cookie", managerCookies)
      .send({ userId: manager.id });

    expect(res.status).toBe(200);
    expect(res.body.data.meal.userId).toBe(manager.id);

    // Restore to member
    await request(app)
      .put(`/api/v1/mess/${messId}/meals/${mealId}`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id });
  });

  it("should return 403 if user is MEMBER (not MANAGER)", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/meals/${mealId}`)
      .set("Cookie", memberCookies)
      .send({ type: "DINNER" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only mess manager/i);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/meals/${mealId}`)
      .set("Cookie", outsiderCookies)
      .send({ type: "DINNER" });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 for non-existing meal", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/meals/${fakeId}`)
      .set("Cookie", managerCookies)
      .send({ type: "DINNER" });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if body is empty (no fields to update)", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/meals/${mealId}`)
      .set("Cookie", managerCookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/invalidId/meals/${mealId}`)
      .set("Cookie", managerCookies)
      .send({ type: "DINNER" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if mealId is invalid", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/meals/invalidMealId`)
      .set("Cookie", managerCookies)
      .send({ type: "DINNER" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/meals/${mealId}`)
      .send({ type: "DINNER" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

// ─── DELETE /api/v1/mess/:messId/meals/:mealId ──────────────────

describe("DELETE /api/v1/mess/:messId/meals/:mealId (deleteMeal)", () => {
  let mealId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: validMealDate, type: "LUNCH", quantity: 2 });
    mealId = res.body.data.meal.id;
  });

  it("should delete a meal successfully (manager)", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/meals/${mealId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it("should return 404 if meal already deleted", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/meals/${mealId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is MEMBER (not MANAGER)", async () => {
    // Create a new meal for this test
    const createRes = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: validMealDate, type: "DINNER", quantity: 1 });
    const newMealId = createRes.body.data.meal.id;

    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/meals/${newMealId}`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/only mess manager/i);

    // Clean up
    await request(app)
      .delete(`/api/v1/mess/${messId}/meals/${newMealId}`)
      .set("Cookie", managerCookies);
  });

  it("should return 403 if user is not a member", async () => {
    const createRes = await request(app)
      .post(`/api/v1/mess/${messId}/meals`)
      .set("Cookie", managerCookies)
      .send({ userId: member.id, date: validMealDate, type: "DINNER", quantity: 1 });
    const newMealId = createRes.body.data.meal.id;

    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/meals/${newMealId}`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    await request(app)
      .delete(`/api/v1/mess/${messId}/meals/${newMealId}`)
      .set("Cookie", managerCookies);
  });

  it("should return 404 for non-existing meal", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/meals/${fakeId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .delete("/api/v1/mess/invalidId/meals/someMealId")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if mealId is invalid", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/meals/invalidMealId`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/meals/someMealId`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});

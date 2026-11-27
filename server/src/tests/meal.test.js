import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";
import { registerUser, createMessWith, cleanupMess, cleanupUsers, YEAR, MONTH, d } from "./helpers.js";

let manager, member, outsider, messId;

beforeAll(async () => {
  await prisma.$connect();
  manager = await registerUser("Meal Manager");
  member = await registerUser("Meal Member");
  outsider = await registerUser("Meal Outsider");
  messId = await createMessWith(manager, [member], "Meal Mess");
});

afterAll(async () => {
  await cleanupMess(messId);
  await cleanupUsers([manager, member, outsider]);
  await prisma.$disconnect();
});

const put = (cookies, entries) =>
  request(app).put(`/api/v1/mess/${messId}/meals`).set("Cookie", cookies).send({ entries });

const get = (cookies) =>
  request(app).get(`/api/v1/mess/${messId}/meals?month=${MONTH}&year=${YEAR}`).set("Cookie", cookies);

describe("PUT /api/v1/mess/:messId/meals", () => {
  it("lets the manager set meal counts for several members at once", async () => {
    const res = await put(manager.cookies, [
      { userId: manager.user.id, date: d(1), count: 2 },
      { userId: member.user.id, date: d(1), count: 1.5 },
    ]);
    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBe(2);
  });

  it("overwrites the count for the same member and day (one row per day)", async () => {
    await put(manager.cookies, [{ userId: member.user.id, date: d(1), count: 3 }]);
    const res = await get(manager.cookies);
    const rows = res.body.data.meals.filter((m) => m.userId === member.user.id && m.date === d(1));
    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(3);
  });

  it("removes the entry when count is 0", async () => {
    await put(manager.cookies, [{ userId: manager.user.id, date: d(1), count: 0 }]);
    const res = await get(manager.cookies);
    expect(res.body.data.meals.find((m) => m.userId === manager.user.id)).toBeUndefined();
  });

  it("rejects counts that are not whole or half numbers", async () => {
    const res = await put(manager.cookies, [{ userId: member.user.id, date: d(2), count: 1.3 }]);
    expect(res.status).toBe(400);
  });

  it("rejects a date that is not YYYY-MM-DD", async () => {
    const res = await put(manager.cookies, [{ userId: member.user.id, date: "2026-01-02T10:00:00Z", count: 1 }]);
    expect(res.status).toBe(400);
  });

  it("rejects users who are not in the mess", async () => {
    const res = await put(manager.cookies, [{ userId: outsider.user.id, date: d(2), count: 1 }]);
    expect(res.status).toBe(400);
  });

  it("does not let a regular member enter meals", async () => {
    const res = await put(member.cookies, [{ userId: member.user.id, date: d(2), count: 1 }]);
    expect(res.status).toBe(403);
  });

  it("requires authentication", async () => {
    const res = await request(app).put(`/api/v1/mess/${messId}/meals`).send({ entries: [] });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/mess/:messId/meals", () => {
  it("lets every member see the whole mess's meals for a month", async () => {
    const res = await get(member.cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.meals.length).toBeGreaterThan(0);
    expect(res.body.data.meals[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("requires month and year", async () => {
    const res = await request(app).get(`/api/v1/mess/${messId}/meals`).set("Cookie", member.cookies);
    expect(res.status).toBe(400);
  });

  it("blocks outsiders", async () => {
    const res = await get(outsider.cookies);
    expect(res.status).toBe(403);
  });
});

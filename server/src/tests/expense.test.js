import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";
import { registerUser, createMessWith, cleanupMess, cleanupUsers, YEAR, MONTH, d } from "./helpers.js";

let manager, member, outsider, messId;

beforeAll(async () => {
  await prisma.$connect();
  manager = await registerUser("Exp Manager");
  member = await registerUser("Exp Member");
  outsider = await registerUser("Exp Outsider");
  messId = await createMessWith(manager, [member], "Expense Mess");
});

afterAll(async () => {
  await cleanupMess(messId);
  await cleanupUsers([manager, member, outsider]);
  await prisma.$disconnect();
});

const post = (cookies, body) =>
  request(app).post(`/api/v1/mess/${messId}/expenses`).set("Cookie", cookies).send(body);

const bazar = () => ({
  kind: "MEAL",
  category: "BAZAR",
  title: "Weekly bazar",
  amount: 1500,
  date: d(3),
  paidById: member.user.id,
});

describe("POST /api/v1/mess/:messId/expenses", () => {
  it("adds a bazar expense paid by a member", async () => {
    const res = await post(manager.cookies, bazar());
    expect(res.status).toBe(201);
    expect(res.body.data.expense.kind).toBe("MEAL");
    expect(res.body.data.expense.paidBy.id).toBe(member.user.id);
    expect(res.body.data.expense.date).toBe(d(3));
  });

  it("adds a house bill paid from the mess fund", async () => {
    const res = await post(manager.cookies, {
      kind: "HOUSE",
      category: "INTERNET",
      title: "WiFi",
      amount: 1000,
      date: d(5),
      paidById: null,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.expense.paidById).toBeNull();
  });

  it("accepts custom shares that add up to the bill", async () => {
    const res = await post(manager.cookies, {
      kind: "HOUSE",
      category: "ELECTRICITY",
      title: "Current bill",
      amount: 900,
      date: d(6),
      shares: [
        { userId: manager.user.id, amount: 600 },
        { userId: member.user.id, amount: 300 },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.expense.shares).toHaveLength(2);
  });

  it("rejects custom shares that do not add up", async () => {
    const res = await post(manager.cookies, {
      kind: "HOUSE",
      category: "ELECTRICITY",
      title: "Bad split",
      amount: 900,
      date: d(6),
      shares: [{ userId: manager.user.id, amount: 100 }],
    });
    expect(res.status).toBe(400);
  });

  it("rejects a house category on a bazar expense", async () => {
    const res = await post(manager.cookies, { ...bazar(), category: "GAS" });
    expect(res.status).toBe(400);
  });

  it("rejects a payer who is not in the mess", async () => {
    const res = await post(manager.cookies, { ...bazar(), paidById: outsider.user.id });
    expect(res.status).toBe(400);
  });

  it("does not let a regular member add expenses", async () => {
    const res = await post(member.cookies, bazar());
    expect(res.status).toBe(403);
  });
});

describe("GET /api/v1/mess/:messId/expenses", () => {
  it("lists a month's expenses and filters by kind", async () => {
    const all = await request(app)
      .get(`/api/v1/mess/${messId}/expenses?month=${MONTH}&year=${YEAR}`)
      .set("Cookie", member.cookies);
    expect(all.status).toBe(200);
    expect(all.body.data.count).toBe(3);

    const meal = await request(app)
      .get(`/api/v1/mess/${messId}/expenses?month=${MONTH}&year=${YEAR}&kind=MEAL`)
      .set("Cookie", member.cookies);
    expect(meal.body.data.expenses.every((e) => e.kind === "MEAL")).toBe(true);
  });

  it("blocks outsiders", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/expenses?month=${MONTH}&year=${YEAR}`)
      .set("Cookie", outsider.cookies);
    expect(res.status).toBe(403);
  });
});

describe("PUT / DELETE /api/v1/mess/:messId/expenses/:expenseId", () => {
  let expenseId;

  beforeAll(async () => {
    const res = await post(manager.cookies, { ...bazar(), title: "To edit" });
    expenseId = res.body.data.expense.id;
  });

  it("updates an expense", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/expenses/${expenseId}`)
      .set("Cookie", manager.cookies)
      .send({ amount: 2000, paidById: null });
    expect(res.status).toBe(200);
    expect(res.body.data.expense.amount).toBe(2000);
    expect(res.body.data.expense.paidById).toBeNull();
  });

  it("deletes an expense", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/expenses/${expenseId}`)
      .set("Cookie", manager.cookies);
    expect(res.status).toBe(200);
  });

  it("returns 404 for a missing expense", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/expenses/000000000000000000000000`)
      .set("Cookie", manager.cookies);
    expect(res.status).toBe(404);
  });
});

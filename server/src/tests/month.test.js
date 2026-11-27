// End-to-end month: rent, meals, bazar, house bills, deposits, close and reopen.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";
import { registerUser, createMessWith, cleanupMess, cleanupUsers, YEAR, MONTH, d } from "./helpers.js";

let rahim, karim, outsider, messId;

const api = (path) => `/api/v1/mess/${messId}${path}`;
const summaryUrl = () => api(`/months/${YEAR}/${MONTH}`);
const row = (summary, user) => summary.members.find((m) => m.userId === user.user.id);

beforeAll(async () => {
  await prisma.$connect();
  rahim = await registerUser("Rahim"); // manager
  karim = await registerUser("Karim");
  outsider = await registerUser("Outsider");
  messId = await createMessWith(rahim, [karim], "Month Mess");

  // Room rents differ
  await request(app).patch(api(`/members/${rahim.user.id}`)).set("Cookie", rahim.cookies).send({ rentAmount: 4000 });
  await request(app).patch(api(`/members/${karim.user.id}`)).set("Cookie", rahim.cookies).send({ rentAmount: 3000 });

  // 20 + 30 meals
  await request(app)
    .put(api("/meals"))
    .set("Cookie", rahim.cookies)
    .send({
      entries: [
        { userId: rahim.user.id, date: d(1), count: 10 },
        { userId: rahim.user.id, date: d(2), count: 10 },
        { userId: karim.user.id, date: d(1), count: 15 },
        { userId: karim.user.id, date: d(2), count: 15 },
      ],
    });

  const add = (body) => request(app).post(api("/expenses")).set("Cookie", rahim.cookies).send(body);
  // Bazar 2000 -> meal rate 40
  await add({ kind: "MEAL", category: "BAZAR", title: "Bazar", amount: 2000, date: d(2), paidById: karim.user.id });
  // House bills 1000 -> 500 each
  await add({ kind: "HOUSE", category: "INTERNET", title: "WiFi", amount: 1000, date: d(3), paidById: null });

  await request(app)
    .post(api("/deposits"))
    .set("Cookie", rahim.cookies)
    .send({ userId: rahim.user.id, amount: 3000, date: d(4), method: "BKASH" });
});

afterAll(async () => {
  await cleanupMess(messId);
  await cleanupUsers([rahim, karim, outsider]);
  await prisma.$disconnect();
});

describe("month summary (open month)", () => {
  it("calculates meal rate, rent, house share and balance per member", async () => {
    const res = await request(app).get(summaryUrl()).set("Cookie", karim.cookies);
    expect(res.status).toBe(200);
    const s = res.body.data.summary;

    expect(s.status).toBe("OPEN");
    expect(s.totals.totalMeals).toBe(50);
    expect(s.totals.mealRate).toBe(40);
    expect(s.totals.houseExpense).toBe(1000);
    expect(s.totals.totalRent).toBe(7000);

    const r = row(s, rahim);
    expect(r.mealCost).toBe(800);
    expect(r.rent).toBe(4000);
    expect(r.houseShare).toBe(500);
    expect(r.totalCharge).toBe(5300);
    expect(r.deposit).toBe(3000);
    expect(r.balance).toBe(-2300);

    const k = row(s, karim);
    expect(k.mealCost).toBe(1200);
    expect(k.totalCharge).toBe(4700);
    expect(k.expenseCredit).toBe(2000);
    expect(k.balance).toBe(-2700);
  });

  it("blocks outsiders", async () => {
    const res = await request(app).get(summaryUrl()).set("Cookie", outsider.cookies);
    expect(res.status).toBe(403);
  });
});

describe("deposits", () => {
  it("lists deposits of the month", async () => {
    const res = await request(app).get(api(`/deposits?month=${MONTH}&year=${YEAR}`)).set("Cookie", karim.cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.deposits[0].method).toBe("BKASH");
  });

  it("only the manager can record deposits", async () => {
    const res = await request(app)
      .post(api("/deposits"))
      .set("Cookie", karim.cookies)
      .send({ userId: karim.user.id, amount: 100, date: d(5) });
    expect(res.status).toBe(403);
  });
});

describe("member settings", () => {
  it("does not let a regular member change rent", async () => {
    const res = await request(app)
      .patch(api(`/members/${karim.user.id}`))
      .set("Cookie", karim.cookies)
      .send({ rentAmount: 1 });
    expect(res.status).toBe(403);
  });

  it("keeps at least one manager", async () => {
    const res = await request(app)
      .patch(api(`/members/${rahim.user.id}`))
      .set("Cookie", rahim.cookies)
      .send({ role: "MEMBER" });
    expect(res.status).toBe(400);
  });
});

describe("closing a month", () => {
  it("only the manager can close", async () => {
    const res = await request(app).post(`${summaryUrl()}/close`).set("Cookie", karim.cookies);
    expect(res.status).toBe(403);
  });

  it("closes the month and freezes the charges", async () => {
    const res = await request(app).post(`${summaryUrl()}/close`).set("Cookie", rahim.cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.status).toBe("CLOSED");
    expect(row(res.body.data.summary, rahim).totalCharge).toBe(5300);
  });

  it("locks meals and expenses of a closed month", async () => {
    const meal = await request(app)
      .put(api("/meals"))
      .set("Cookie", rahim.cookies)
      .send({ entries: [{ userId: karim.user.id, date: d(9), count: 2 }] });
    expect(meal.status).toBe(409);

    const exp = await request(app)
      .post(api("/expenses"))
      .set("Cookie", rahim.cookies)
      .send({ kind: "MEAL", category: "BAZAR", title: "Late", amount: 10, date: d(9) });
    expect(exp.status).toBe(409);
  });

  it("still accepts deposits that pay off a closed month", async () => {
    await request(app)
      .post(api("/deposits"))
      .set("Cookie", rahim.cookies)
      .send({ userId: karim.user.id, amount: 2700, date: "2026-02-03", month: MONTH, year: YEAR });

    const res = await request(app).get(summaryUrl()).set("Cookie", karim.cookies);
    expect(row(res.body.data.summary, karim).balance).toBe(0);
  });

  it("lists closed months with the caller's balance", async () => {
    const res = await request(app).get(api("/months")).set("Cookie", karim.cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.months[0]).toMatchObject({ year: YEAR, month: MONTH, myBalance: 0 });
  });

  it("cannot close the same month twice", async () => {
    const res = await request(app).post(`${summaryUrl()}/close`).set("Cookie", rahim.cookies);
    expect(res.status).toBe(409);
  });

  it("reopens the month", async () => {
    const res = await request(app).post(`${summaryUrl()}/reopen`).set("Cookie", rahim.cookies);
    expect(res.status).toBe(200);
    expect(res.body.data.summary.status).toBe("OPEN");
  });
});

describe("removing a member", () => {
  it("deactivates the member but keeps them in that month's calculation", async () => {
    const del = await request(app).delete(api(`/members/${karim.user.id}`)).set("Cookie", rahim.cookies);
    expect(del.status).toBe(200);

    const denied = await request(app).get(summaryUrl()).set("Cookie", karim.cookies);
    expect(denied.status).toBe(403);

    const res = await request(app).get(summaryUrl()).set("Cookie", rahim.cookies);
    expect(row(res.body.data.summary, karim).mealCost).toBe(1200);
  });
});

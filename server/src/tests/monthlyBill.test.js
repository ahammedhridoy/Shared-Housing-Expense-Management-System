import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";

let manager, managerCookies;
let member, memberCookies;
let outsider, outsiderCookies;
let messId;

const TEST_MONTH = 3;
const TEST_YEAR = 2026;

const managerData = {
  name: "Bill Manager",
  email: `billmgr${Date.now()}@example.com`,
  password: "password123",
};

const memberData = {
  name: "Bill Member",
  email: `billmember${Date.now()}@example.com`,
  password: "password123",
};

const outsiderData = {
  name: "Bill Outsider",
  email: `billoutsider${Date.now()}@example.com`,
  password: "password123",
};

async function cleanBillData(targetMessId) {
  if (!targetMessId) return;
  const bills = await prisma.monthlyBill.findMany({
    where: { messId: targetMessId },
    select: { id: true },
  });
  const billIds = bills.map((b) => b.id);
  if (billIds.length > 0) {
    await prisma.settlement.deleteMany({ where: { billId: { in: billIds } } });
    await prisma.monthlyBill.deleteMany({ where: { id: { in: billIds } } });
  }
  await prisma.expense.deleteMany({ where: { messId: targetMessId } });
  await prisma.meal.deleteMany({ where: { messId: targetMessId } });
  await prisma.invitation.deleteMany({ where: { messId: targetMessId } });
  await prisma.messMember.deleteMany({ where: { messId: targetMessId } });
  await prisma.mess.deleteMany({ where: { id: targetMessId } });
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

  const messRes = await request(app)
    .post("/api/v1/mess")
    .set("Cookie", managerCookies)
    .send({ name: "Bill Test Mess" });
  messId = messRes.body.data.mess.id;

  const invRes = await request(app)
    .post(`/api/v1/invitations/mess/${messId}`)
    .set("Cookie", managerCookies)
    .send({ email: memberData.email });
  const invId = invRes.body.data.invitation.id;
  await request(app)
    .post(`/api/v1/invitations/${invId}/accept`)
    .set("Cookie", memberCookies);

  const startDate = new Date(TEST_YEAR, TEST_MONTH - 1, 5);
  const endDate = new Date(TEST_YEAR, TEST_MONTH - 1, 20);

  await prisma.expense.createMany({
    data: [
      {
        messId,
        recordedBy: manager.id,
        title: "Groceries",
        amount: 500,
        category: "FOOD",
        date: startDate,
      },
      {
        messId,
        recordedBy: manager.id,
        title: "Electricity",
        amount: 200,
        category: "ELECTRICITY",
        date: endDate,
      },
    ],
  });

  await prisma.meal.createMany({
    data: [
      {
        userId: manager.id,
        messId,
        date: startDate,
        type: "BREAKFAST",
        quantity: 2,
      },
      {
        userId: manager.id,
        messId,
        date: startDate,
        type: "LUNCH",
        quantity: 3,
      },
      {
        userId: member.id,
        messId,
        date: endDate,
        type: "BREAKFAST",
        quantity: 2,
      },
      { userId: member.id, messId, date: endDate, type: "DINNER", quantity: 3 },
    ],
  });
});

afterAll(async () => {
  await cleanBillData(messId);
  await prisma.$disconnect();
});

// POST /api/v1/mess/:messId/bills/finalize

describe("POST /api/v1/mess/:messId/bills/finalize (finalizeMonth)", () => {
  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/bills/finalize`)
      .send({ month: TEST_MONTH, year: TEST_YEAR });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/bills/finalize`)
      .set("Cookie", outsiderCookies)
      .send({ month: TEST_MONTH, year: TEST_YEAR });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is MEMBER (not MANAGER)", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/bills/finalize`)
      .set("Cookie", memberCookies)
      .send({ month: TEST_MONTH, year: TEST_YEAR });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/mess/invalidId/bills/finalize")
      .set("Cookie", managerCookies)
      .send({ month: TEST_MONTH, year: TEST_YEAR });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if month is missing", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/bills/finalize`)
      .set("Cookie", managerCookies)
      .send({ year: TEST_YEAR });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if year is missing", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/bills/finalize`)
      .set("Cookie", managerCookies)
      .send({ month: TEST_MONTH });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if month is less than 1", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/bills/finalize`)
      .set("Cookie", managerCookies)
      .send({ month: 0, year: TEST_YEAR });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if month is greater than 12", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/bills/finalize`)
      .set("Cookie", managerCookies)
      .send({ month: 13, year: TEST_YEAR });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if year is less than 2000", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/bills/finalize`)
      .set("Cookie", managerCookies)
      .send({ month: TEST_MONTH, year: 1999 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should finalize a month successfully with correct bill and settlements", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/bills/finalize`)
      .set("Cookie", managerCookies)
      .send({ month: TEST_MONTH, year: TEST_YEAR });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Month finalized successfully");

    const { bill, settlements } = res.body.data;

    expect(bill.messId).toBe(messId);
    expect(bill.month).toBe(TEST_MONTH);
    expect(bill.year).toBe(TEST_YEAR);
    expect(bill.totalMeals).toBe(10);
    expect(bill.totalExpense).toBe(700);
    expect(bill.mealRate).toBeCloseTo(70);
    expect(bill.status).toBe("FINALIZED");
    expect(bill.id).toBeDefined();
    expect(bill.createdAt).toBeDefined();
    expect(bill.updatedAt).toBeDefined();

    expect(settlements).toHaveLength(2);

    const mgrSettlement = settlements.find((s) => s.userId === manager.id);
    const memSettlement = settlements.find((s) => s.userId === member.id);

    expect(mgrSettlement).toBeDefined();
    expect(mgrSettlement.mealCount).toBe(5);
    expect(mgrSettlement.status).toBe("UNPAID");
    expect(mgrSettlement.paidAmount).toBe(0);
    expect(mgrSettlement.dueAmount).toBeGreaterThan(0);
    expect(mgrSettlement.user).toBeDefined();
    expect(mgrSettlement.user.name).toBeDefined();
    expect(mgrSettlement.user.email).toBeDefined();

    expect(memSettlement).toBeDefined();
    expect(memSettlement.mealCount).toBe(5);
    expect(memSettlement.status).toBe("UNPAID");
    expect(memSettlement.user.name).toBeDefined();
  });

  it("should return 400 if month already finalized", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/bills/finalize`)
      .set("Cookie", managerCookies)
      .send({ month: TEST_MONTH, year: TEST_YEAR });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if no meals found for the month", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/bills/finalize`)
      .set("Cookie", managerCookies)
      .send({ month: 12, year: TEST_YEAR });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// GET /api/v1/mess/:messId/bills (getMessBills)

describe("GET /api/v1/mess/:messId/bills (getMessBills)", () => {
  it("should return 401 without authentication", async () => {
    const res = await request(app).get(`/api/v1/mess/${messId}/bills`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .get("/api/v1/mess/invalidId/bills")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return bills for the mess", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.bills)).toBe(true);
    expect(res.body.data.count).toBeGreaterThanOrEqual(1);
  });

  it("should return bills ordered by year desc, month desc", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const { bills } = res.body.data;
    for (let i = 0; i < bills.length - 1; i++) {
      const curr = bills[i];
      const next = bills[i + 1];
      const currTotal = curr.year * 100 + curr.month;
      const nextTotal = next.year * 100 + next.month;
      expect(currTotal).toBeGreaterThanOrEqual(nextTotal);
    }
  });

  it("should include bill fields in each bill", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    res.body.data.bills.forEach((bill) => {
      expect(bill).toHaveProperty("id");
      expect(bill.messId).toBe(messId);
      expect(bill).toHaveProperty("month");
      expect(bill).toHaveProperty("year");
      expect(bill).toHaveProperty("totalMeals");
      expect(bill).toHaveProperty("totalExpense");
      expect(bill).toHaveProperty("mealRate");
      expect(bill).toHaveProperty("status");
      expect(bill).toHaveProperty("createdAt");
    });
  });

  it("should not include settlements in bills list", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    res.body.data.bills.forEach((bill) => {
      expect(bill.settlements).toBeUndefined();
    });
  });

  it("should also work for MEMBER role", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bills.length).toBeGreaterThanOrEqual(1);
  });
});

//  GET /api/v1/mess/:messId/bills/:month/:year

describe("GET /api/v1/mess/:messId/bills/:month/:year (getMonthlyBill)", () => {
  it("should return 401 without authentication", async () => {
    const res = await request(app).get(
      `/api/v1/mess/${messId}/bills/${TEST_MONTH}/${TEST_YEAR}`,
    );

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills/${TEST_MONTH}/${TEST_YEAR}`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/invalidId/bills/${TEST_MONTH}/${TEST_YEAR}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if month is invalid", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills/abc/${TEST_YEAR}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if year is invalid", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills/${TEST_MONTH}/abc`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 if no bill found for the month", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills/11/${TEST_YEAR}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should return the bill with settlements", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills/${TEST_MONTH}/${TEST_YEAR}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Bill fetched successfully");

    const { bill } = res.body.data;
    expect(bill.messId).toBe(messId);
    expect(bill.month).toBe(TEST_MONTH);
    expect(bill.year).toBe(TEST_YEAR);
    expect(bill.status).toBe("FINALIZED");
    expect(Array.isArray(bill.settlements)).toBe(true);
    expect(bill.settlements.length).toBeGreaterThan(0);
  });

  it("should include settlement details with user info", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills/${TEST_MONTH}/${TEST_YEAR}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const { bill } = res.body.data;
    bill.settlements.forEach((s) => {
      expect(s).toHaveProperty("id");
      expect(s).toHaveProperty("userId");
      expect(s).toHaveProperty("mealCount");
      expect(s).toHaveProperty("mealCost");
      expect(s).toHaveProperty("expenseShare");
      expect(s).toHaveProperty("totalAmount");
      expect(s).toHaveProperty("paidAmount");
      expect(s).toHaveProperty("dueAmount");
      expect(s).toHaveProperty("status");
      expect(s.user).toBeDefined();
      expect(s.user.id).toBeDefined();
      expect(s.user.name).toBeDefined();
      expect(s.user.email).toBeDefined();
    });
  });

  it("should also work for MEMBER role", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/bills/${TEST_MONTH}/${TEST_YEAR}`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.bill.month).toBe(TEST_MONTH);
  });
});

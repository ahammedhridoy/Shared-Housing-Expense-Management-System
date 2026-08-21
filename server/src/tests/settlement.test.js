import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";

let manager, managerCookies;
let member, memberCookies;
let outsider, outsiderCookies;
let messId, billId, managerSettlementId, memberSettlementId;
let otherMessId, otherBillId;

const managerData = {
  name: "Settlement Manager",
  email: `settmgr${Date.now()}@example.com`,
  password: "password123",
};

const memberData = {
  name: "Settlement Member",
  email: `settmember${Date.now()}@example.com`,
  password: "password123",
};

const outsiderData = {
  name: "Settlement Outsider",
  email: `settoutsider${Date.now()}@example.com`,
  password: "password123",
};

async function cleanMessData(targetMessId) {
  if (!targetMessId) return;
  const payments = await prisma.payment.findMany({
    where: { messId: targetMessId },
    select: { id: true },
  });
  if (payments.length > 0) {
    await prisma.payment.deleteMany({
      where: { id: { in: payments.map((p) => p.id) } },
    });
  }
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

async function setupMess(owner, invitee, messName, month, year) {
  const mess = await prisma.mess.create({
    data: { name: messName },
  });

  await prisma.messMember.createMany({
    data: [
      { userId: owner.id, messId: mess.id, role: "MANAGER" },
      { userId: invitee.id, messId: mess.id, role: "MEMBER" },
    ],
  });

  await prisma.expense.createMany({
    data: [
      {
        messId: mess.id,
        recordedBy: owner.id,
        title: "Food",
        amount: 600,
        category: "FOOD",
        date: new Date(year, month - 1, 5),
      },
      {
        messId: mess.id,
        recordedBy: owner.id,
        title: "Utilities",
        amount: 400,
        category: "ELECTRICITY",
        date: new Date(year, month - 1, 15),
      },
    ],
  });

  await prisma.meal.createMany({
    data: [
      {
        userId: owner.id,
        messId: mess.id,
        date: new Date(year, month - 1, 5),
        type: "BREAKFAST",
        quantity: 3,
      },
      {
        userId: owner.id,
        messId: mess.id,
        date: new Date(year, month - 1, 5),
        type: "LUNCH",
        quantity: 2,
      },
      {
        userId: invitee.id,
        messId: mess.id,
        date: new Date(year, month - 1, 15),
        type: "BREAKFAST",
        quantity: 2,
      },
      {
        userId: invitee.id,
        messId: mess.id,
        date: new Date(year, month - 1, 15),
        type: "DINNER",
        quantity: 3,
      },
    ],
  });

  const finalizeRes = await request(app)
    .post(`/api/v1/mess/${mess.id}/bills/finalize`)
    .set("Cookie", managerCookies)
    .send({ month, year });
  const bill = finalizeRes.body.data.bill;

  const settlements = await prisma.settlement.findMany({
    where: { billId: bill.id },
  });

  return { messId: mess.id, billId: bill.id, settlements };
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

  const main = await setupMess(
    manager,
    member,
    "Main Settlement Mess",
    4,
    2025,
  );
  messId = main.messId;
  billId = main.billId;
  managerSettlementId = main.settlements.find(
    (s) => s.userId === manager.id,
  )?.id;
  memberSettlementId = main.settlements.find((s) => s.userId === member.id)?.id;

  const other = await setupMess(
    manager,
    member,
    "Other Settlement Mess",
    5,
    2025,
  );
  otherMessId = other.messId;
  otherBillId = other.billId;
}, 30000);

afterAll(async () => {
  await cleanMessData(messId);
  await cleanMessData(otherMessId);
  await prisma.$disconnect();
});

// GET /api/v1/mess/:messId/settlements/my

describe("GET /api/v1/mess/:messId/settlements/my", () => {
  it("should return only logged-in user's settlements", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const { settlements } = res.body.data;
    settlements.forEach((s) => {
      expect(s.userId).toBe(manager.id);
    });
  });

  it("should include bill fields in each settlement", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const settlement = res.body.data.settlements[0];
    expect(settlement.bill).toBeDefined();
    expect(settlement.bill).toHaveProperty("id");
    expect(settlement.bill).toHaveProperty("month");
    expect(settlement.bill).toHaveProperty("year");
    expect(settlement.bill).toHaveProperty("totalMeals");
    expect(settlement.bill).toHaveProperty("totalExpense");
    expect(settlement.bill).toHaveProperty("mealRate");
    expect(settlement.bill).toHaveProperty("status");
  });

  it("should include all settlement select fields", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const s = res.body.data.settlements[0];
    expect(s).toHaveProperty("id");
    expect(s).toHaveProperty("billId");
    expect(s).toHaveProperty("userId");
    expect(s).toHaveProperty("mealCount");
    expect(s).toHaveProperty("mealCost");
    expect(s).toHaveProperty("expenseShare");
    expect(s).toHaveProperty("totalAmount");
    expect(s).toHaveProperty("paidAmount");
    expect(s).toHaveProperty("dueAmount");
    expect(s).toHaveProperty("status");
    expect(s).toHaveProperty("createdAt");
    expect(s).toHaveProperty("updatedAt");
  });

  it("should order settlements by bill year desc, month desc", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const { settlements } = res.body.data;
    if (settlements.length >= 2) {
      for (let i = 0; i < settlements.length - 1; i++) {
        const curr = settlements[i];
        const next = settlements[i + 1];
        const currKey = curr.bill.year * 100 + curr.bill.month;
        const nextKey = next.bill.year * 100 + next.bill.month;
        expect(currKey).toBeGreaterThanOrEqual(nextKey);
      }
    }
  });

  it("should return 403 for non-member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return different results for different users", async () => {
    const mgrRes = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", managerCookies);
    const memRes = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", memberCookies);

    expect(mgrRes.status).toBe(200);
    expect(memRes.status).toBe(200);

    const mgrIds = mgrRes.body.data.settlements.map((s) => s.userId);
    const memIds = memRes.body.data.settlements.map((s) => s.userId);

    mgrIds.forEach((id) => expect(id).toBe(manager.id));
    memIds.forEach((id) => expect(id).toBe(member.id));
  });

  it("should return 400 for invalid messId", async () => {
    const res = await request(app)
      .get("/api/v1/mess/invalidId/settlements/my")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
  });
});

// GET /api/v1/mess/:messId/settlements/bill/:billId

describe("GET /api/v1/mess/:messId/settlements/bill/:billId", () => {
  it("should return all settlements for the bill", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/bill/${billId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.settlements.length).toBe(2);
    res.body.data.settlements.forEach((s) => {
      expect(s.billId).toBe(billId);
    });
  });

  it("should order settlements by totalAmount desc", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/bill/${billId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const { settlements } = res.body.data;
    for (let i = 0; i < settlements.length - 1; i++) {
      expect(settlements[i].totalAmount).toBeGreaterThanOrEqual(
        settlements[i + 1].totalAmount,
      );
    }
  });

  it("should include user info in each settlement", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/bill/${billId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    res.body.data.settlements.forEach((s) => {
      expect(s.user).toBeDefined();
      expect(s.user).toHaveProperty("id");
      expect(s.user).toHaveProperty("name");
      expect(s.user).toHaveProperty("email");
    });
  });

  it("should include all settlement select fields", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/bill/${billId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    const s = res.body.data.settlements[0];
    expect(s).toHaveProperty("mealCount");
    expect(s).toHaveProperty("mealCost");
    expect(s).toHaveProperty("expenseShare");
    expect(s).toHaveProperty("totalAmount");
    expect(s).toHaveProperty("paidAmount");
    expect(s).toHaveProperty("dueAmount");
    expect(s).toHaveProperty("status");
    expect(s).toHaveProperty("createdAt");
    expect(s).toHaveProperty("updatedAt");
  });

  it("should return 404 if bill belongs to a different mess", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/bill/${otherBillId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(404);
  });

  it("should return 400 for invalid billId format", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/bill/notAnId`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
  });

  it("should return 400 for invalid messId format", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/badMess/settlements/bill/${billId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
  });

  it("should return 403 for non-member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/bill/${billId}`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
  });
});

// POST /api/v1/mess/:messId/settlements/:settlementId/pay

describe("POST /api/v1/mess/:messId/settlements/:settlementId/pay", () => {
  it("should return 400 if amount is a string", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", managerCookies)
      .send({ amount: "500" });

    expect(res.status).toBe(400);
  });

  it("should return 400 if amount is zero", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", managerCookies)
      .send({ amount: 0 });

    expect(res.status).toBe(400);
  });

  it("should return 400 if amount is negative", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", managerCookies)
      .send({ amount: -50 });

    expect(res.status).toBe(400);
  });

  it("should return 400 if amount is not a number", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", managerCookies)
      .send({ amount: null });

    expect(res.status).toBe(400);
  });

  it("should return 400 if amount exceeds due amount", async () => {
    const getRes = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", managerCookies);
    const mySettlement = getRes.body.data.settlements.find(
      (s) => s.userId === manager.id,
    );

    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", managerCookies)
      .send({ amount: mySettlement.dueAmount + 1 });

    expect(res.status).toBe(400);
  });

  it("should return 404 for settlement in a different mess", async () => {
    const res = await request(app)
      .post(
        `/api/v1/mess/${otherMessId}/settlements/${managerSettlementId}/pay`,
      )
      .set("Cookie", managerCookies)
      .send({ amount: 10 });

    expect(res.status).toBe(404);
  });

  it("should return 403 for outsider", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", outsiderCookies)
      .send({ amount: 10 });

    expect(res.status).toBe(403);
  });

  it("should handle multiple sequential partial payments", async () => {
    const getRes = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", memberCookies);
    const mySettlement = getRes.body.data.settlements.find(
      (s) => s.userId === member.id,
    );
    const totalDue = mySettlement.dueAmount;
    if (totalDue < 20) return;

    const pay1 = Math.floor(totalDue / 3);
    const res1 = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${memberSettlementId}/pay`)
      .set("Cookie", memberCookies)
      .send({ amount: pay1 });

    expect(res1.status).toBe(200);
    expect(res1.body.data.settlement.paidAmount).toBe(
      mySettlement.paidAmount + pay1,
    );
    expect(res1.body.data.settlement.status).toBe("PARTIAL");

    const pay2 = totalDue - pay1;
    const res2 = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${memberSettlementId}/pay`)
      .set("Cookie", memberCookies)
      .send({ amount: pay2 });

    expect(res2.status).toBe(200);
    expect(res2.body.data.settlement.status).toBe("PAID");
    expect(res2.body.data.settlement.dueAmount).toBe(0);
    expect(res2.body.data.settlement.paidAmount).toBe(
      res2.body.data.settlement.totalAmount,
    );
  });

  it("should return 400 if settlement is already fully paid", async () => {
    const getRes = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", memberCookies);
    const mySettlement = getRes.body.data.settlements.find(
      (s) => s.userId === member.id,
    );

    if (mySettlement.status !== "PAID") return;

    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${memberSettlementId}/pay`)
      .set("Cookie", memberCookies)
      .send({ amount: 1 });

    expect(res.status).toBe(400);
  });

  it("should include user info in payment response", async () => {
    const getRes = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", managerCookies);
    const mySettlement = getRes.body.data.settlements.find(
      (s) => s.userId === manager.id,
    );
    const dueRemaining = mySettlement.dueAmount;
    if (dueRemaining <= 0) return;

    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", managerCookies)
      .send({ amount: dueRemaining });

    expect(res.status).toBe(200);
    const { settlement } = res.body.data;
    expect(settlement.user).toBeDefined();
    expect(settlement.user.id).toBe(manager.id);
    expect(settlement.user.name).toBe(managerData.name);
    expect(settlement.user.email).toBe(managerData.email);
  });

  it("should create a linked Payment record on payment", async () => {
    const beforePayments = await prisma.payment.findMany({
      where: { messId, userId: manager.id },
    });
    const beforeCount = beforePayments.length;

    const getRes = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", managerCookies);
    const mySettlement = getRes.body.data.settlements.find(
      (s) => s.userId === manager.id,
    );
    if (mySettlement.dueAmount <= 0) return;

    const payAmount = 5;
    await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", managerCookies)
      .send({ amount: payAmount });

    const afterPayments = await prisma.payment.findMany({
      where: { messId, userId: manager.id },
      orderBy: { createdAt: "desc" },
    });
    expect(afterPayments.length).toBe(beforeCount + 1);

    const newPayment = afterPayments[0];
    expect(newPayment.amount).toBe(payAmount);
    expect(newPayment.messId).toBe(messId);
    expect(newPayment.userId).toBe(manager.id);
  });
});

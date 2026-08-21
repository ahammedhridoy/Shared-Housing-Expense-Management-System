import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";

let manager, managerCookies;
let member, memberCookies;
let outsider, outsiderCookies;
let messId, managerSettlementId, memberSettlementId, billId;

const VALID_PAYMENT_DATA = {
  amount: 500,
  date: new Date().toISOString(),
  method: "CASH",
  note: "Groceries for the week",
};

const managerData = {
  name: "Payment Manager",
  email: `paymgr${Date.now()}@example.com`,
  password: "password123",
};

const memberData = {
  name: "Payment Member",
  email: `paymember${Date.now()}@example.com`,
  password: "password123",
};

const outsiderData = {
  name: "Payment Outsider",
  email: `payoutsider${Date.now()}@example.com`,
  password: "password123",
};

async function cleanPaymentData(targetMessId) {
  if (!targetMessId) return;
  const payments = await prisma.payment.findMany({
    where: { messId: targetMessId },
    select: { id: true },
  });
  const paymentIds = payments.map((p) => p.id);
  if (paymentIds.length > 0) {
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
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
    .send({ name: "Payment Test Mess" });
  messId = messRes.body.data.mess.id;

  const invRes = await request(app)
    .post(`/api/v1/invitations/mess/${messId}`)
    .set("Cookie", managerCookies)
    .send({ email: memberData.email });
  const invId = invRes.body.data.invitation.id;
  await request(app)
    .post(`/api/v1/invitations/${invId}/accept`)
    .set("Cookie", memberCookies);

  const billMonth = 3;
  const billYear = 2025;

  await prisma.expense.createMany({
    data: [
      {
        messId,
        recordedBy: manager.id,
        title: "Groceries",
        amount: 500,
        category: "FOOD",
        date: new Date(billYear, billMonth - 1, 5),
      },
      {
        messId,
        recordedBy: manager.id,
        title: "Electricity",
        amount: 200,
        category: "ELECTRICITY",
        date: new Date(billYear, billMonth - 1, 20),
      },
    ],
  });

  await prisma.meal.createMany({
    data: [
      {
        userId: manager.id,
        messId,
        date: new Date(billYear, billMonth - 1, 5),
        type: "BREAKFAST",
        quantity: 2,
      },
      {
        userId: manager.id,
        messId,
        date: new Date(billYear, billMonth - 1, 5),
        type: "LUNCH",
        quantity: 3,
      },
      {
        userId: member.id,
        messId,
        date: new Date(billYear, billMonth - 1, 20),
        type: "BREAKFAST",
        quantity: 2,
      },
      {
        userId: member.id,
        messId,
        date: new Date(billYear, billMonth - 1, 20),
        type: "DINNER",
        quantity: 3,
      },
    ],
  });

  const finalizeRes = await request(app)
    .post(`/api/v1/mess/${messId}/bills/finalize`)
    .set("Cookie", managerCookies)
    .send({ month: billMonth, year: billYear });
  billId = finalizeRes.body.data.bill.id;

  const settlements = await prisma.settlement.findMany({
    where: { billId },
  });
  managerSettlementId = settlements.find((s) => s.userId === manager.id)?.id;
  memberSettlementId = settlements.find((s) => s.userId === member.id)?.id;
});

afterAll(async () => {
  await cleanPaymentData(messId);
  await prisma.$disconnect();
});

// POST /api/v1/mess/:messId/payments (addPayment)

describe("POST /api/v1/mess/:messId/payments (addPayment)", () => {
  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .send({ ...VALID_PAYMENT_DATA, payerId: manager.id });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", outsiderCookies)
      .send({ ...VALID_PAYMENT_DATA, payerId: manager.id });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is MEMBER (not MANAGER)", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", memberCookies)
      .send({ ...VALID_PAYMENT_DATA, payerId: member.id });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .post("/api/v1/mess/invalidId/payments")
      .set("Cookie", managerCookies)
      .send({ ...VALID_PAYMENT_DATA, payerId: manager.id });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if payerId is missing", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({ amount: 500, date: new Date().toISOString(), method: "CASH" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if amount is missing", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({
        payerId: manager.id,
        date: new Date().toISOString(),
        method: "CASH",
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if date is missing", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({ payerId: manager.id, amount: 500, method: "CASH" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if method is missing", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({
        payerId: manager.id,
        amount: 500,
        date: new Date().toISOString(),
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if payerId is invalid format", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({ ...VALID_PAYMENT_DATA, payerId: "notAnId" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if amount is not positive", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({ ...VALID_PAYMENT_DATA, payerId: manager.id, amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if method is invalid", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({ ...VALID_PAYMENT_DATA, payerId: manager.id, method: "BITCOIN" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if payer is not a member", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({ ...VALID_PAYMENT_DATA, payerId: outsider.id });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should create payment successfully", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({ ...VALID_PAYMENT_DATA, payerId: manager.id });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Payment recorded successfully");

    const { payment } = res.body.data;
    expect(payment.messId).toBe(messId);
    expect(payment.userId).toBe(manager.id);
    expect(payment.recordedBy).toBe(manager.id);
    expect(payment.amount).toBe(500);
    expect(payment.method).toBe("CASH");
    expect(payment.note).toBe("Groceries for the week");
    expect(payment.id).toBeDefined();
    expect(payment.createdAt).toBeDefined();
    expect(payment.updatedAt).toBeDefined();
  });

  it("should include user (payer) info in response", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({ ...VALID_PAYMENT_DATA, payerId: member.id });

    expect(res.status).toBe(201);
    const { payment } = res.body.data;
    expect(payment.user).toBeDefined();
    expect(payment.user.id).toBe(member.id);
    expect(payment.user.name).toBe(memberData.name);
    expect(payment.user.email).toBe(memberData.email);
  });

  it("should include recorder info in response", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({ ...VALID_PAYMENT_DATA, payerId: manager.id });

    expect(res.status).toBe(201);
    const { payment } = res.body.data;
    expect(payment.recorder).toBeDefined();
    expect(payment.recorder.id).toBe(manager.id);
    expect(payment.recorder.name).toBe(managerData.name);
    expect(payment.recorder.email).toBe(managerData.email);
  });

  it("should create payment without optional note", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({
        payerId: manager.id,
        amount: 100,
        date: new Date().toISOString(),
        method: "BANK",
      });

    expect(res.status).toBe(201);
    expect(res.body.data.payment.note).toBeNull();
  });
});

// GET /api/v1/mess/:messId/payments (getPayments)

describe("GET /api/v1/mess/:messId/payments (getPayments)", () => {
  it("should return 401 without authentication", async () => {
    const res = await request(app).get(`/api/v1/mess/${messId}/payments`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .get("/api/v1/mess/invalidId/payments")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return payments list", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Payments fetched successfully");
    expect(Array.isArray(res.body.data.payments)).toBe(true);
    expect(res.body.data.count).toBeGreaterThanOrEqual(3);
  });

  it("should include payment fields in each item", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    res.body.data.payments.forEach((p) => {
      expect(p).toHaveProperty("id");
      expect(p.messId).toBe(messId);
      expect(p).toHaveProperty("userId");
      expect(p).toHaveProperty("recordedBy");
      expect(p).toHaveProperty("amount");
      expect(p).toHaveProperty("date");
      expect(p).toHaveProperty("method");
      expect(p).toHaveProperty("createdAt");
    });
  });

  it("should include user and recorder info", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    res.body.data.payments.forEach((p) => {
      expect(p.user).toBeDefined();
      expect(p.user.id).toBeDefined();
      expect(p.user.name).toBeDefined();
      expect(p.user.email).toBeDefined();
      expect(p.recorder).toBeDefined();
      expect(p.recorder.id).toBeDefined();
      expect(p.recorder.name).toBeDefined();
      expect(p.recorder.email).toBeDefined();
    });
  });

  it("should filter payments by method", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments?method=BANK`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    res.body.data.payments.forEach((p) => {
      expect(p.method).toBe("BANK");
    });
  });

  it("should return 400 for invalid method filter", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments?method=BITCOIN`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 for invalid startDate", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments?startDate=not-a-date`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 for invalid endDate", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments?endDate=not-a-date`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should also work for MEMBER role", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(200);
    expect(res.body.data.payments.length).toBeGreaterThanOrEqual(1);
  });
});

// GET /api/v1/mess/:messId/payments/:paymentId (getPaymentById)

describe("GET /api/v1/mess/:messId/payments/:paymentId (getPaymentById)", () => {
  let testPaymentId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({
        payerId: manager.id,
        amount: 300,
        date: new Date().toISOString(),
        method: "MOBILE_BANKING",
      });
    testPaymentId = res.body.data.payment.id;
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app).get(
      `/api/v1/mess/${messId}/payments/${testPaymentId}`,
    );

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments/${testPaymentId}`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/invalidId/payments/${testPaymentId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if paymentId is invalid", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments/invalidPaymentId`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 if payment not found", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments/${fakeId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should return payment with full details", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/payments/${testPaymentId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Payment fetched successfully");

    const { payment } = res.body.data;
    expect(payment.id).toBe(testPaymentId);
    expect(payment.messId).toBe(messId);
    expect(payment.amount).toBe(300);
    expect(payment.method).toBe("MOBILE_BANKING");
    expect(payment.user).toBeDefined();
    expect(payment.user.id).toBeDefined();
    expect(payment.user.name).toBeDefined();
    expect(payment.user.email).toBeDefined();
    expect(payment.recorder).toBeDefined();
    expect(payment.recorder.id).toBeDefined();
    expect(payment.recorder.name).toBeDefined();
    expect(payment.recorder.email).toBeDefined();
  });
});

// PUT /api/v1/mess/:messId/payments/:paymentId (updatePayment)

describe("PUT /api/v1/mess/:messId/payments/:paymentId (updatePayment)", () => {
  let updateTargetId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({
        payerId: manager.id,
        amount: 750,
        date: new Date().toISOString(),
        method: "CASH",
        note: "Target for update",
      });
    updateTargetId = res.body.data.payment.id;
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/payments/${updateTargetId}`)
      .send({ amount: 800 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/payments/${updateTargetId}`)
      .set("Cookie", outsiderCookies)
      .send({ amount: 800 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is MEMBER (not MANAGER)", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/payments/${updateTargetId}`)
      .set("Cookie", memberCookies)
      .send({ amount: 800 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/invalidId/payments/${updateTargetId}`)
      .set("Cookie", managerCookies)
      .send({ amount: 800 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if paymentId is invalid", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/payments/invalidPaymentId`)
      .set("Cookie", managerCookies)
      .send({ amount: 800 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if body is empty", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/payments/${updateTargetId}`)
      .set("Cookie", managerCookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if amount is negative", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/payments/${updateTargetId}`)
      .set("Cookie", managerCookies)
      .send({ amount: -100 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if method is invalid", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/payments/${updateTargetId}`)
      .set("Cookie", managerCookies)
      .send({ method: "BITCOIN" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 if payment not found", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/payments/${fakeId}`)
      .set("Cookie", managerCookies)
      .send({ amount: 800 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should update payment successfully", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/payments/${updateTargetId}`)
      .set("Cookie", managerCookies)
      .send({ amount: 800, method: "BANK", note: "Updated note" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Payment updated successfully");

    const { payment } = res.body.data;
    expect(payment.id).toBe(updateTargetId);
    expect(payment.amount).toBe(800);
    expect(payment.method).toBe("BANK");
    expect(payment.note).toBe("Updated note");
  });

  it("should update only provided fields", async () => {
    const res = await request(app)
      .put(`/api/v1/mess/${messId}/payments/${updateTargetId}`)
      .set("Cookie", managerCookies)
      .send({ amount: 900 });

    expect(res.status).toBe(200);
    const { payment } = res.body.data;
    expect(payment.amount).toBe(900);
    expect(payment.method).toBe("BANK");
    expect(payment.note).toBe("Updated note");
  });
});

// DELETE /api/v1/mess/:messId/payments/:paymentId (deletePayment)

describe("DELETE /api/v1/mess/:messId/payments/:paymentId (deletePayment)", () => {
  let deleteTargetId;

  beforeAll(async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/payments`)
      .set("Cookie", managerCookies)
      .send({
        payerId: manager.id,
        amount: 150,
        date: new Date().toISOString(),
        method: "CASH",
        note: "Target for delete",
      });
    deleteTargetId = res.body.data.payment.id;
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app).delete(
      `/api/v1/mess/${messId}/payments/${deleteTargetId}`,
    );

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/payments/${deleteTargetId}`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is MEMBER (not MANAGER)", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/payments/${deleteTargetId}`)
      .set("Cookie", memberCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/invalidId/payments/${deleteTargetId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if paymentId is invalid", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/payments/invalidPaymentId`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 if payment not found", async () => {
    const fakeId = "000000000000000000000000";
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/payments/${fakeId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should delete payment successfully", async () => {
    const res = await request(app)
      .delete(`/api/v1/mess/${messId}/payments/${deleteTargetId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Payment deleted successfully");

    const verifyRes = await request(app)
      .get(`/api/v1/mess/${messId}/payments/${deleteTargetId}`)
      .set("Cookie", managerCookies);

    expect(verifyRes.status).toBe(404);
  });
});

// GET /api/v1/mess/:messId/settlements/my (getMySettlements)

describe("GET /api/v1/mess/:messId/settlements/my (getMySettlements)", () => {
  it("should return 401 without authentication", async () => {
    const res = await request(app).get(`/api/v1/mess/${messId}/settlements/my`);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .get("/api/v1/mess/invalidId/settlements/my")
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return user's settlements with bill info", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Your settlements fetched successfully");
    expect(res.body.data).toBeDefined();

    const { count, settlements } = res.body.data;
    expect(typeof count).toBe("number");
    expect(Array.isArray(settlements)).toBe(true);
    expect(settlements.length).toBeGreaterThan(0);

    const settlement = settlements.find((s) => s.userId === manager.id);
    expect(settlement).toBeDefined();
    expect(settlement.id).toBeDefined();
    expect(settlement.billId).toBe(billId);
    expect(settlement.userId).toBe(manager.id);
    expect(settlement.totalAmount).toBeDefined();
    expect(settlement.paidAmount).toBeDefined();
    expect(settlement.dueAmount).toBeDefined();
    expect(settlement.status).toBeDefined();
    expect(settlement.bill).toBeDefined();
    expect(settlement.bill.id).toBe(billId);
  });
});

// GET /api/v1/mess/:messId/settlements/bill/:billId (getSettlementsByBill)

describe("GET /api/v1/mess/:messId/settlements/bill/:billId (getSettlementsByBill)", () => {
  it("should return 401 without authentication", async () => {
    const res = await request(app).get(
      `/api/v1/mess/${messId}/settlements/bill/${billId}`,
    );

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/bill/${billId}`)
      .set("Cookie", outsiderCookies);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if messId is invalid", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/invalidId/settlements/bill/${billId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if billId is invalid", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/bill/invalidBillId`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 if bill not found", async () => {
    const fakeBillId = "000000000000000000000000";
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/bill/${fakeBillId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should return all settlements for bill with user info", async () => {
    const res = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/bill/${billId}`)
      .set("Cookie", managerCookies);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Settlements fetched successfully");
    expect(res.body.data).toBeDefined();

    const { count, settlements } = res.body.data;
    expect(typeof count).toBe("number");
    expect(Array.isArray(settlements)).toBe(true);
    expect(settlements.length).toBeGreaterThan(0);

    const settlement = settlements.find((s) => s.userId === manager.id);
    expect(settlement).toBeDefined();
    expect(settlement.billId).toBe(billId);
    expect(settlement.totalAmount).toBeDefined();
    expect(settlement.paidAmount).toBeDefined();
    expect(settlement.dueAmount).toBeDefined();
    expect(settlement.status).toBeDefined();
    expect(settlement.user).toBeDefined();
    expect(settlement.user.id).toBeDefined();
    expect(settlement.user.name).toBeDefined();
    expect(settlement.user.email).toBeDefined();
  });
});

// POST /api/v1/mess/:messId/settlements/:settlementId/pay (recordSettlementPayment)

describe("POST /api/v1/mess/:messId/settlements/:settlementId/pay (recordSettlementPayment)", () => {
  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .send({ amount: 100 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", outsiderCookies)
      .send({ amount: 100 });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if amount is missing", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", managerCookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if amount is <= 0", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", managerCookies)
      .send({ amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 404 if settlement not found", async () => {
    const fakeSettlementId = "000000000000000000000000";
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${fakeSettlementId}/pay`)
      .set("Cookie", managerCookies)
      .send({ amount: 100 });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("should record partial payment successfully", async () => {
    const getRes = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", managerCookies);

    const mySettlement = getRes.body.data.settlements.find(
      (s) => s.userId === manager.id,
    );
    const dueBefore = mySettlement.dueAmount;

    const payAmount = Math.floor(dueBefore / 2);
    if (payAmount <= 0) return;

    const res = await request(app)
      .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
      .set("Cookie", managerCookies)
      .send({ amount: payAmount });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Payment recorded successfully");

    const { settlement } = res.body.data;
    expect(settlement.id).toBe(managerSettlementId);
    expect(settlement.status).toBe("PARTIAL");
    expect(settlement.paidAmount).toBe(mySettlement.paidAmount + payAmount);
    expect(settlement.dueAmount).toBe(dueBefore - payAmount);
  });

  it("should record full payment and set status to PAID", async () => {
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
    expect(res.body.success).toBe(true);

    const { settlement } = res.body.data;
    expect(settlement.id).toBe(managerSettlementId);
    expect(settlement.status).toBe("PAID");
    expect(settlement.dueAmount).toBe(0);
    expect(settlement.paidAmount).toBe(settlement.totalAmount);
  });

  it("should return 400 if amount exceeds remaining due", async () => {
    const getRes = await request(app)
      .get(`/api/v1/mess/${messId}/settlements/my`)
      .set("Cookie", managerCookies);

    const mySettlement = getRes.body.data.settlements.find(
      (s) => s.userId === manager.id,
    );

    if (mySettlement.status === "PAID") {
      const res = await request(app)
        .post(`/api/v1/mess/${messId}/settlements/${managerSettlementId}/pay`)
        .set("Cookie", managerCookies)
        .send({ amount: 100 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    }
  });
});

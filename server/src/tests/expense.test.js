import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";

let managerUser;
let managerCookies;
let messId;
let memberId;
let memberUser;
let memberCookies;

const managerData = {
  name: "Manager User",
  email: `manager${Date.now()}@example.com`,
  password: "password123",
};

const memberData = {
  name: "Member User",
  email: `member${Date.now()}@example.com`,
  password: "password123",
};

const validExpense = {
  title: "Groceries",
  description: "Weekly grocery shopping",
  amount: 1500.5,
  category: "FOOD",
  date: new Date().toISOString(),
};

beforeAll(async () => {
  await prisma.$connect();

  // Register manager
  const managerRes = await request(app)
    .post("/api/v1/auth/register")
    .send(managerData);
  managerUser = managerRes.body.data.user;
  managerCookies = managerRes.headers["set-cookie"];

  // Register member
  const memberRes = await request(app)
    .post("/api/v1/auth/register")
    .send(memberData);
  memberUser = memberRes.body.data.user;
  memberCookies = memberRes.headers["set-cookie"];

  // Create mess (creator becomes MANAGER)
  const messRes = await request(app)
    .post("/api/v1/mess")
    .set("Cookie", managerCookies)
    .send({ name: "Test Mess", description: "Test" });
  messId = messRes.body.data.mess.id;

  // Add member to mess
  const inviteRes = await request(app)
    .post(`/api/v1/invitations/mess/${messId}`)
    .set("Cookie", managerCookies)
    .send({ email: memberData.email });
  const invitationId = inviteRes.body.data.invitation.id;

  const acceptRes = await request(app)
    .post(`/api/v1/invitations/${invitationId}/accept`)
    .set("Cookie", memberCookies);
  memberId = memberUser.id;
});

afterAll(async () => {
  await prisma.expense.deleteMany({ where: { messId } });
  await prisma.invitation.deleteMany({ where: { messId } });
  await prisma.messMember.deleteMany({ where: { messId } });
  await prisma.mess.deleteMany({ where: { id: messId } });
  await prisma.refreshToken.deleteMany({
    where: { user: { email: { in: [managerData.email, memberData.email] } } },
  });
  await prisma.user.deleteMany({
    where: { email: { in: [managerData.email, memberData.email] } },
  });
  await prisma.$disconnect();
});

describe("POST /api/v1/mess/:messId/expenses", () => {
  it("should add an expense successfully (manager)", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send(validExpense);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Expense added successfully");
    expect(res.body.data.expense).toMatchObject({
      messId,
      recordedBy: managerUser.id,
      title: validExpense.title,
      description: validExpense.description,
      amount: validExpense.amount,
      category: validExpense.category,
    });
    expect(res.body.data.expense).toHaveProperty("id");
    expect(res.body.data.expense).toHaveProperty("date");
    expect(res.body.data.expense).toHaveProperty("createdAt");
    expect(res.body.data.expense).toHaveProperty("updatedAt");
  });

  it("should add expense without description", async () => {
    const { description, ...expenseWithoutDesc } = validExpense;
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send(expenseWithoutDesc);

    expect(res.status).toBe(201);
    expect(res.body.data.expense.description).toBeNull();
  });

  it("should trim title whitespace", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send({ ...validExpense, title: "  Rent Payment  " });

    expect(res.status).toBe(201);
    expect(res.body.data.expense.title).toBe("Rent Payment");
  });

  it("should return 403 if user is a MEMBER (not MANAGER)", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", memberCookies)
      .send(validExpense);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/manager/i);
  });

  it("should return 401 without authentication", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .send(validExpense);

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should return 403 if user is not a member of the mess", async () => {
    // Register a third user who is NOT in the mess
    const outsiderData = {
      name: "Outsider",
      email: `outsider${Date.now()}@example.com`,
      password: "password123",
    };
    const outsiderRes = await request(app)
      .post("/api/v1/auth/register")
      .send(outsiderData);
    const outsiderCookies = outsiderRes.headers["set-cookie"];

    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", outsiderCookies)
      .send(validExpense);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);

    // cleanup
    await prisma.refreshToken.deleteMany({
      where: { user: { email: outsiderData.email } },
    });
    await prisma.user.deleteMany({ where: { email: outsiderData.email } });
  });

  it("should return 400 if title is missing", async () => {
    const { title, ...expenseWithoutTitle } = validExpense;
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send(expenseWithoutTitle);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if title is empty string", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send({ ...validExpense, title: "" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if amount is missing", async () => {
    const { amount, ...expenseWithoutAmount } = validExpense;
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send(expenseWithoutAmount);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if amount is zero", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send({ ...validExpense, amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if amount is negative", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send({ ...validExpense, amount: -100 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if amount is not a number", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send({ ...validExpense, amount: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if category is missing", async () => {
    const { category, ...expenseWithoutCategory } = validExpense;
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send(expenseWithoutCategory);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if category is invalid", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send({ ...validExpense, category: "INVALID" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if date is missing", async () => {
    const { date, ...expenseWithoutDate } = validExpense;
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send(expenseWithoutDate);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 if date is invalid", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send({ ...validExpense, date: "not-a-date" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 with empty body", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should return 400 for each valid category enum value (invalid one)", async () => {
    const res = await request(app)
      .post(`/api/v1/mess/${messId}/expenses`)
      .set("Cookie", managerCookies)
      .send({ ...validExpense, category: "TAXES" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("should accept all valid categories", async () => {
    const categories = [
      "FOOD",
      "RENT",
      "ELECTRICITY",
      "GAS",
      "WATER",
      "INTERNET",
      "MAINTENANCE",
      "MAID_COST",
      "OTHER",
    ];

    for (const category of categories) {
      const res = await request(app)
        .post(`/api/v1/mess/${messId}/expenses`)
        .set("Cookie", managerCookies)
        .send({ ...validExpense, title: `Expense ${category}`, category });

      expect(res.status).toBe(201);
      expect(res.body.data.expense.category).toBe(category);
    }
  });
});

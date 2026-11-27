import request from "supertest";
import app from "../app.js";
import prisma from "../config/database.js";

let seq = 0;

export const registerUser = async (label) => {
  const data = {
    name: label,
    email: `${label.toLowerCase().replace(/\W/g, "")}${Date.now()}${seq++}@example.com`,
    password: "password123",
  };
  const res = await request(app).post("/api/v1/auth/register").send(data);
  return { user: res.body.data.user, cookies: res.headers["set-cookie"], email: data.email };
};

// Creates a mess owned by `manager` and adds each of `members` through an invitation
export const createMessWith = async (manager, members = [], name = "Test Mess") => {
  const messRes = await request(app).post("/api/v1/mess").set("Cookie", manager.cookies).send({ name });
  const messId = messRes.body.data.mess.id;

  for (const m of members) {
    const inv = await request(app)
      .post(`/api/v1/invitations/mess/${messId}`)
      .set("Cookie", manager.cookies)
      .send({ email: m.email });
    await request(app)
      .post(`/api/v1/invitations/${inv.body.data.invitation.id}/accept`)
      .set("Cookie", m.cookies);
  }

  return messId;
};

export const cleanupMess = async (messId) => {
  if (!messId) return;
  await prisma.settlement.deleteMany({ where: { bill: { messId } } });
  await prisma.monthlyBill.deleteMany({ where: { messId } });
  await prisma.deposit.deleteMany({ where: { messId } });
  await prisma.expense.deleteMany({ where: { messId } });
  await prisma.meal.deleteMany({ where: { messId } });
  await prisma.invitation.deleteMany({ where: { messId } });
  await prisma.messMember.deleteMany({ where: { messId } });
  await prisma.mess.deleteMany({ where: { id: messId } });
};

export const cleanupUsers = async (users) => {
  const emails = users.map((u) => u.email);
  await prisma.refreshToken.deleteMany({ where: { user: { email: { in: emails } } } });
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
};

// A fixed, already-started month so tests never depend on today's date
export const YEAR = 2026;
export const MONTH = 1;
export const d = (dayOfMonth) => `${YEAR}-${String(MONTH).padStart(2, "0")}-${String(dayOfMonth).padStart(2, "0")}`;

# Shared Housing Expense Management System

> Product Requirements Document (PRD)

| Document             | Product Requirements Document                     |
| -------------------- | ------------------------------------------------- |
| Product name         | SplitEase                                         |
| Version              | 2.0                                               |
| Status               | Implemented (MVP)                                 |
| Last updated         | 27 November 2026                                  |
| Product Type         | Full-Stack Web Application                        |
| Architecture         | React + TypeScript client, Express (Node.js) API  |
| Database             | MongoDB                                           |
| ORM / Data Access    | Prisma                                            |
| Target Users         | Students and shared-housing ("mess") residents    |

### Change log

| Version | Date        | Changes |
| ------- | ----------- | ------- |
| 1.0     | —           | First draft: overview, problem, goals, roles, user stories, early feature list. |
| 2.0     | 27 Nov 2026 | Rewritten to match the built system: separate meal rate and house bills, per-member room rent, deposits instead of online payments, live monthly account with close/reopen, invite links. All sections completed. |

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision](#3-product-vision)
4. [Goals and Objectives](#4-goals-and-objectives)
5. [Target Users](#5-target-users)
6. [User Roles](#6-user-roles)
7. [User Stories](#7-user-stories)
8. [Core Features](#8-core-features)
9. [Functional Requirements](#9-functional-requirements)
10. [Business Rules](#10-business-rules)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Technology Stack](#12-technology-stack)
13. [High-Level Product Architecture](#13-high-level-product-architecture)
14. [MVP Scope](#14-mvp-scope)
15. [Out of Scope](#15-out-of-scope)
16. [Future Enhancements](#16-future-enhancements)
17. [Risks and Constraints](#17-risks-and-constraints)
18. [Success Criteria](#18-success-criteria)
19. [Project Constraints](#19-project-constraints)
20. [Open Questions](#20-open-questions)
21. [PRD Completion Criteria](#21-prd-completion-criteria)

---

# 1. Product Overview

**SplitEase** is a web application for people who share a house or flat — a "mess" — and split its costs. Typically 4–6 people live together, cook together, and share rent and bills.

The system keeps every shared cost in one place and works out, for every member, every month:

- what they ate and what that cost,
- their own room rent,
- their share of the house bills,
- what they already paid,
- and whether they still owe money or should get money back.

It replaces notebooks, spreadsheets and end-of-month arguments with one transparent account that every member can see.

---

# 2. Problem Statement

In shared student housing (especially in Bangladesh and South Asia), residents usually run the house as a "mess":

- One person (the manager) keeps the account.
- Members buy groceries ("bazar") in turns and pay from their own pocket.
- Everyone eats a different number of meals.
- Rooms have different sizes, so rent is not equal.
- Wifi, electricity, gas, water and the maid are shared.
- Money is handed to the manager in cash or by bKash / Nagad.

Doing this by hand causes real problems:

- Meal counts are written on paper and get lost or disputed.
- The meal rate (bazar ÷ meals) has to be recalculated every time something changes.
- Rent and house bills get mixed into the meal rate, so heavy eaters pay for other people's rent.
- Nobody remembers who already bought bazar or deposited money.
- Members who ate little or nothing in a month are accidentally skipped.
- Past months are hard to review when someone questions a number.

There is no single source of truth, and small arithmetic mistakes become personal disputes.

---

# 3. Product Vision

Make the household account **simple, transparent, accurate and auditable**.

At any moment, any member should be able to open the app and see:

- how much the house spent on bazar and on bills,
- how many meals were eaten and the current meal rate,
- their own bill, broken down line by line,
- how much they have paid,
- who still owes money and who should get money back,
- how a closed month was calculated.

---

# 4. Goals and Objectives

## 4.1 Primary Goals

1. Keep all shared costs of a mess in one place.
2. Calculate the meal rate and every member's bill automatically.
3. Keep meal costs separate from rent and house bills, so each is charged fairly.
4. Support different room rents for different members.
5. Credit members for bazar or bills they paid out of their own pocket.
6. Show a live account during the month and a frozen account after it closes.
7. Protect each mess's data with authentication and role-based access.
8. Work well on a phone, where most members will use it.

## 4.2 Engineering Goals

The project also demonstrates:

- requirement analysis and system design,
- database design for a document database,
- REST API design with request validation,
- cookie-based JWT authentication with refresh tokens,
- role-based authorization,
- a pure, unit-tested calculation engine,
- integration testing against a real database,
- data migration between schema versions,
- clear error handling and documentation.

---

# 5. Target Users

## 5.1 Mess Manager

The person who runs the house account. Often a rotating role (one member each month or term).

Responsibilities:

- create the mess and invite members,
- set each member's room rent,
- enter daily meals,
- record bazar and house bills, and who paid them,
- record money members hand over (deposits),
- close the month when it is final.

## 5.2 Member / Resident

A person living in the mess.

Members want to:

- see their own meals and bill,
- check the meal rate and the house's spending,
- know exactly how much they owe or will get back,
- look at previous months.

---

# 6. User Roles

Roles are **per mess**. One user can manage one mess and be a plain member of another.

## 6.1 Manager

- Create, edit and delete the mess.
- Invite members (email + shareable link), cancel invitations.
- Set each member's monthly room rent.
- Promote another member to manager, or step down (at least one manager must remain).
- Remove members (they are deactivated, not deleted, so history stays correct).
- Enter and edit meals.
- Add, edit and delete bazar and house bills.
- Record, edit and delete deposits.
- Close and reopen a month.

## 6.2 Member

- View the mess, all members and their rents.
- View all meals, bazar, bills and deposits of any month.
- View the full monthly account of everyone, including their own breakdown.
- View closed months (history).
- Manage their own profile.

A user who is not an active member of a mess cannot read or change anything in it.

---

# 7. User Stories

## Authentication

- **US-01** As a user, I want to create an account so that I can join or create a mess.
- **US-02** As a user, I want to log in securely so that only I can see my data.
- **US-03** As a user, I want to log out so that my session ends.
- **US-04** As a user, I want to reset a forgotten password by email.

## Mess and members

- **US-05** As a manager, I want to create a mess for my flat.
- **US-06** As a manager, I want to invite flatmates by email and also share an invite link on WhatsApp.
- **US-07** As an invited person, I want to open the link, sign up with my email and join in a few taps.
- **US-08** As a manager, I want to set a different room rent for each member.
- **US-09** As a manager, I want to remove someone who moved out without breaking past months.
- **US-10** As a manager, I want to hand the manager role to someone else.

## Meals

- **US-11** As a manager, I want to enter today's meals for everyone quickly on my phone.
- **US-12** As a manager, I want a month sheet (members × days) to fix any day.
- **US-13** As a member, I want to see everyone's meals so the counts are transparent.

## Bazar and bills

- **US-14** As a manager, I want to record a bazar and who paid for it, so that person is credited.
- **US-15** As a manager, I want to record house bills (wifi, electricity, gas, water, maid…) separately from bazar.
- **US-16** As a manager, I want to split a bill unequally when it applies to only some members.

## Deposits and account

- **US-17** As a manager, I want to record cash / bKash / Nagad money a member gives me.
- **US-18** As a manager, I want to see who still owes money this month.
- **US-19** As a member, I want to see the meal rate and my bill broken down into meals, rent and bills.
- **US-20** As a member, I want to know if I owe money or will get some back.
- **US-21** As a manager, I want to close a month so nobody changes it later, and reopen it if we find a mistake.
- **US-22** As a member, I want to look at previous months.

---

# 8. Core Features

## 8.1 Authentication

- Register, log in, log out.
- Access token (15 minutes) and refresh token (7 days) in `httpOnly` cookies, refreshed automatically.
- Forgot / reset password by email (1-hour single-use link).
- Passwords hashed with bcrypt; never stored in plain text.

## 8.2 Mess Management

- A mess has a name, optional description and address.
- The creator becomes its manager and sets their own room rent while creating it.
- A user's "My messes" list shows every active mess with the member count.
- Only a manager can edit or delete a mess. Deleting removes all of its data.

## 8.3 Member Management and Invitations

- The manager invites by email. The invitation:
  - is emailed with a link (if email delivery is configured),
  - can be copied as a link and shared anywhere,
  - expires after **7 days**.
- The invite link opens a public page showing the mess and inviter. The person can sign up (email pre-filled), log in, join or decline.
- Logged-in users also see pending invitations on their dashboard.
- Expired invitations are marked as expired automatically and do not block a new invitation.
- A former member who is invited again is reactivated with their history intact.
- Each member has a **monthly room rent**, set by the manager.
- Members can be promoted to manager or removed (deactivated).

## 8.4 Daily Meal Tracking

- One record per member per day holding the **number of meals** eaten that day.
- Half meals are allowed (e.g. 1.5), up to 50 per day (guests included).
- Two ways to enter meals:
  - **Daily entry** — pick a day, use +/− per member, or set everyone to 0/1/2/3 at once.
  - **Month sheet** — a members × days grid with row and column totals; changes are saved in one batch.
- Setting a day to 0 removes the entry.

## 8.5 Bazar and House Bills

Every expense has a type:

| Type | Examples | How it is charged |
| ---- | -------- | ----------------- |
| **Bazar** (meal cost) | groceries, fish, rice, vegetables | Added up and divided by total meals → **meal rate** |
| **House bill** | wifi, electricity, gas, water, maid, service charge, other | Split equally among members, or by a custom split |

Each expense also records **who paid**:

- a member (paid from their own pocket → credited to them), or
- the **mess fund** (paid by the manager from deposits).

Rent is **not** entered as an expense; it comes from each member's room rent.

## 8.6 Deposits

- Money a member gives to the manager.
- Amount, date, method (Cash, bKash, Nagad, Rocket, Bank, Other) and an optional note (e.g. transaction ID).
- Counted against a specific month, so a member can pay off a closed month later.
- The deposits page lists who still owes money, with a one-tap "Record" that pre-fills the amount.

## 8.7 Monthly Account

For the selected month the system shows:

- Totals: meal rate, total meals, bazar, house bills, total rent.
- For the manager: deposits collected, money spent from the fund and cash in hand.
- **Your account**: what you owe (meals × rate, rent, bill share) and what you paid (bazar/bills paid + deposits), with the final balance.
- **Everyone's account**: the same breakdown for every member.
- Warnings, e.g. bazar recorded but no meals entered.

## 8.8 Closing and History

- The manager can **close** a month. Its charges are frozen, and meals and expenses dated in it are locked.
- Deposits can still be recorded for a closed month, so dues can be settled after closing.
- A closed month can be **reopened** if a mistake is found.
- The **History** page lists closed months with the meal rate, the mess total, and the viewer's own bill and balance.

## 8.9 Dashboard

- Pending invitations with Join / Decline.
- One card per mess showing this month's balance, bill, amount paid and meal rate.

---

# 9. Functional Requirements

## 9.1 Authentication

| ID | Requirement |
| -- | ----------- |
| FR-AUTH-01 | The system shall register a user with name, unique email (stored lowercase) and password. |
| FR-AUTH-02 | The system shall authenticate with email and password and set access and refresh cookies. |
| FR-AUTH-03 | The client shall refresh an expired access token automatically and retry the request once. |
| FR-AUTH-04 | Logout shall revoke the refresh token and clear the cookies. |
| FR-AUTH-05 | Password reset shall use a hashed, single-use token that expires after one hour. |

## 9.2 Mess and Members

| ID | Requirement |
| -- | ----------- |
| FR-MESS-01 | Creating a mess shall make the creator its manager with the given room rent. |
| FR-MESS-02 | Only a manager shall update or delete a mess. |
| FR-MESS-03 | A manager shall be able to set any member's rent (≥ 0) and role. |
| FR-MESS-04 | The system shall refuse to demote the last remaining manager. |
| FR-MESS-05 | Removing a member shall deactivate them and record the date they left; it shall not delete their data. |
| FR-MESS-06 | Inactive members shall lose all access to the mess. |

## 9.3 Invitations

| ID | Requirement |
| -- | ----------- |
| FR-INV-01 | A manager shall invite by email; an active member cannot be invited again. |
| FR-INV-02 | Only one pending, unexpired invitation may exist per email per mess. |
| FR-INV-03 | Invitations shall expire after 7 days; expired ones shall be marked EXPIRED automatically. |
| FR-INV-04 | The system shall email an invite link when email delivery is configured, and still create the invitation if sending fails. |
| FR-INV-05 | The manager shall be able to copy each pending invitation's link. |
| FR-INV-06 | The invite link shall show a public preview (mess, inviter, invited email, status) without login. |
| FR-INV-07 | Only a logged-in user whose email matches the invitation shall accept or decline it. |
| FR-INV-08 | Accepting shall create the membership (or reactivate a former one) with rent 0. |

## 9.4 Meals

| ID | Requirement |
| -- | ----------- |
| FR-MEAL-01 | The system shall store at most one meal record per member per day per mess. |
| FR-MEAL-02 | A manager shall set counts for many member-days in one request; count 0 removes the record. |
| FR-MEAL-03 | Counts shall be whole or half numbers from 0 to 50. |
| FR-MEAL-04 | Every member shall be able to read all meals of a month. |
| FR-MEAL-05 | Meals dated in a closed month shall not be changed. |

## 9.5 Expenses

| ID | Requirement |
| -- | ----------- |
| FR-EXP-01 | An expense shall have type (Bazar or House), category, title, amount > 0, date and payer (member or mess fund). |
| FR-EXP-02 | Bazar expenses shall use the Bazar category only; house bills shall use a house category. |
| FR-EXP-03 | A house bill may have custom shares; shares shall be ≥ 0, unique per member, belong to members of the mess and add up to the amount. |
| FR-EXP-04 | The payer must be an active member, or empty for the mess fund. |
| FR-EXP-05 | Only a manager shall create, update or delete expenses; all members can read them. |
| FR-EXP-06 | Expenses dated in a closed month shall not be created, changed or deleted. |

## 9.6 Deposits

| ID | Requirement |
| -- | ----------- |
| FR-DEP-01 | A deposit shall have member, amount > 0, date, method, optional note and target month. |
| FR-DEP-02 | The target month defaults to the month of the deposit date. |
| FR-DEP-03 | Deposits may be recorded for closed months. |
| FR-DEP-04 | Former members may still have deposits recorded so they can settle dues. |

## 9.7 Monthly Account

| ID | Requirement |
| -- | ----------- |
| FR-MON-01 | The system shall calculate an open month live from its meals, expenses, rents and deposits. |
| FR-MON-02 | Closing shall store each member's frozen charges and expense credits; only a manager can close or reopen. |
| FR-MON-03 | A month that has not started cannot be closed; a month cannot be closed twice. |
| FR-MON-04 | For a closed month, paid amounts shall combine the frozen expense credits with the current deposits. |
| FR-MON-05 | Reopening shall delete the frozen account and return to live calculation. |
| FR-MON-06 | The system shall list closed months with the viewer's own charge and balance. |

---

# 10. Business Rules

## 10.1 The monthly formula

For every member of the month:

```text
meal rate     = total bazar ÷ total meals of the mess
meal cost     = member's meals × meal rate
rent          = member's own room rent
house share   = equal share of each house bill (or their custom share)
total charge  = meal cost + rent + house share

paid          = bazar/bills the member paid from their own pocket
              + deposits the member gave for this month

balance       = paid − total charge
                negative → the member owes this much
                positive → the mess owes the member this much
```

### Worked example

Five members. Bazar ৳4,000, total meals 100, house bills ৳6,000 (wifi 1,000 + electricity 1,500 + gas 1,000 + water 500 + maid 2,000).

| | Rahim |
| --- | --- |
| Meal rate | 4,000 ÷ 100 = **৳40** |
| Meal cost | 20 meals × 40 = ৳800 |
| Room rent | ৳4,000 |
| House share | 6,000 ÷ 5 = ৳1,200 |
| **Total charge** | **৳6,000** |
| Paid | bazar ৳1,500 + deposit ৳3,000 = ৳4,500 |
| **Balance** | **−৳1,500 (owes)** |

## 10.2 Rules

1. **Bazar and house bills are never mixed.** Only bazar goes into the meal rate.
2. **Every taka is charged exactly once.** The sum of all members' charges equals bazar + house bills + total rent.
3. **Rent is per member**, taken from the member's room rent, not from expenses.
4. **House bills are split equally among the members of the month**, unless the bill has a custom split.
5. **Members of a month** are those who had joined before it ended and had not left before it started, plus anyone who has meals, payments or shares recorded in it.
6. **A member with zero meals still pays rent and their house-bill share.**
7. **A former member with data in the month** still appears in that month's account.
8. **Out-of-pocket payments are credits**: whoever paid for bazar or a bill is credited that amount.
9. **Mess-fund payments** are not credited to anyone; they reduce the manager's cash in hand.
10. **If bazar exists but no meals were entered**, the meal rate is 0 and a warning is shown.
11. **Closing freezes charges**, not payments. Deposits keep counting towards the closed month.
12. **Calendar dates** are stored as dates (UTC midnight), so a record never moves to another day or month because of time zones.
13. **Money is shown rounded** to whole units, and the meal rate to two decimals. Calculations keep full precision and round to 2 decimals at the end.

---

# 11. Non-Functional Requirements

| Area | Requirement |
| ---- | ----------- |
| Security | Passwords hashed with bcrypt (cost 12). Tokens in `httpOnly`, `SameSite=Lax` cookies. Helmet security headers. CORS limited to the client URL. |
| Authorization | Every mess endpoint checks active membership; write endpoints check the manager role on the server. |
| Validation | Every request body, query and route parameter is validated with Zod; errors return clear 400 messages. |
| Data integrity | Batch meal saves, month close/reopen and member reactivation run in database transactions. Unique indexes prevent duplicate meals, memberships and closed months. |
| Correctness | The calculation is a pure function with unit tests, including the worked example. |
| Usability | Mobile-first layout with a bottom tab bar on phones; plain-language balances ("Owes ৳1,500" / "Gets back ৳200"). |
| Performance | A month summary is computed with a fixed number of queries regardless of the number of members. |
| Maintainability | Layered server (routes → validation → controllers → services); typed client with feature hooks and a shared query-key scheme. |
| Testability | Integration tests run against a separate test database; the calculation tests need no database. |
| Configurability | Currency code, symbol and locale are set by environment variables. |

---

# 12. Technology Stack

| Layer | Technology |
| ----- | ---------- |
| Client | React 19, TypeScript, Vite 8, React Router 7 |
| Client data | TanStack Query 5 (server state), Zustand 5 (auth and selected month) |
| Client UI | Tailwind CSS 4, shadcn/ui components on Base UI, lucide-react icons |
| Forms | React Hook Form + Zod (auth), controlled forms elsewhere |
| Server | Node.js, Express 5 (JavaScript, ES modules) |
| Validation | Zod 4 |
| Database | MongoDB (Atlas) |
| ORM | Prisma 5 |
| Auth | JSON Web Tokens, bcryptjs, cookie-parser |
| Email | Nodemailer (SMTP) |
| Testing | Vitest, Supertest |

---

# 13. High-Level Product Architecture

```text
Browser (React SPA)
  │  pages → feature hooks (TanStack Query) → services (axios, cookies)
  ▼
Express API  /api/v1
  │  helmet · cors · cookie-parser
  │  routes → auth middleware → Zod validation → manager check
  │        → controllers → services
  │                         └─ utils/billing.js  (pure monthly calculation)
  ▼
Prisma Client
  ▼
MongoDB
```

## 13.1 Data model

| Model | Purpose |
| ----- | ------- |
| `User` | Account: name, email, password hash. |
| `Mess` | A shared house. |
| `MessMember` | User ↔ mess link: role, room rent, active flag, joined / left dates. |
| `Invitation` | Email invite with token, status and expiry. |
| `Meal` | Meals per member per day (unique per mess + member + date). |
| `Expense` | Bazar or house bill, category, amount, date, payer, optional custom shares. |
| `Deposit` | Money given to the manager, with method and target month. |
| `MonthlyBill` | A closed month with its frozen totals. |
| `Settlement` | One member's frozen charges in a closed month. |
| `RefreshToken`, `PasswordReset` | Hashed auth tokens. |

## 13.2 Main API groups

| Group | Endpoints |
| ----- | --------- |
| Auth | `/auth/register`, `/login`, `/me`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password` |
| Mess | `/mess`, `/mess/my`, `/mess/:messId`, `/mess/:messId/members`, `/mess/:messId/members/:userId` |
| Invitations | `/invitations/mess/:messId`, `/invitations/pending`, `/invitations/token/:token`, `/invitations/:id/accept · reject · cancel` |
| Meals | `GET/PUT /mess/:messId/meals` |
| Expenses | `/mess/:messId/expenses` (CRUD) |
| Deposits | `/mess/:messId/deposits` (CRUD) |
| Months | `/mess/:messId/months`, `/mess/:messId/months/:year/:month`, `…/close`, `…/reopen` |

---

# 14. MVP Scope

Included and implemented:

- Authentication with refresh tokens and password reset.
- Mess creation, editing and deletion.
- Invitations by email and by link, with 7-day expiry.
- Per-member room rent and manager role management.
- Daily meal entry and month sheet with half meals.
- Bazar and house bills with payer and custom splits.
- Deposits with payment methods.
- Live monthly account, close / reopen, history.
- Per-mess dashboard balances.
- Responsive UI for phone and desktop.
- Unit tests for the calculation and integration tests for the API.
- Migration script from the version 1 data model.

---

# 15. Out of Scope

Not part of this release:

- Online payments (card / Stripe / mobile-wallet APIs). Payments are recorded by hand.
- Members entering their own meals (only the manager enters meals).
- Separate breakfast / lunch / dinner tracking (one daily count is used instead).
- Carrying a balance forward into the next month automatically.
- Tracking payment of rent to the landlord as a separate cash-out.
- Bengali user interface (the UI is in English).
- Native mobile apps, push notifications, offline mode.
- Multi-currency within a mess.

---

# 16. Future Enhancements

- Let members request meal on/off for the next day, approved by the manager.
- Carry last month's balance forward automatically.
- Export a month to PDF or Excel to share in a group chat.
- Activity log: who changed which meal, expense or deposit, and when.
- Reminders to members who still owe money.
- Charts of bazar and meal-rate trends across months.
- Bengali language option.
- Installable PWA with offline meal entry.
- Rent paid to the landlord as a fund outflow, for a complete cash book.

---

# 17. Risks and Constraints

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| Manager enters wrong meals or amounts | Wrong bills | Everything is visible to all members; month stays editable until closed; reopen is possible. |
| Email delivery fails or lands in spam | Invitee never hears about it | Invitation still created; manager can copy and share the link. |
| Members join or leave mid-month | Unfair rent or bill share | Membership dates decide who is in a month; custom splits for exceptions. |
| Old data from version 1 | Wrong totals | One-time migration script; old monthly bills removed and recalculated. |
| Floating-point rounding | Off-by-a-paisa totals | Calculate in full precision, round to 2 decimals at the end, display whole units. |
| Cloud database paused or unreachable | App unavailable | Health endpoint; clear connection errors; database URL configurable. |

---

# 18. Success Criteria

- The worked example in §10.1 produces exactly the documented numbers (covered by unit tests).
- The sum of all members' charges always equals bazar + house bills + total rent.
- A manager can enter a full day's meals for the mess in under a minute on a phone.
- Every member can see their balance and its breakdown without asking the manager.
- A new member can go from invite link to joined mess without help.
- All server tests and the client type check, lint and production build pass.

---

# 19. Project Constraints

- Built and maintained by a single developer as a portfolio-quality project.
- Free-tier hosting and MongoDB Atlas; the cluster may be paused when idle.
- MongoDB requires a replica set for transactions (Atlas provides this).
- The server is plain JavaScript; the client is TypeScript.
- English UI; currency defaults to BDT (৳) and is configurable.

---

# 20. Open Questions

1. Should unpaid balances roll into the next month automatically, or stay attached to their month (current behaviour)?
2. Should members be able to enter or request their own meals?
3. Should rent paid to the landlord be recorded as a fund outflow?
4. Should a member's rent change take effect only from a chosen month (rent history) instead of applying to every open month?
5. Should a closed month need a second manager's confirmation to reopen?

---

# 21. PRD Completion Criteria

This PRD is complete when:

- [x] Every section in the table of contents is written.
- [x] Roles and permissions match the server's checks.
- [x] The calculation rules match `server/src/utils/billing.js` and its tests.
- [x] Functional requirements cover every API group.
- [x] MVP scope, out-of-scope items and future work are listed.
- [ ] Open questions in §20 are answered and moved into the rules or the roadmap.

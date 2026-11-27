# Server

Express + Prisma (MongoDB) API for a shared mess / house.

## How a month is calculated

For every member of the month:

| Part | Rule |
|---|---|
| Meal cost | `meals eaten × meal rate`, where `meal rate = total bazar ÷ total meals` |
| Room rent | the member's own rent (set per member, rooms can differ) |
| House bills | wifi, electricity, gas, water, maid… split equally, or by a custom split on the bill |
| Paid | bazar/bills the member paid out of pocket + deposits given to the manager |
| Balance | `paid − (meal cost + rent + house bills)` — negative means they still owe |

Example: 5 members, bazar ৳4,000, 100 meals → rate ৳40. Rahim ate 20 meals (৳800),
pays ৳4,000 rent and ৳1,200 of ৳6,000 house bills → owes ৳6,000. He bought ৳1,500 of
bazar and deposited ৳3,000 → still owes ৳1,500.

The calculation lives in [`src/utils/billing.js`](src/utils/billing.js) and is unit tested
in [`src/tests/billing.test.js`](src/tests/billing.test.js).

Months are calculated live. When the manager closes a month its charges are frozen and
meals/expenses dated in it are locked; deposits can still be added to settle dues. A
closed month can be reopened.

## Setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, JWT secrets, SMTP
npm run push           # create collections and indexes
npm run dev
```

### Upgrading an existing database

The data model changed (daily meal counts, bazar vs house bills, deposits, per-member rent).
Run the one-time migration **before** pushing the schema:

```bash
npm run migrate:v2
npm run push
```

Old monthly bills are removed because they used the wrong formula; close those months
again from the app.

## Tests

```bash
npm test                                 # needs DATABASE_URL (integration tests write test data)
npx vitest run src/tests/billing.test.js # calculation only, no database
```

## API (all under `/api/v1`, cookie auth)

| Method | Path | Who |
|---|---|---|
| `GET` | `/mess/:messId/months/:year/:month` | members — full account of a month |
| `POST` | `/mess/:messId/months/:year/:month/close` · `/reopen` | manager |
| `GET` | `/mess/:messId/months` | members — closed months |
| `GET` / `PUT` | `/mess/:messId/meals?month=&year=` · body `{ entries: [{ userId, date, count }] }` | members / manager |
| `GET` `POST` `PUT` `DELETE` | `/mess/:messId/expenses` | members read, manager writes |
| `GET` `POST` `PUT` `DELETE` | `/mess/:messId/deposits` | members read, manager writes |
| `PATCH` | `/mess/:messId/members/:userId` · body `{ rentAmount?, role? }` | manager |

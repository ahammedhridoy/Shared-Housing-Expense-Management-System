# Shared Housing Expense Management System

> Product Requirements Document (PRD)

| Document             | Product Requirements Document         |
| -------------------- | ------------------------------------- |
| Version              | 1.0                                   |
| Status               | Draft                                 |
| Product Type         | Full-Stack Web Application            |
| Primary Architecture | MERN + TypeScript                     |
| Database             | MongoDB                               |
| ORM / Data Access    | Prisma                                |
| Target Users         | Students and Shared-Housing Residents |

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

The **Shared Housing Expense Management System** is a web application designed to help students and people living in shared housing manage common household expenses in a transparent, structured, and reliable way.

The system will centralize:

- Daily meal tracking
- Shared market expenses
- Rent
- Utility bills
- Other household expenses
- Member contributions
- Individual liabilities
- Monthly settlements

The application will automatically calculate the financial responsibility of each member based on their meal consumption, shared expenses, payments, and applicable costs.

The primary purpose is to replace manual calculations, spreadsheets, notebooks, and informal communication with a centralized and reliable financial management system.

---

# 2. Problem Statement

Shared student housing often requires multiple residents to contribute to common expenses.

In many South Asian shared-housing environments, meal costs and household expenses are managed manually. This creates several problems:

- Meal records can be inaccurate.
- Market expenses can be difficult to track.
- Monthly meal rates require repeated calculations.
- Rent and utility costs must be distributed fairly.
- Members may have different payment histories.
- Manual calculations can lead to financial disputes.
- Historical records are difficult to review.
- There is no single source of truth for household finances.

The system aims to solve these problems by providing a centralized platform for recording, calculating, reviewing, and settling shared household expenses.

---

# 3. Product Vision

The vision is to build a reliable shared-housing financial management platform that makes household expense tracking:

**Simple, Transparent, Accurate, and Auditable.**

The system should allow users to understand exactly:

- How much the household spent.
- How many meals were consumed.
- What the current meal rate is.
- How much each member owes.
- How much each member has already paid.
- Who owes money.
- Who has an outstanding balance.
- How the final monthly settlement was calculated.

---

# 4. Goals and Objectives

## 4.1 Primary Goals

The system should:

1. Centralize shared household financial records.
2. Automate meal cost calculations.
3. Reduce manual arithmetic errors.
4. Provide transparent monthly settlements.
5. Maintain accurate member and expense records.
6. Protect financial data through authentication and authorization.
7. Provide a professional and maintainable full-stack architecture.
8. Demonstrate real-world software engineering practices.

## 4.2 Engineering Goals

The project should also demonstrate:

- Requirement analysis
- System design
- Database design
- REST API design
- Authentication
- Role-based authorization
- Data validation
- Business logic implementation
- Automated testing
- Error handling
- Deployment
- Documentation
- Version control

---

# 5. Target Users

## 5.1 House Manager / Administrator

The person responsible for managing the shared household.

Typical responsibilities include:

- Managing members
- Recording meals
- Recording expenses
- Managing rent and utilities
- Reviewing financial summaries
- Managing monthly settlements

## 5.2 House Member / Resident

A person living in the shared household.

Members should be able to:

- View their meal records
- View their financial information
- View their contributions
- View their monthly balance
- Review settlement information
- Manage their profile

---

# 6. User Roles

The initial version will support two primary roles.

## 6.1 Administrator

The administrator can:

- Create and manage a household
- Manage members
- Manage meals
- Manage expenses
- Manage rent
- Manage utilities
- Record contributions
- View financial summaries
- Generate monthly settlements

## 6.2 Member

A member can:

- View household information
- View their own meal records
- View their own financial information
- View their contributions
- View their balance
- View monthly settlements
- Manage their own profile

Access control must ensure that users cannot access data outside their authorized household.

---

# 7. User Stories

## Authentication

**US-01**

As a user, I want to create an account so that I can access the application.

**US-02**

As a user, I want to securely log in so that I can access my private data.

**US-03**

As a user, I want to log out so that my session can be terminated securely.

---

## Household Management

**US-04**

As an administrator, I want to create a household so that I can manage shared expenses.

**US-05**

As an administrator, I want to add members so that their meals and expenses can be tracked.

**US-06**

As an administrator, I want to manage household members so that the member list remains accurate.

---

## Meal Management

**US-07**

As a member, I want my daily meals to be recorded so that my monthly meal cost can be calculated.

**US-08**

As an administrator, I want to view meal records so that I can verify household meal consumption.

**US-09**

As a user, I want to view my meal history so that I can identify incorrect records.

---

## Expense Management

**US-10**

As an administrator, I want to record household expenses so that all shared costs are tracked.

**US-11**

As an administrator, I want to categorize expenses so that financial reports are easier to understand.

**US-12**

As a member, I want to view relevant financial records so that household expenses remain transparent.

---

## Settlement

**US-13**

As an administrator, I want the system to calculate the monthly meal rate automatically.

**US-14**

As a member, I want to know my total monthly liability.

**US-15**

As a member, I want to know how much I have paid.

**US-16**

As a member, I want to know whether I owe money or have an outstanding balance.

---

# 8. Core Features

## 8.1 Authentication

The system will provide:

- User registration
- User login
- Logout
- Protected routes
- Authentication state
- Secure password storage

Passwords must never be stored in plain text.

---

## 8.2 Household Management

An authenticated administrator can create a shared household.

A household may contain:

- Name
- Description
- Administrator
- Members
- Status
- Created date
- Updated date

The system must maintain clear ownership and membership relationships.

---

## 8.3 Member Management

Administrators can:

- Add members
- View members
- Update member information
- Deactivate members
- Remove members where permitted

Each member must be associated with a household.

---

## 8.4 Daily Meal Tracking

The initial version will support:

- Breakfast
- Lunch
- Dinner

Each daily meal record should contain:

```text
Member
Date
Breakfast
Lunch
Dinner
Total Meals
```

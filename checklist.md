# Employee Scheduling API – Project Checklist

## Backend

### Setup

- [x] Initialize TypeScript + Express project
- [x] Configure Prisma and connect to database

### Database Schema (Prisma)

- [x] `User` model (role: `employer` | `employee`)
- [x] `Employee` model (profile info, linked to User)
- [x] `Shift` model (morning / afternoon / night)
- [x] `Availability` model (employee preference per day/shift)
- [x] `ScheduleEntry` model (who works which shift on which day)
- [x] Correct relations between all models

### API Endpoints

- [x] `POST /auth/login` – all users
- [x] `GET /employees` – implemented (role restriction not enforced yet)
- [x] `POST /employees` – implemented (role restriction not enforced yet)
- [ ] `GET /employees/:id` – not implemented
- [x] `GET /availability/:employeeId` – implemented
- [x] `PUT /availability/:employeeId` – implemented
- [x] `GET /schedule` – implemented
- [ ] `PUT /schedule` – implemented as `PUT /schedule/assign` and `PUT /schedule/remove` (shape differs from spec)

### Validation & Error Handling

- [x] Zod validation on all `POST` and `PUT` endpoints
- [x] Proper HTTP status codes on all responses
- [x] Error responses for wrong input, not found, and unauthorized

### Auth & Access Control

- [ ] Login returns token/session – backend returns `{username, role, name}` only, no token issued
- [ ] Role-based access middleware – `rbac.ts` exists but is not applied to any route; `req.user` is never populated

### Logging

- [x] Basic logging implemented (console or Winston)

---

## Frontend

### Employer Views

- [x] Login page
- [x] Employee list page
- [x] Register new employee form
- [x] Job schedule view + assign shifts

### Employee Views

- [x] Login page
- [x] Set availability view
- [x] My schedule view

### General

- [x] Frontend communicates with the actual API (no mock data)
- [x] Login controls what the user sees (role-based navigation)
- [x] Frontend placed in a separate folder in the repo

---

## GitHub & Collaboration

- [x] Code pushed to GitHub with meaningful commit messages
- [x] All group members have visible contributions in git history
- [ ] One GitHub Issue created per feature
- [ ] Issues assigned to team members with labels
- [x] Feature branches used (e.g. `feature/availability-endpoint`)
- [x] Pull requests opened and reviewed before merging

---

## VG Requirements

- [x] Logging is structured (e.g. Winston with request logging)
- [ ] Code split into logical layers: routes / controllers / services
- [ ] Code is clean and well-structured
- [ ] GitHub Issues used to plan and track all work
- [x] Feature branches and pull requests used throughout

---

## Notes (16 Apr 2026, updated)

- `GET /employees/:id` is not implemented — only GET all exists.
- `PUT /schedule` spec differs from implementation: current endpoints are `PUT /schedule/assign` and `PUT /schedule/remove`.
- Login issues no backend token — frontend stores `{username, role, name}` in `sessionStorage` only. RBAC middleware (`rbac.ts`) exists but is never applied to routes, and `req.user` is never populated (no auth middleware).
- Local store (`localStorage`) is still used for features with no backend equivalent: shift requirements, schedule audit log, and shift handover requests.
- GitHub Issues/labels assignments require checking the GitHub web UI and are not confirmed here.

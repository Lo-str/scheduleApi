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
- [ ] `GET /employees` – employer only
- [ ] `POST /employees` – employer only
- [ ] `GET /employees/:id` – employer only
- [ ] `GET /availability/:employeeId` – both roles
- [ ] `PUT /availability/:employeeId` – employee only
- [ ] `GET /schedule` – both roles
- [ ] `PUT /schedule` – employer only

### Validation & Error Handling

- [x] Zod validation on all `POST` and `PUT` endpoints
- [ ] Proper HTTP status codes on all responses
- [ ] Error responses for wrong input, not found, and unauthorized

### Auth & Access Control

- [ ] Login returns token/session
- [ ] Role-based access middleware (employer vs employee)

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

- [ ] Frontend communicates with the actual API (no mock data)
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

## Notes (16 Apr 2026)

- Items left unchecked are either incomplete, partially complete, or not verifiable from local code alone.
- API role restrictions are not currently enforced in route handlers even though RBAC middleware exists.
- `PUT /schedule` is not implemented as written; current endpoints are `PUT /schedule/assign` and `PUT /schedule/remove`.
- `GET /employees/:id` is missing.
- Login creates a frontend session in `sessionStorage` but no backend token/session issuance is implemented.
- Frontend still uses local store in parallel with backend API, so "no mock/local data" is not fully complete.
- GitHub Issues/labels assignments require checking the GitHub web UI and are not confirmed in this file.

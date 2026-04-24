# Schedule API

A full-stack staff scheduling system for managing employee shifts. Employers can create staff accounts and assign employees to shifts; employees can mark their availability and view their schedule.

## Tech Stack

**Backend:** Node.js, Express 5, TypeScript, Prisma (PostgreSQL via Neon), JWT, Zod, Winston  
**Frontend:** React 19, Vite, TypeScript, React Router, Axios

## Features

- JWT-based authentication with role-based access control (EMPLOYER / EMPLOYEE)
- Employers can create employees, manage shifts, and assign staff
- Employees can mark availability and view their schedule
- Three shift types per day: MORNING (07:00–15:00), AFTERNOON (15:00–18:00), NIGHT (18:00–23:00)
- Max 3 employees per shift slot
- Request validation via Zod, password hashing via bcrypt

## Prerequisites

- Node.js 20.6+
- PostgreSQL database (project uses [Neon](https://neon.tech))

## Installation

```bash
# Install dependencies
npm install

# Copy and fill in environment variables
cp .env.example .env
```

### Environment Variables

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `PORT` | Server port (default: `3000`) | Yes |
| `JWT_SECRET` | Secret for signing JWT tokens | Yes |
| `NODE_ENV` | `development` or `production` | No |

Generate a `JWT_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Database Setup

```bash
# Run migrations
npx prisma migrate deploy

# Seed initial data (shifts + admin user)
npx prisma db seed
```

## Running

```bash
# Backend — development (hot reload)
npm run dev

# Frontend — development
npm run frontend:dev

# Production build
npm run build
npm start
```

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start backend with hot reload |
| `npm run frontend:dev` | Start Vite dev server |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled build |
| `npm test` | Run tests with Vitest |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | Run ESLint |

## API Reference

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Login with `email` or `username` (login code) + `password`. Returns JWT. |

### Employees *(EMPLOYER only)*

| Method | Path | Description |
|---|---|---|
| `GET` | `/employees` | List all employees |
| `POST` | `/employees` | Create a new employee |
| `PATCH` | `/employees/:employeeId/role` | Update employee role |

### Availability

| Method | Path | Description |
|---|---|---|
| `GET` | `/availability/:employeeId` | Get availability for an employee |
| `PUT` | `/availability/:employeeId` | Set availability for a shift/date *(EMPLOYEE only)* |

### Schedule

| Method | Path | Description |
|---|---|---|
| `GET` | `/schedule` | Get all schedule entries |
| `PUT` | `/schedule/assign` | Assign employee to a shift |
| `PUT` | `/schedule/remove` | Remove employee from a shift |

> Employees may only assign/remove themselves. Employers can manage any employee.

## Project Structure

```
scheduleApi/
├── src/
│   ├── index.ts                # App entry point
│   ├── controllers/            # Business logic
│   ├── routes/                 # Route definitions
│   ├── middleware/             # Auth, RBAC, error handling
│   ├── helpers/                # Utilities & validation
│   └── schemas/                # Zod schemas
├── frontend/
│   └── src/
│       ├── pages/              # LoginPage, EmployerPage, EmployeePage
│       ├── api/                # Axios API clients
│       └── lib/                # State management (store-*.ts)
├── prisma/
│   ├── schema.prisma           # Data models
│   ├── seed.ts                 # Database seeder
│   └── migrations/
└── logs/                       # Winston log output
```

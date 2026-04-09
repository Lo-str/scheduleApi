# React App Cheat Sheet

This is the current quick reference for the React + Vite + TypeScript app after the store split and API adapter update.

Project root for React app:

- react-vite-app

## 1. Current Architecture

### App Shell

- src/main.jsx
  - Active app bootstrap + HashRouter wrapper.
  - Imports the active stylesheet src/styles.css.

- src/App.tsx
  - Routes and role protection.
  - Uses appApi.getSessionUser() for route guards.

### UI Pages

- src/pages/LoginPage.tsx
  - Login form, role selection, inline error state.
  - Calls appApi.authenticateUser() + appApi.setSessionUser().

- src/pages/EmployerPage.tsx
  - Employer dashboard sections:
    - Employee list + role edits.
    - Employee registration.
    - Schedule planning/assignment.
    - Handover approvals.
    - Team availability by shift.
  - Includes desktop schedule grid and mobile schedule card layout.

- src/pages/EmployeePage.tsx
  - Employee dashboard sections:
    - Profile edit.
    - Availability editor.
    - Schedule join/remove/give-away flow.
    - Team availability by shift in the Availability section.
  - Includes desktop schedule grid and mobile schedule card layout.

### Data Layer (Current LocalStorage Modules)

- src/lib/api.ts
  - Frontend API boundary used by pages/router for session/auth/store access.
  - Keeps UI code ready for backend replacement with minimal page changes.

- src/lib/store.ts
  - Barrel export only (single import path for pages).

- src/lib/store-core.ts
  - Core types, constants, default seeded store, load/save, normalize helpers.

- src/lib/store-auth.ts
  - authenticate(), getCurrentUser(), setCurrentUser(), clearCurrentUser().
  - Session TTL handling via constants.

- src/lib/store-schedule.ts
  - Shift labels, required slots, open slots, assignment validation, audit append.

- src/lib/store-employees.ts
  - Employee role updates, employee creation, profile update logic.

- src/lib/store-availability.ts
  - Availability read/write helpers per user.

- src/lib/store-handovers.ts
  - Handover request creation and approval/rejection transfer logic.

- src/lib/constants.ts
  - Shared constants such as:
    - SESSION_TTL_MS
    - TOAST_DURATION_MS
    - EMPLOYEE_ROLE_OPTIONS
    - EMAIL_PATTERN

### Assets and Styling

- src/assets/logo.png
- src/assets/profiles/\*.png
- src/assets/profileImages.ts (username to image mapping)
- src/styles.css (active visual system, responsiveness, accessibility focus styles)

## 2. Where To Edit Common Changes

### Login and Session Behavior

- UI/validation: src/pages/LoginPage.tsx
- Session/auth rules: src/lib/store-auth.ts
- Shared session timing: src/lib/constants.ts
- API boundary signatures: src/lib/api.ts

### Employer Employee Management

- Employer UI handlers and forms: src/pages/EmployerPage.tsx
- Employee mutations: src/lib/store-employees.ts
- Shared role options + email regex: src/lib/constants.ts

### Schedule and Open Shift Rules

- Employer schedule UI + controls: src/pages/EmployerPage.tsx
- Employee schedule UI + controls: src/pages/EmployeePage.tsx
- Schedule rules/validation: src/lib/store-schedule.ts

### Availability Flow

- Employee availability table: src/pages/EmployeePage.tsx
- Team availability displays:
  - src/pages/EmployeePage.tsx
  - src/pages/EmployerPage.tsx
- Availability persistence: src/lib/store-availability.ts

### Handover Requests

- Employee request creation UI: src/pages/EmployeePage.tsx
- Employer request review UI: src/pages/EmployerPage.tsx
- Handover domain logic: src/lib/store-handovers.ts

### Profile Pictures

- Mapping/update usernames to images: src/assets/profileImages.ts
- Employee cards and profile rendering:
  - src/pages/EmployerPage.tsx
  - src/pages/EmployeePage.tsx

### Visual/Responsive Changes

- Main stylesheet: src/styles.css
- Desktop schedule: .schedule-grid\*
- Mobile schedule cards: .schedule-mobile-\*
- Focus accessibility styles: :focus-visible rules

### Deployment

- GitHub Pages base path: vite.config.js sets base to /frontEnd/
- Static routing: src/main.jsx uses HashRouter so refreshes work on GitHub Pages
- Deployment workflow: .github/workflows/deploy.yml builds and publishes dist on pushes to main

## 3. Backend-Ready Note

Pages should consume appApi for network-style calls over time.

Migration target:

- Keep page logic mostly intact.
- Replace appApi internals from local store functions to HTTP calls.
- Gradually retire store-\* modules as backend endpoints become available.

## 4. Useful Commands

Run from react-vite-app:

- npm run dev
- npm run build
- npm run lint
- npm run preview

## 5. Current Source of Truth

- Today: localStorage + modular store domain files.
- Transition path: appApi -> backend API.
- Current hosting path: Vite base /frontEnd/ + HashRouter for GitHub Pages.
- If changing data shape now, update:
  1. Types/defaults in src/lib/store-core.ts
  2. Domain logic in relevant src/lib/store-\*.ts file
  3. Any page handlers and UI that consume that shape

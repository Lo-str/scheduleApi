# Logging with Winston — scheduleApi

---

## 1. What Is Logging?

**Logging** means recording what happens inside your application as it runs. You are already using `console.log` in the code — that is a basic form of logging. A dedicated logging library like Winston gives you much more control:

- Save logs to files instead of just printing to the terminal
- Separate logs by severity (info, warnings, errors)
- Format log messages consistently with timestamps and levels
- Keep a permanent record you can review after a problem occurs

> `console.log` disappears the moment your terminal closes. A proper logger writes to files on disk, so you can go back and read what happened even after the server has restarted.

---

## 2. Installing Winston

Make sure you are in the root of the project:

```bash
npm install winston
```

---

## 3. Creating the Logger File

Create a dedicated file for the logger configuration:

```
src/logger.ts
```

Keeping the logger in its own file means you can import it anywhere in the backend without repeating the configuration.

---

## 4. Setting Up the Logger

Here is the complete `src/logger.ts` file:

```ts
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  level: "info",

  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}`;
    }),
  ),

  transports: [
    new transports.File({ filename: "logs/error.log", level: "error" }),
    new transports.File({ filename: "logs/combined.log" }),
    new transports.Console(),
  ],
});

export default logger;
```

---

## 5. The Three Core Concepts

### createLogger

`createLogger` is a factory function — it creates and returns a new logger instance configured with your settings. You call it once, configure it, and then use the resulting `logger` object throughout the application.

### format

The `format` object controls how log messages look. Two format helpers are used here:

- `format.timestamp()` — automatically adds the current date and time to every log entry
- `format.printf()` — lets you define a custom template for how each log line is rendered

`format.combine()` merges multiple formats together, applying them in sequence.

The custom print function receives an object and returns a formatted string:

```ts
format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level.toUpperCase()}] ${message}`;
});
```

This produces log lines that look like:

```
2026-04-14T09:12:00.000Z [INFO] Server listens on port 3000
2026-04-14T09:12:45.000Z [ERROR] Database connection failed
```

### transports

Transports decide **where** log messages are sent. Winston supports multiple transports simultaneously — a single log message can be written to a file and printed to the terminal at the same time.

```ts
// Only saves ERROR level messages to this file
new transports.File({ filename: "logs/error.log", level: "error" });

// Saves ALL messages to this file
new transports.File({ filename: "logs/combined.log" });

// Prints ALL messages to the terminal
new transports.Console();
```

> Separating errors into their own file (`error.log`) makes it easy to check for problems quickly — you do not have to search through all the informational messages to find what went wrong.

---

## 6. Log Levels

Winston has a built-in hierarchy of log levels, from least to most severe:

| Level   | When to use                                                   |
| ------- | ------------------------------------------------------------- |
| `debug` | Detailed information for debugging during development         |
| `info`  | Normal application events — things that happened successfully |
| `warn`  | Something unexpected happened but the app is still running    |
| `error` | A serious problem occurred                                    |

When you set `level: "info"` on the logger, Winston will log messages at `info` and everything more severe (`warn`, `error`). Messages less severe than `info` (like `debug`) are ignored.

> The level you set is a **threshold**, not a filter for a single level. Setting `level: "info"` means: log `info`, `warn`, and `error`.

---

## 7. Using the Logger in index.ts

Import the logger and replace the `console.log` in `src/index.ts`:

```ts
import logger from "./logger.js";

app.listen(PORT, () => {
  logger.info(`Server listens on port ${PORT}`);
});
```

---

## 8. Adding Logging to Routes

Here is how logging fits into each of our routes, following the same pattern as the rest of the codebase.

### Login — POST /auth/login

```ts
import logger from "../logger.js";

export async function login(req: Request, res: Response) {
  if (!inputValidation(loginSchema, req.body, res)) return;

  const { email, username, password } = req.body;
  const user = findUser(email, password, username);

  if (!user) {
    logger.warn(`Failed login attempt for email: ${email}`);
    sendError(res, 401, "Invalid credentials");
    return;
  }

  logger.info(`User logged in: ${user.name} (${user.role})`);
  res.json({ role: user.role, name: user.name });
}
```

---

### Employees — GET and POST /employees

```ts
// GET /employees
router.get("/", async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      include: { user: true },
    });
    logger.info(`Fetched ${employees.length} employees`);
    // ... rest of handler
  } catch (err) {
    logger.error(`Error fetching employees: ${err}`);
    sendError(res, 500, err);
  }
});

// POST /employees
router.post("/", async (req, res) => {
  try {
    // ... create employee
    logger.info(`Created new employee: ${parsed.firstName} ${parsed.lastName}`);
    res.status(201).json({ success: true, data: safeEmployee });
  } catch (err) {
    logger.error(`Error creating employee: ${err}`);
    sendError(res, 500, err);
  }
});
```

---

### Schedule — GET, PUT /schedule/assign, PUT /schedule/remove

```ts
// GET /schedule
export const getSchedule = async (req: Request, res: Response) => {
  try {
    const entries = await prisma.scheduleEntry.findMany({
      include: { employees: true, shift: true },
    });
    logger.info(`Fetched schedule with ${entries.length} entries`);
    res.json({ success: true, data: entries });
  } catch (err) {
    logger.error(`Error fetching schedule: ${err}`);
    sendError(res, 500, err);
  }
};

// PUT /schedule/assign
export const assignEmployee = async (req: Request, res: Response) => {
  try {
    // ... assign logic
    logger.info(`Assigned employee ${employeeId} to ${shift} on ${date}`);
    res.json({
      success: true,
      message: "Employee assigned successfully",
      data: updated,
    });
  } catch (err) {
    logger.error(`Error assigning employee: ${err}`);
    sendError(res, 500, err);
  }
};

// PUT /schedule/remove
export const removeEmployee = async (req: Request, res: Response) => {
  try {
    // ... remove logic
    logger.info(`Removed employee ${employeeId} from ${shift} on ${date}`);
    res.json({
      success: true,
      message: "Employee removed successfully",
      data: updated,
    });
  } catch (err) {
    logger.error(`Error removing employee: ${err}`);
    sendError(res, 500, err);
  }
};
```

---

### The Pattern for Every Route

Every route in our project follows the same logging pattern:

- **Success** → `logger.info()` describing what happened
- **Not found / bad input** → `logger.warn()` — something unexpected but not a crash
- **Catch block** → `logger.error()` with the error

---

## 9. Adding Logs Folder to .gitignore

The `logs/` folder should not be committed to Git. Add it to `.gitignore`:

```
logs/
```

Each developer and the production server will have their own log files locally.

---

## 10. Summary

| Concept              | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `createLogger`       | Factory that creates a configured logger instance    |
| `format.timestamp()` | Adds current date and time to every log entry        |
| `format.printf()`    | Defines a custom string template for log output      |
| `format.combine()`   | Merges multiple format helpers together              |
| `transports.File`    | Writes logs to a file on disk                        |
| `transports.Console` | Prints logs to the terminal                          |
| `logger.info()`      | Logs a normal application event                      |
| `logger.warn()`      | Logs something unexpected that did not crash the app |
| `logger.error()`     | Logs a serious problem                               |

Replace all `console.log` and `console.error` calls with the appropriate Winston logger method. Winston gives you persistent, structured, level-filtered logs that `console` cannot provide.

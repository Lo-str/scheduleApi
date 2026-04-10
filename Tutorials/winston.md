# Logging with Winston in Node.js

---

## 1. What Is Logging?

**Logging** means recording what happens inside your application as it runs. You are already familiar with `console.log` — that is a basic form of logging. A dedicated logging library like Winston gives you much more control:

- Save logs to files instead of just printing to the terminal
- Separate logs by severity (info, warnings, errors)
- Format log messages consistently with timestamps and levels
- Keep a permanent record you can review after a problem occurs

> 💡
> `console.log` disappears the moment your terminal closes. A proper logger writes to files on disk, so you can go back and read what happened even after the server has restarted.

---

## 2. Installing Winston

```bash
npm install winston
```

After installation, `winston` will appear in your `package.json` under `dependencies`.

---

## 3. Creating a Logger File

Create a dedicated file for your logger configuration:

```bash
touch logger.js
```

Keeping the logger in its own file means you can import it anywhere in your application without repeating the configuration.

---

## 4. Setting Up the Logger

Here is the complete `logger.js` file:

```js
// logger.js
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

Let's go through each part in detail.

---

## 5. The Three Core Concepts

### createLogger

`createLogger` is a factory function — it creates and returns a new logger instance configured with your settings. You call it once, configure it, and then use the resulting `logger` object throughout your application.

### format

The `format` object controls how log messages look. Two format helpers are used here:

- `format.timestamp()` — automatically adds the current date and time to every log entry
- `format.printf()` — lets you define a custom template for how each log line is rendered

The `format.combine()` function merges multiple formats together, applying them in sequence.

The custom print function receives an object with three properties and returns a formatted string:

```js
format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level.toUpperCase()}] ${message}`;
});
```

This produces log lines that look like:

```
2024-03-15T10:23:45.123Z [INFO] Server started on port 3000
2024-03-15T10:23:52.456Z [ERROR] Database connection failed
```

### transports

Transports decide **where** log messages are sent. Winston supports multiple transports simultaneously — a single log message can be written to a file and printed to the console at the same time.

The three transports configured here:

```js
// Only saves ERROR level messages to this file
new transports.File({ filename: "logs/error.log", level: "error" });

// Saves ALL messages to this file
new transports.File({ filename: "logs/combined.log" });

// Prints ALL messages to the terminal
new transports.Console();
```

> 💡
> Separating errors into their own file (`error.log`) makes it easy to check for problems quickly — you don't have to search through all the informational messages to find what went wrong.

---

## 6. Log Levels

Winston has a built-in hierarchy of log levels, from least to most severe:

| Level     | When to use                                                   |
| --------- | ------------------------------------------------------------- |
| `silly`   | Extremely verbose, rarely used                                |
| `debug`   | Detailed information for debugging during development         |
| `verbose` | More detailed than info                                       |
| `info`    | Normal application events — things that happened successfully |
| `warn`    | Something unexpected happened but the app is still running    |
| `error`   | A serious problem occurred                                    |

When you set `level: "info"` on the logger, Winston will save messages at the `info` level and everything **more severe** (`warn`, `error`). Messages less severe than `info` (like `debug` or `silly`) are ignored.

> ⚠️
> The level you set is a **threshold**, not a filter for a single level. Setting `level: "info"` means: save `info`, `warn`, and `error`. Setting `level: "error"` means: save only `error`.

---

## 7. Using the Logger in Your Application

Import the logger wherever you need it and replace `console.log` / `console.error` calls with the appropriate logger method:

```js
// index.js
import logger from "./logger.js";

// Instead of: console.log("Server started")
logger.info("Server started on port 3000");

// Instead of: console.error("DB connection failed", error.message)
logger.error(`MongoDB connection error: ${error.message}`);
```

---

## 8. Adding Logging to Routes

Adding log calls inside your route handlers gives you a clear record of every action that happens in your API:

```js
// GET all items
router.get("/items", async (req, res) => {
  try {
    const items = await Item.find();
    logger.info("Fetched all items");
    res.json(items);
  } catch (error) {
    logger.error(`Error fetching items: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST new item
router.post("/items", async (req, res) => {
  try {
    const newItem = new Item(req.body);
    await newItem.save();
    logger.info(`Created new item: ${newItem.name}`);
    res.status(201).json(newItem);
  } catch (error) {
    logger.error(`Error creating new item: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT update item
router.put("/items/:id", async (req, res) => {
  try {
    const updated = await Item.findByIdAndUpdate(req.params.id, req.body);
    if (!updated) {
      logger.warn(`Item not found for update: ${req.params.id}`);
      return res.status(404).json({ error: "Item not found" });
    }
    logger.info(`Updated item: ${req.params.id}`);
    res.json(updated);
  } catch (error) {
    logger.error(`Error updating item: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE item
router.delete("/items/:id", async (req, res) => {
  try {
    const deleted = await Item.findByIdAndDelete(req.params.id);
    if (!deleted) {
      logger.warn(`Item not found for deletion: ${req.params.id}`);
      return res.status(404).json({ error: "Item not found" });
    }
    logger.info(`Deleted item: ${req.params.id}`);
    res.json({ message: "Item deleted" });
  } catch (error) {
    logger.error(`Error deleting item: ${error.message}`);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

### The Pattern for Every Route

Every route follows the same logging pattern:

- **Success path** → `logger.info()` describing what happened
- **Not found** → `logger.warn()` — something unexpected but not a crash
- **Catch block** → `logger.error()` with the error message

> 🚨
> Use `logger.warn()` — not `logger.warning()`. The correct method name in Winston is `warn`. Using `warning` will cause a runtime error because that method does not exist.

---

## 9. What the Log Files Look Like

After making some API requests, Winston creates a `logs/` folder containing your log files. A `combined.log` entry looks like this:

```json
{
  "level": "info",
  "message": "Created new item: orange",
  "timestamp": "2024-03-15T10:23:45.123Z"
}
```

The `error.log` file contains only entries where the level is `error` — making it a focused file you can quickly scan when something goes wrong.

---

## 10. Summary

| Concept              | Purpose                                             |
| -------------------- | --------------------------------------------------- |
| `createLogger`       | Factory that creates a configured logger instance   |
| `format.timestamp()` | Adds current date and time to every log entry       |
| `format.printf()`    | Defines a custom string template for log output     |
| `format.combine()`   | Merges multiple format helpers together             |
| `transports.File`    | Writes logs to a file on disk                       |
| `transports.Console` | Prints logs to the terminal                         |
| `logger.info()`      | Logs a normal application event                     |
| `logger.warn()`      | Logs something unexpected that didn't crash the app |
| `logger.error()`     | Logs a serious problem                              |

> ⚠️
> Replace all `console.log` and `console.error` calls with the appropriate Winston logger method in production applications. Winston gives you persistent, structured, level-filtered logs that `console` simply cannot provide.

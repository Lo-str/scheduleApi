# MongoDB with Mongoose and Express

---

## 1. SQL vs NoSQL — What's the Difference?

Before writing any code, it helps to understand why you would choose one type of database over another.

### SQL Databases (e.g. PostgreSQL)

Think of a SQL database like the filing cabinets in a library. Every book has a predefined slot and must follow strict rules to fit in — it needs an ISBN number, a title, an author, a publication date. If someone asks for the book with ISBN 12345, you know exactly where to find it because everything is neatly organized.

SQL databases are **structured** — data must follow a specific format, like rows in a spreadsheet. Every row in a table has the same columns.

### NoSQL Databases (e.g. MongoDB)

Think of a NoSQL database like a scrapbook. You can paste anything you want — pictures, handwritten notes, receipts. There is no strict format. One page might have a photo of a football player with a name and age, and another might just say "I love running."

NoSQL databases are **flexible** — great for storing diverse or unpredictable data where you don't know exactly what shape it will take.

### When to Use Which

| Situation                                          | Choose |
| -------------------------------------------------- | ------ |
| Data is highly structured and consistent           | SQL    |
| Data format is strict and well-defined             | SQL    |
| Data is flexible or unpredictable                  | NoSQL  |
| You need to iterate quickly without a fixed schema | NoSQL  |

---

## 2. Setting Up MongoDB with Docker Compose

Create a `docker-compose.yml` file in your project root:

```bash
touch docker-compose.yml
```

```yaml
services:
  mongodb:
    image: mongo
    container_name: mongodb
    ports:
      - 27017:27017
    volumes:
      - data:/data/db

  express:
    image: mongo-express
    container_name: express
    ports:
      - 8081:8081
    environment:
      ME_CONFIG_MONGODB_SERVER: mongodb
    volumes:
      - data:/data/db

volumes:
  data:
```

### What Each Part Does

**mongodb service:**

- `image: mongo` — uses the official MongoDB Docker image
- `container_name: mongodb` — gives the container a name so you can easily refer to it when debugging
- `ports: 27017:27017` — maps the container's MongoDB port to your machine's port 27017 (the default MongoDB port)
- `volumes: data:/data/db` — mounts a named volume so your data persists even if the container is stopped or removed. MongoDB stores its data files in `/data/db`

**mongo-express service:**

- `image: mongo-express` — a lightweight web interface for browsing MongoDB
- `ports: 8081:8081` — makes the interface accessible in your browser at `http://localhost:8081`
- `ME_CONFIG_MONGODB_SERVER: mongodb` — tells mongo-express which container to connect to. This value must match the `container_name` of your MongoDB service exactly

> 💡
> mongo-express is a visual tool — it lets you browse your MongoDB databases, collections, and documents directly in the browser without writing any queries. Think of it as a GUI for your database.

### Start the Containers

```bash
docker compose up -d
```

The `-d` flag runs the containers in the background. Once running, open `http://localhost:8081` in your browser. You will see three default databases already there:

| Database | Purpose                                                                             |
| -------- | ----------------------------------------------------------------------------------- |
| `admin`  | Holds user authentication, roles, and security data                                 |
| `config` | Used for sharding — distributing data across multiple machines (not needed for now) |
| `local`  | Used for replication and local instance data (not needed for now)                   |

---

## 3. Initializing the Node.js Project

```bash
npm init -y
npm install express mongoose
```

- **Express** — handles incoming HTTP requests and sends back responses
- **Mongoose** — makes it easy to interact with MongoDB from Node.js. It lets you read, create, update, and delete data without writing complex low-level database code

Add `"type": "module"` to your `package.json` to enable ES module imports:

```json
{
  "type": "module"
}
```

Create the entry file:

```bash
touch index.js
```

---

## 4. Setting Up the Express App and Database Connection

```js
// index.js
import express from "express";
import mongoose from "mongoose";

const app = express();
app.use(express.json());

mongoose
  .connect("mongodb://localhost:27017/my_first_database")
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("Could not connect to DB", error));
```

### Breaking This Down

**`app.use(express.json())`** — middleware that tells Express to automatically parse incoming JSON request bodies. Without this, `req.body` would be undefined.

**`mongoose.connect(...)`** — establishes a connection between your Node.js app and the MongoDB database running in Docker.

- `localhost:27017` — the MongoDB instance running on your local machine on the default port
- `my_first_database` — the name of the database to connect to. If it does not exist yet, MongoDB creates it automatically the first time you save data to it

**`.then()` / `.catch()`** — handles the result of the connection attempt. If it succeeds, logs a confirmation. If it fails, logs the error so you can diagnose it.

> ⚠️
> Make sure your Docker containers are running before starting your Node.js server. If MongoDB is not running, `mongoose.connect` will fail and you will see the error in the catch block.

---

## 5. Defining a Schema and Model

```js
const itemSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
});

const Item = mongoose.model("Item", itemSchema);
```

### Schema

A **schema** defines the structure of your data — what fields each document will have and what type each field is. Here each item has:

- `name` — a string (e.g. `"banana"`)
- `quantity` — a number (e.g. `10`)

This is where MongoDB gets a bit of structure even though it is a NoSQL database. You are not forced to use schemas, but Mongoose makes it easy and strongly advisable.

### Model

A **model** is the interface you use to interact with a MongoDB collection. Think of it as a blueprint for creating, reading, updating, and deleting documents.

`mongoose.model("Item", itemSchema)` creates a model called `Item` that maps to a collection called `items` in MongoDB (Mongoose automatically lowercases and pluralizes the model name).

---

## 6. Building the Routes

### GET — Fetch All Items

```js
app.get("/items", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to get items" });
  }
});
```

- `Item.find()` — retrieves all documents from the `items` collection, like asking a librarian to show you every book in the library
- `res.json(items)` — sends the list back as a JSON response
- The route is `async` because database operations take time — `await` pauses execution until the data comes back

### POST — Create a New Item

```js
app.post("/items", async (req, res) => {
  try {
    const newItem = new Item(req.body);
    await newItem.save();
    res.json(newItem);
  } catch (error) {
    res.status(500).json({ error: "Failed to post items" });
  }
});
```

- `req.body` — contains the data the client sent in the request body, for example `{ "name": "banana", "quantity": 10 }`
- `new Item(req.body)` — creates a new document using the schema structure
- `newItem.save()` — saves it to the database. This is async because saving takes time
- `res.json(newItem)` — sends the saved item back to confirm it was stored, including its new `_id`

### PUT — Update an Item

```js
app.put("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const updatedItem = await Item.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!updatedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: "Failed to update items" });
  }
});
```

- `:id` in the route path is a **URL parameter** — a placeholder for the actual ID. For example `/items/64abc123` would set `req.params.id` to `"64abc123"`
- `Item.findByIdAndUpdate(id, updatedData, { new: true })` — finds the document with the given ID and updates it with the new data. The `{ new: true }` option tells Mongoose to return the updated document rather than the old one
- If no document is found with that ID, a `404` response is sent

### DELETE — Remove an Item

```js
app.delete("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await Item.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item deleted", item: deletedItem });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete items" });
  }
});
```

- `Item.findByIdAndDelete(id)` — finds the document with the given ID and removes it from the collection
- If not found, returns `404`
- If successful, confirms the deletion with a message and the deleted item

---

## 7. Starting the Server

```js
app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

Start it with:

```bash
node index.js
```

---

## 8. The Complete index.js File

```js
import express from "express";
import mongoose from "mongoose";

const app = express();
app.use(express.json());

mongoose
  .connect("mongodb://localhost:27017/my_first_database")
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("Could not connect to DB", error));

const itemSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
});

const Item = mongoose.model("Item", itemSchema);

// GET all items
app.get("/items", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Failed to get items" });
  }
});

// POST new item
app.post("/items", async (req, res) => {
  try {
    const newItem = new Item(req.body);
    await newItem.save();
    res.json(newItem);
  } catch (error) {
    res.status(500).json({ error: "Failed to post items" });
  }
});

// PUT update item
app.put("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    const updatedItem = await Item.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!updatedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ error: "Failed to update items" });
  }
});

// DELETE item
app.delete("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedItem = await Item.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ message: "Item deleted", item: deletedItem });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete items" });
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});
```

---

## 9. Testing with Insomnia

| Request         | Method | URL                               | Body                                   |
| --------------- | ------ | --------------------------------- | -------------------------------------- |
| Fetch all items | GET    | `http://localhost:3000/items`     | —                                      |
| Create item     | POST   | `http://localhost:3000/items`     | `{ "name": "banana", "quantity": 10 }` |
| Update item     | PUT    | `http://localhost:3000/items/:id` | `{ "name": "banana", "quantity": 9 }`  |
| Delete item     | DELETE | `http://localhost:3000/items/:id` | —                                      |

> 💡
> To get the ID for PUT and DELETE requests, first run the GET request and copy the `_id` value from one of the returned documents. MongoDB generates this ID automatically when a document is created.

> ⚠️
> If you make changes to your server code, you must **restart the server** for the changes to take effect. If a route is not behaving as expected after editing, always restart first before debugging further.

---

## 10. Summary

| Concept                    | Purpose                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| MongoDB                    | NoSQL database — stores data as flexible documents                |
| Docker Compose             | Runs MongoDB and mongo-express in containers                      |
| mongo-express              | Browser-based GUI for viewing MongoDB data                        |
| Mongoose                   | Node.js library for connecting to and interacting with MongoDB    |
| Schema                     | Defines the structure and types of fields in a document           |
| Model                      | The interface used to create, read, update, and delete documents  |
| `Item.find()`              | Retrieves all documents from the collection                       |
| `Item.findByIdAndUpdate()` | Finds a document by ID and updates it                             |
| `Item.findByIdAndDelete()` | Finds a document by ID and removes it                             |
| `{ new: true }`            | Makes Mongoose return the updated document instead of the old one |

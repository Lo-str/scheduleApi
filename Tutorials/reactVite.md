# Full-Stack Intro — React + Vite Frontend with Node.js + Express Backend

---

## 1. Project Structure Overview

This project is split into two completely separate folders:

```
vite-express-intro/
├── client/    ← React + Vite frontend (runs on port 5173)
└── server/    ← Node.js + Express backend (runs on port 8080)
```

The frontend and backend are independent applications that communicate over HTTP. The frontend asks the backend for data, and the backend responds. They run on different ports, which becomes important later when configuring CORS.

---

## 2. Setting Up the Frontend (Vite + React + TypeScript)

Navigate into your project folder and run:

```bash
npm create vite@latest client
```

When prompted, select **React** and then **TypeScript**. Then install dependencies and start the dev server to confirm it works:

```bash
cd client
npm install
npm run dev
```

If the browser opens and shows the default Vite page, the frontend is set up correctly.

---

## 3. Setting Up the Backend (Node.js + Express)

Create the server folder, navigate into it, and initialize a new Node.js project:

```bash
mkdir server
cd server
npm init -y
```

The `-y` flag answers yes to all setup questions automatically, creating a `package.json` file right away.

### Rename the Entry Point

Open `package.json` and change the `"main"` field from `"index.js"` to `"server.js"` — this is just a naming convention to make it clear this file is the server entry point.

### Create the Server File

```bash
touch server.js
```

### Install Dependencies

```bash
# Express — the web framework
npm install express

# nodemon — restarts the server automatically on file changes
npm install --save-dev nodemon
```

`nodemon` is installed as a **dev dependency** (`--save-dev`) because it is only needed during development, not in production. It watches your files and automatically restarts the server whenever you save a change — no need to manually stop and start.

### Add Scripts to package.json

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

- `npm start` — runs the server with plain Node (for production)
- `npm run dev` — runs the server with nodemon (for development, auto-restarts on save)

> 📝
> If your entry file were named `index.js` instead of `server.js`, these scripts would say `node index.js` and `nodemon index.js`. The script name must always match your actual filename.

---

## 4. Building the Express Server

Open `server.js` and write the following:

```js
const express = require("express");
const app = express();

app.get("/api", (req, res) => {
  res.json({
    cars: ["Mercedes", "Toyota", "Ford", "Opel"],
  });
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});
```

### Breaking This Down

**Importing Express:**

```js
const express = require("express");
```

This loads the Express library using CommonJS `require` syntax.

**Creating the app instance:**

```js
const app = express();
```

This creates your Express application. All routes and middleware are attached to this `app` object.

**Defining a route:**

```js
app.get("/api", (req, res) => {
  res.json({ cars: ["Mercedes", "Toyota", "Ford", "Opel"] });
});
```

This creates a `GET` route at `/api`. When a client visits `http://localhost:8080/api`, Express calls the arrow function and sends back a JSON response containing a list of cars.

The arrow function always receives two arguments:

- `req` — the incoming request (contains things like URL params, body, headers)
- `res` — the outgoing response (used to send data back to the client)

**Starting the server:**

```js
app.listen(8080, () => {
  console.log("Server is running on port 8080");
});
```

This tells Express to start listening for incoming requests on port 8080. The callback runs once the server is ready.

### Test It

Start the server:

```bash
npm run dev
```

Open your browser and go to `http://localhost:8080/api`. You should see:

```json
{ "cars": ["Mercedes", "Toyota", "Ford", "Opel"] }
```

> 🚨
> String values in JavaScript arrays must be wrapped in quotes. Writing `["Mercedes", Toyota, "Ford"]` without quotes around `Toyota` will cause a `ReferenceError` because JavaScript will try to look up a variable called `Toyota`, which does not exist.

---

## 5. Fetching Data in the Frontend with Axios

### What Is Axios?

**Axios** is a JavaScript library that makes it easy to send HTTP requests from the browser to a server. It handles things like JSON parsing automatically and has a clean, promise-based API.

A helpful metaphor: if the frontend is a restaurant customer and the backend is the kitchen, **Axios is the waiter** — it takes the customer's request to the kitchen and brings the food back.

### Install Axios

Make sure you are in the **client** folder:

```bash
cd client
npm install axios
```

### Using Axios in App.tsx

```tsx
import axios from "axios";
import { useEffect, useState } from "react";

function App() {
  const [array, setArray] = useState([]);

  const fetchAPI = async () => {
    const response = await axios.get("http://localhost:8080/api");
    setArray(response.data.cars);
  };

  useEffect(() => {
    fetchAPI();
  }, []);

  return (
    <ul>
      {array.map((car, index) => (
        <li key={index}>{car}</li>
      ))}
    </ul>
  );
}

export default App;
```

---

## 6. Key React Concepts Used

### useState

`useState` is a React hook that lets a component track a value that can change over time. When the value changes, React automatically re-renders the component to reflect the new state.

```tsx
const [array, setArray] = useState([]);
//     ↑           ↑           ↑
//  current     function to   initial
//   value       update it     value
```

- The first item (`array`) is the current value
- The second item (`setArray`) is the function you call to update it
- The argument passed to `useState` is the starting value — here, an empty array

When `setArray(response.data.cars)` is called, React updates `array` with the new data and re-renders the component automatically.

### useEffect

`useEffect` is a React hook that lets you run code in response to something happening — like a component loading for the first time.

```tsx
useEffect(() => {
  fetchAPI();
}, []);
```

The second argument is the **dependency array**. When it is empty `[]`, the effect runs **once** — right after the component first appears on the screen. This is the standard way to fetch data when a page loads.

Think of it like a smart home sensor: when a specific condition occurs (the component mounts), `useEffect` automatically triggers your code to run.

> 💡
> In development mode with React's Strict Mode enabled, `useEffect` runs twice on mount — once to test for side effects and once for real. This is why you may see your fetch function called twice in the console during development. This does not happen in production.

### Rendering a List with .map()

```tsx
{
  array.map((car, index) => <li key={index}>{car}</li>);
}
```

`.map()` loops over every item in the array and returns a JSX element for each one. The `key` prop is required by React when rendering lists — it helps React efficiently update the DOM when items change. Here the array index is used as the key.

---

## 7. Fixing the CORS Error

When you first try to fetch data from the frontend, you will see an error in the browser console:

```
Access to XMLHttpRequest at 'http://localhost:8080/api' from origin
'http://localhost:5173' has been blocked by CORS policy
```

### What Is CORS?

**CORS** (Cross-Origin Resource Sharing) is a browser security feature. By default, a web page can only request data from the **same origin** (same domain and port). Since the frontend runs on port `5173` and the backend runs on port `8080`, they are considered different origins — and the browser blocks the request.

The fix is to configure the backend to explicitly allow requests from the frontend's origin.

### Install the CORS Package

Make sure you are in the **server** folder:

```bash
npm install cors
```

### Update server.js

```js
const express = require("express");
const cors = require("cors");

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
};

app.use(cors(corsOptions));

app.get("/api", (req, res) => {
  res.json({
    cars: ["Mercedes", "Toyota", "Ford", "Opel"],
  });
});

app.listen(8080, () => {
  console.log("Server is running on port 8080");
});
```

`app.use(cors(corsOptions))` tells Express to attach CORS headers to every response, explicitly allowing requests from `http://localhost:5173`. The browser sees these headers and allows the frontend to receive the data.

> ⚠️
> CORS is enforced by the **browser**, not the server. Direct requests made with tools like Insomnia or curl will always work regardless of CORS settings — only browser-based requests are blocked. You only need CORS configuration when a browser is making the request.

---

## 8. Navigating the Axios Response Object

When Axios gets a response back from the server, it wraps it in its own response object. The actual data from the server lives at `response.data`:

```js
const response = await axios.get("http://localhost:8080/api");

// response            → the full Axios response object (status, headers, data, etc.)
// response.data       → { cars: ["Mercedes", "Toyota", "Ford", "Opel"] }
// response.data.cars  → ["Mercedes", "Toyota", "Ford", "Opel"]
```

This is why `setArray(response.data.cars)` is used — you need to dig into the response object to reach the actual array.

---

## 9. Summary

| Concept         | Purpose                                                                        |
| --------------- | ------------------------------------------------------------------------------ |
| Vite            | Frontend build tool and dev server for React                                   |
| Express         | Backend web framework for Node.js                                              |
| nodemon         | Dev tool that auto-restarts the server on file changes                         |
| Axios           | Library for making HTTP requests from the browser                              |
| useState        | React hook for tracking values that change over time                           |
| useEffect       | React hook for running code when a component mounts                            |
| CORS            | Security policy — must be configured on the backend to allow frontend requests |
| `response.data` | Where Axios stores the actual server response body                             |

> ⚠️
> Always make sure you run `npm install` and `npm run dev` from the correct folder. The client and server are separate projects with separate `package.json` files. Installing a package while in the wrong folder is one of the most common mistakes when working with this kind of split project structure.

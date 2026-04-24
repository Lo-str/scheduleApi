# How to set up Prisma 7 with Express and TypeScript

## 1. Initialize the project

```bash
npm init -y
npm install express dotenv @prisma/client @prisma/extension-accelerate prisma  @prisma/adapter-pg pg zod

npm install -D typescript@5 ts-node tsx nodemon @types/node @types/express eslint @eslint/js  @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier @types/node @types/pg
```

## 2. Configure package.json

```json
{
  "name": "project-name",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "lint": "eslint src",
    "frontend:dev": "vite frontend",
    "frontend:build": "vite build frontend",
    "frontend:lint": "eslint frontend/src --ext .js,.jsx",
    "frontend:preview": "vite preview --host"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "devDependencies": {
    "@types/node": "^25.5.0",
    "@typescript-eslint/eslint-plugin": "^8.57.2",
    "@typescript-eslint/parser": "^8.57.2",
    "eslint": "^10.1.0",
    "eslint-config-prettier": "^10.1.8",
    "nodemon": "^3.1.14",
    "prettier": "^3.8.1",
    "tsx": "^4.21.0",
    "typescript": "^6.0.2",
    "ts-node": "^10.9.2"
  },
  "dependencies": {
    "@prisma/client": "^7.5.0",
    "@prisma/extension-accelerate": "^3.0.1",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "prisma": "^7.5.0",
    "zod": "^4.3.6"
  }
}
```

## 2. Set up ESLint

Create a new at the root `eslint.config.js`:

```js
// eslint.config.mjs
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**"],
  },

  js.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked,

  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        sourceType: "module",
        ecmaVersion: "latest",
      },
    },
    rules: {
      // No implicit/unsafe any style
      "@typescript-eslint/no-explicit-any": "error",

      // Consistent arrow functions
      "func-style": ["error", "expression", { allowArrowFunctions: true }],
      "prefer-arrow-callback": "error",

      // No unused vars
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],

      // Strict equality
      eqeqeq: ["error", "always"],

      // Async/await safety
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",

      // Naming style
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase", "PascalCase", "UPPER_CASE"],
          leadingUnderscore: "allow",
        },
        { selector: "typeLike", format: ["PascalCase"] },
      ],
    },
  },

  // Prettier last so it disables conflicting formatting rules
  prettier,
);
```

## 3. Configure tsconfig.json

```bash
npx tsc --init
```

```json
{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "ESNext",
    "target": "ESNext",
    "moduleResolution": "bundler",
    "types": ["node"],
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "strict": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "skipLibCheck": true
  }
  "include": ["src/**/*"]
}
```

Create `src` folder at the root

```bash
npx tsc
```

## 4. Set up Prisma

```bash
npx prisma init
```

Then go to https://console.prisma.io, create a new project, select Prisma Postgres and enable Accelerate.

Copy the connection string into your `.env`:

```
DATABASE_URL="prisma+postgres://accelerate.prisma-data.net/?api_key=your_key_here"
```

## 5. Write your schema

In `prisma/schema.prisma`:

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  importFileExtension = "ts"
}

datasource db {
  provider = "postgresql"
}

model User {
}
```

## 6. Configure prisma.config.ts

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
```

## 7. Run the migration

```bash
npx prisma migrate dev --name create_table
```

## 8. Generate the Prisma client

```bash
npx prisma generate
```

## 9. Write the seed file

In `prisma/seed.ts`:

```ts
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client.js"
import { withAccelerate } from "@prisma/extension-accelerate"

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL!,
}).$extends(withAccelerate())

const seed = async () {
  await
}

seed().then(() => prisma.$disconnect())
```

Then run:

```bash
npx prisma db seed
```

## 10. Build the Express API

In `src/index.ts` import PrismaClient from the generated path:

```ts
import { PrismaClient } from "./generated/prisma/client.js";
import { withAccelerate } from "@prisma/extension-accelerate";
import { z } from "zod";

const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL!,
}).$extends(withAccelerate());
```

Then add your routes and start the server with:

```bash
npm run dev
```

---

## Key things to remember for Prisma 7

- `"type": "module"` is required in `package.json`
- `PrismaClient` must receive `accelerateUrl` — it won't work without it in Prisma 7
- Import from `./generated/prisma/client.js` not from `@prisma/client`
- Use `tsx` instead of `ts-node` to avoid ESM issues
- Always run `npx prisma generate` after changing the schema

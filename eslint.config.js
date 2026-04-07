import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import {
  defineConfig,
  globalIgnores
} from 'eslint/config'

export default tseslint.config({
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
      "func-style": ["error", "expression", {
        allowArrowFunctions: true
      }],
      "prefer-arrow-callback": "error",

      // No unused vars
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_"
        },
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
        {
          selector: "typeLike",
          format: ["PascalCase"]
        },
      ],
    },
  },

  {
    files: ["frontend/src/**/*.{js,jsx}"],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-unused-vars": ["error", {
        varsIgnorePattern: "^[A-Z_]"
      }],
    },
  },

  // Prettier last so it disables conflicting formatting rules
  prettier,
);
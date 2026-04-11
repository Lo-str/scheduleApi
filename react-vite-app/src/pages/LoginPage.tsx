import { type FormEvent, type ReactElement, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appApi } from "../lib/api";
import loginLogo from "../assets/login-logo.png";

type LoginFormState = {
  username: string;
  password: string;
};

// Render login form and route users based on role.
export default function LoginPage(): ReactElement {
  const navigate = useNavigate();
  const [form, setForm] = useState<LoginFormState>({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const isSubmitDisabled = !form.username.trim() || !form.password;

  // Submit login details and create the session.
  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalizedUsername = form.username.trim();
    const user =
      appApi.authenticateUser(normalizedUsername, form.password, "employer") ||
      appApi.authenticateUser(normalizedUsername, form.password, "employee");
    if (!user) {
      setError("Incorrect username or password.");
      return;
    }

    appApi.setSessionUser(user);
    navigate(user.role === "employer" ? "/employer" : "/employee", {
      replace: true,
    });
  };

  return (
    <div className="page login-page">
      <main className="pet-login-shell">
        {/* Visual style follows the reference while keeping role-aware auth logic intact. */}
        <section className="pet-login-card">
          <img
            className="pet-login-logo"
            src={loginLogo}
            alt="Paws and Plates"
          />

          <form className="pet-login-form" onSubmit={onSubmit}>
            <label className="pet-field-label" htmlFor="username">
              Username
            </label>
            <div className="pet-input-wrap">
              <span className="pet-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
                </svg>
              </span>
              <input
                id="username"
                value={form.username}
                autoComplete="username"
                placeholder="your username"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, username: event.target.value }))
                }
                onInput={() => setError("")}
                aria-describedby={error ? "login-error" : undefined}
                required
              />
            </div>

            <label className="pet-field-label" htmlFor="password">
              Password
            </label>
            <div className="pet-input-wrap">
              <span className="pet-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <circle cx="8" cy="12" r="3.2" />
                  <path d="M11.2 12H20" />
                  <path d="M16.2 12v2.2" />
                  <path d="M18.4 12v1.6" />
                </svg>
              </span>
              <input
                id="password"
                type="password"
                value={form.password}
                autoComplete="current-password"
                placeholder="password"
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                onInput={() => setError("")}
                aria-describedby={error ? "login-error" : undefined}
                required
              />
            </div>

            <button
              className="pet-login-button"
              type="submit"
              disabled={isSubmitDisabled}
            >
              Sign in
            </button>
          </form>

          {error && (
            <p
              className="error pet-login-error"
              id="login-error"
              role="alert"
              aria-live="polite"
            >
              {error}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

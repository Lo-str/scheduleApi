import { type FormEvent, type ReactElement, useState } from "react";
import { useNavigate } from "react-router-dom";
import { appApi } from "../lib/api";
import logo from "../assets/logo.png";

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
    const user = appApi.authenticateUser(normalizedUsername, form.password);
    if (!user) {
      setError("Incorrect login details.");
      return;
    }

    appApi.setSessionUser(user);
    navigate(user.role === "employer" ? "/employer" : "/employee", {
      replace: true,
    });
  };

  return (
    <div className="page login-page">
      {/* Login header keeps branding and route context consistent with dashboards. */}
      <header className="topbar">
        <div className="topbar-left">
          <h1>Login</h1>
          <p className="topbar-subtitle">Schedule Login</p>
        </div>
        <img
          className="header-logo"
          src={logo}
          alt="Sundsgarden Hotell och Konferens"
        />
      </header>

      <main className="center-main">
        {/* Single-panel login flow with role-aware credential check. */}
        <section className="panel login-panel">
          <h2>Login</h2>
          <p className="muted">
            Use employee password 1234 or admin/1234 for employer.
          </p>

          <form className="form-grid" onSubmit={onSubmit}>
            {/* Username and password map directly to auth validation. */}
            <label htmlFor="username">Username</label>
            <input
              id="username"
              value={form.username}
              autoComplete="username"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, username: event.target.value }))
              }
              onInput={() => setError("")}
              aria-describedby={error ? "login-error" : undefined}
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              autoComplete="current-password"
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              onInput={() => setError("")}
              aria-describedby={error ? "login-error" : undefined}
              required
            />

            <div />
            <button className="btn" type="submit" disabled={isSubmitDisabled}>
              Sign in
            </button>
          </form>

          {error && (
            <p
              className="error"
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

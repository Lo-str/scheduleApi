import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import EmployerPage from "./pages/EmployerPage";
import EmployeePage from "./pages/EmployeePage";

type SessionRole = "employer" | "employee";
type SessionUser = {
  username: string;
  role: SessionRole;
  name: string;
};

function getSessionUser(): SessionUser | null {
  const raw = sessionStorage.getItem("sessionUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

type RequireRoleProps = {
  role: SessionRole;
  children: ReactElement;
};

function RequireRole({ role, children }: RequireRoleProps): ReactElement {
  const user = getSessionUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return (
      <Navigate
        to={user.role === "employer" ? "/employer" : "/employee"}
        replace
      />
    );
  }
  return children;
}

export default function App(): ReactElement {
  const user = getSessionUser();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Navigate
            to={
              user
                ? user.role === "employer"
                  ? "/employer"
                  : "/employee"
                : "/login"
            }
            replace
          />
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/employer"
        element={
          <RequireRole role="employer">
            <EmployerPage />
          </RequireRole>
        }
      />
      <Route
        path="/employee"
        element={
          <RequireRole role="employee">
            <EmployeePage />
          </RequireRole>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

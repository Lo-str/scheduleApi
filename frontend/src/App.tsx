import type { ReactElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { appApi } from "./lib/api";
import { type RoleName } from "./lib/store";
import LoginPage from "./pages/LoginPage";
import EmployerPage from "./pages/EmployerPage";
import EmployeePage from "./pages/EmployeePage";

type RequireRoleProps = {
  role: RoleName;
  children: ReactElement;
};

// Protect route content by checking the logged-in role.
function RequireRole({ role, children }: RequireRoleProps): ReactElement {
  const user = appApi.getSessionUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role)
    return (
      <Navigate
        to={user.role === "employer" ? "/employer" : "/employee"}
        replace
      />
    );
  return children;
}

// Render application routes and default redirects.
export default function App(): ReactElement {
  const user = appApi.getSessionUser();

  return (
    <Routes>
      {/* Root route redirects by session/role so users land on the correct dashboard. */}
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
      {/* Catch-all route keeps unknown URLs inside the app flow. */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

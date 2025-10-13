// src/App.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Purpose: Central route configuration for the app.
// - Uses React Router v6
// - Wraps routes with a shared <Layout /> (header/main/footer)
// - Groups routes into: Public, Auth-only, and Admin-only
// - Provides a catch-all 404 route
// ─────────────────────────────────────────────────────────────────────────────

import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

import Home from "./pages/Home";
import About from "./pages/About";
import Packages from "./pages/Packages";
import IndividualTraining from "./pages/IndividualTraining";
import CorporateTraining from "./pages/CorporateTraining";
import Contact from "./pages/Contact";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Calendar from "./pages/Calendar";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import Settings from "./pages/Settings";
import ForgotPassword from "./pages/ForgotPassword";
import Careers from "./pages/Careers";

function App() {
  return (
    // ─────────────────────────────────────────────────────────────────────────
    // Router root: enables client-side navigation via <Link>/<NavLink>
    // ─────────────────────────────────────────────────────────────────────────
    <BrowserRouter>
      <Routes>
        {/* ────────────────────────────────────────────────────────────────────
            Shared layout wrapper:
            - Renders <Header /> and optional <Footer /> inside <Layout />
            - <Outlet /> inside Layout renders the matching child route
           ─────────────────────────────────────────────────────────────────── */}
        <Route element={<Layout />}>
          {/* ──────────────────────────────────────────────────────────────────
              Public routes (no auth required)
             ───────────────────────────────────────────────────────────────── */}
          <Route path="/" element={<Home />} />
          <Route path="/individual-training" element={<IndividualTraining />} />
          <Route path="/corporate-training" element={<CorporateTraining />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* ──────────────────────────────────────────────────────────────────
              Auth-only routes:
              - Wrapped in <ProtectedRoute />
              - <ProtectedRoute> should check session/user and either:
                a) render <Outlet /> (authorized), or
                b) redirect to /login (unauthorized)
             ───────────────────────────────────────────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/calendar" element={<Calendar />} />

            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* ──────────────────────────────────────────────────────────────────
              Admin-only routes:
              - Same mechanism as above, but <ProtectedRoute role="admin" />
              - Only users with role === "admin" should pass
             ───────────────────────────────────────────────────────────────── */}
          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>

        {/* ────────────────────────────────────────────────────────────────────
            Catch-all (404):
            - Matches any path that didn’t match above
           ─────────────────────────────────────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

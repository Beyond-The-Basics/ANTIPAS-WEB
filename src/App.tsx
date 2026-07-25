import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { Layout } from "./components/Layout";
import { useActingUser } from "./context/ActingUser";
import { LoginPage, SignupPage } from "./pages/AuthPages";
import { AvailabilityPage } from "./pages/AvailabilityPage";
import { CreateTeamPage } from "./pages/CreateTeamPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { MatchDetailPage } from "./pages/MatchDetailPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TeamDetailPage } from "./pages/TeamDetailPage";
import { TeamsPage } from "./pages/TeamsPage";

/**
 * Every in-app screen renders inside the app shell and requires someone to act as — a signed-in
 * user, or a dev impersonation — *and* a completed onboarding profile. The landing, auth and
 * onboarding pages deliberately render outside it (onboarding has nothing to show in the nav yet).
 */
function AppShell() {
  const { user, loading } = useActingUser();
  const location = useLocation();

  // Wait for the stored credential to resolve before deciding; otherwise a signed-in user gets
  // bounced to /login on every refresh.
  if (loading) return null;

  const from = { from: location.pathname + location.search };
  if (!user) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/login" replace state={from} />;
  }
  if (!user.onboarding_completed) {
    return <Navigate to="/onboarding" replace state={from} />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

/** /onboarding itself only needs a signed-in user — it IS the thing that completes the profile. */
function RequireUser() {
  const { user, loading } = useActingUser();
  const location = useLocation();

  if (loading) return null;
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* Public marketing page — brings its own header and footer, no app chrome. */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<RequireUser />}>
        <Route path="/onboarding" element={<OnboardingPage />} />
      </Route>

      <Route element={<AppShell />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/new" element={<CreateTeamPage />} />
        <Route path="/teams/:teamId" element={<TeamDetailPage />} />
        <Route path="/matches/:matchId" element={<MatchDetailPage />} />
        <Route path="/availability" element={<AvailabilityPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        {/* The old console routed users to a raw roster table; that is the profile now. */}
        <Route path="/users" element={<Navigate to="/profile" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

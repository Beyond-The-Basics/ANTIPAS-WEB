import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { AvailabilityPage } from "./pages/AvailabilityPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { HomePage } from "./pages/HomePage";
import { LandingPage } from "./pages/LandingPage";
import { MatchDetailPage } from "./pages/MatchDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TeamDetailPage } from "./pages/TeamDetailPage";
import { TeamsPage } from "./pages/TeamsPage";

/** Every in-app screen renders inside the app shell; the landing page deliberately does not. */
function AppShell() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public marketing page — brings its own header and footer, no app chrome. */}
      <Route path="/" element={<LandingPage />} />

      <Route element={<AppShell />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/teams" element={<TeamsPage />} />
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

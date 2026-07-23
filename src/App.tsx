import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { AvailabilityPage } from "./pages/AvailabilityPage";
import { DiscoverPage } from "./pages/DiscoverPage";
import { HomePage } from "./pages/HomePage";
import { MatchDetailPage } from "./pages/MatchDetailPage";
import { ProfilePage } from "./pages/ProfilePage";
import { TeamDetailPage } from "./pages/TeamDetailPage";
import { TeamsPage } from "./pages/TeamsPage";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/teams" element={<TeamsPage />} />
        <Route path="/teams/:teamId" element={<TeamDetailPage />} />
        <Route path="/matches/:matchId" element={<MatchDetailPage />} />
        <Route path="/availability" element={<AvailabilityPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        {/* The old console routed users to a raw roster table; that is the profile now. */}
        <Route path="/users" element={<Navigate to="/profile" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Layout>
  );
}

// Team creation, as a step wizard: Basics -> Location -> Invite members. Mirrors OnboardingPage's
// shape (each step persists immediately) but runs inside the app shell, since a captain is always
// already signed in and onboarded by the time they get here.
//
// Step 1 is the actual `POST /teams` — the team exists for real from that point on, so abandoning
// the wizard after step 1 just leaves a team with defaults (country "Morocco", no description/
// city/invites yet), all still editable later from the team's own page.

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiError } from "../api/client";
import { SPORTS, type Sport, type Team } from "../api/types";
import { PlayerSearchInvite } from "../components/PlayerSearchInvite";
import { Button, Card, Label, PageTitle, SPORT_LABEL, SportDot } from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { COUNTRIES, DEFAULT_COUNTRY } from "../lib/reference";

const STEPS = ["Basics", "Location", "Invite members"] as const;

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-7">
      <div className="mb-2 flex gap-1.5">
        {STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line-2"}`} />
        ))}
      </div>
      <div className="text-[12.5px] font-semibold text-muted">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </div>
    </div>
  );
}

/** API errors are shown verbatim: the backend already words them for humans. */
function messageFor(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Something went wrong. Please try again.";
}

export function CreateTeamPage() {
  const { user: acting } = useActingUser();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  const [name, setName] = useState("");
  const [sport, setSport] = useState<Sport>("soccer");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [country, setCountry] = useState<string>(DEFAULT_COUNTRY);
  const [city, setCity] = useState("");
  const [invitedCount, setInvitedCount] = useState(0);

  if (!acting) return null;

  const createTeam = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await api.post<Team>("/teams", {
        name: name.trim(),
        sport,
        description: description.trim() || null,
        logo_url: logoUrl.trim() || null,
      });
      setTeam(created);
      setStep(1);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  const saveLocation = async () => {
    if (!team) return;
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/teams/${team.id}`, { country, city: city.trim() || null });
      setStep(2);
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title="Create a team" subtitle="You'll be its captain." />
      <Card className="max-w-[560px] rounded-panel p-6">
        <Progress step={step} />
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-cta border border-[#d97066] bg-[#fdf3f2] px-3.5 py-3 text-[13px] text-[#9b3229]"
          >
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <Label>Team name</Label>
              <input
                className="field w-full"
                autoFocus
                maxLength={120}
                placeholder="Casablanca Kickers"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>Sport</Label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSport(s)}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold ${
                      sport === s
                        ? "border-brand bg-brand-tint text-brand-deep"
                        : "border-line bg-white text-muted hover:bg-canvas"
                    }`}
                  >
                    <SportDot sport={s} size={18} />
                    {SPORT_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Description (optional)</Label>
              <textarea
                className="field w-full"
                rows={3}
                maxLength={500}
                placeholder="What's this team about — level, vibe, how often you play…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>Logo URL (optional)</Label>
              <input
                className="field w-full"
                placeholder="https://…"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
            <Button disabled={busy || !name.trim()} onClick={createTeam}>
              {busy ? "…" : "Continue"}
            </Button>
          </div>
        )}

        {step === 1 && team && (
          <div className="flex flex-col gap-4">
            <div>
              <Label>Country</Label>
              <select
                className="field w-full"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>City (optional)</Label>
              <input
                className="field w-full"
                autoFocus
                maxLength={120}
                placeholder="Casablanca"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={saveLocation}>
                {busy ? "…" : "Continue"}
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)}>
                Skip
              </Button>
            </div>
          </div>
        )}

        {step === 2 && team && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-muted">
              Search for players to invite. They'll need to accept before joining —{" "}
              {invitedCount > 0 ? `${invitedCount} invited so far.` : "you can also do this later."}
            </p>
            <PlayerSearchInvite
              teamId={team.id}
              sport={team.sport}
              excludeUserIds={new Set([acting.id])}
              onInvited={() => setInvitedCount((n) => n + 1)}
            />
            <Button onClick={() => navigate(`/teams/${team.id}`)}>Finish</Button>
          </div>
        )}
      </Card>
    </>
  );
}

// Team creation, as a step wizard: Basics -> Location -> Invite members. Mirrors OnboardingPage's
// shape (each step persists immediately) but runs inside the app shell, since a captain is always
// already signed in and onboarded by the time they get here.
//
// Step 1 is the actual `POST /teams` — the team exists for real from that point on, so abandoning
// the wizard after step 1 just leaves a team with defaults (country "Morocco", no description/
// city/invites yet), all still editable later from the team's own page.

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client";
import { SPORTS, type Sport, type Team } from "../api/types";
import { PlayerSearchInvite } from "../components/PlayerSearchInvite";
import { Button, Card, Label, PageTitle, SPORT_LABEL, SportDot } from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { CITIES_BY_COUNTRY, isCountry } from "../lib/cities";
import { translateApiError } from "../lib/errors";
import { COUNTRIES, DEFAULT_COUNTRY } from "../lib/reference";

const STEP_COUNT = 3;

function Progress({ step }: { step: number }) {
  const { t } = useTranslation();
  const steps = t("createTeam.steps", { returnObjects: true }) as string[];
  return (
    <div className="mb-7">
      <div className="mb-2 flex gap-1.5">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line-2"}`} />
        ))}
      </div>
      <div className="text-[12.5px] font-semibold text-muted">
        {t("createTeam.stepProgress", { step: step + 1, total: STEP_COUNT, name: steps[step] })}
      </div>
    </div>
  );
}

export function CreateTeamPage() {
  const { user: acting } = useActingUser();
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      setError(translateApiError(err, t));
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
      setError(translateApiError(err, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageTitle title={t("createTeam.title")} subtitle={t("createTeam.subtitle")} />
      <Card className="max-w-[560px] rounded-panel p-6">
        <Progress step={step} />
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-cta border border-danger-border bg-danger-bg px-3.5 py-3 text-[13px] text-danger-text"
          >
            {error}
          </div>
        )}

        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <Label>{t("createTeam.teamName")}</Label>
              <input
                className="field w-full"
                autoFocus
                maxLength={120}
                placeholder={t("createTeam.teamNamePlaceholder")}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("createTeam.sport")}</Label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSport(s)}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold ${
                      sport === s
                        ? "border-brand bg-brand-tint text-brand-deep"
                        : "border-line bg-surface text-muted hover:bg-canvas"
                    }`}
                  >
                    <SportDot sport={s} size={18} />
                    {SPORT_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>{t("createTeam.description")}</Label>
              <textarea
                className="field w-full"
                rows={3}
                maxLength={500}
                placeholder={t("createTeam.descriptionPlaceholder")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label>{t("createTeam.logoUrl")}</Label>
              <input
                className="field w-full"
                placeholder="https://…"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
              />
            </div>
            <Button disabled={busy || !name.trim()} onClick={createTeam}>
              {busy ? "…" : t("createTeam.continue")}
            </Button>
          </div>
        )}

        {step === 1 && team && (
          <div className="flex flex-col gap-4">
            <div>
              <Label>{t("createTeam.country")}</Label>
              <select
                className="field w-full"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setCity("");
                }}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>{t("createTeam.cityOptional")}</Label>
              <select
                className="field w-full"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              >
                <option value="">{t("common.none")}</option>
                {(isCountry(country) ? CITIES_BY_COUNTRY[country] : []).map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button disabled={busy} onClick={saveLocation}>
                {busy ? "…" : t("createTeam.continue")}
              </Button>
              <Button variant="ghost" onClick={() => setStep(2)}>
                {t("createTeam.skip")}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && team && (
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-muted">
              {t("createTeam.inviteIntro")}{" "}
              {invitedCount > 0
                ? t("createTeam.invitedSoFar", { count: invitedCount })
                : t("createTeam.canDoLater")}
            </p>
            <PlayerSearchInvite
              teamId={team.id}
              sport={team.sport}
              excludeUserIds={new Set([acting.id])}
              onInvited={() => setInvitedCount((n) => n + 1)}
            />
            <Button onClick={() => navigate(`/teams/${team.id}`)}>{t("createTeam.finish")}</Button>
          </div>
        )}
      </Card>
    </>
  );
}

// Post-signup step wizard. Runs once (routed here automatically by `AppShell` in `App.tsx`
// whenever `user.onboarding_completed` is false) but can also be revisited later to edit the same
// fields, since it's just the wizard framing over the same `PATCH /users/me` the profile page uses.
//
// Each step saves itself via PATCH as you move forward, so a refresh mid-wizard doesn't lose
// progress — the step re-reads its defaults from the acting user, which the backend already has.

import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { api, ApiError } from "../api/client";
import type { Sport } from "../api/types";
import { RatingDots, SPORT_LABEL, SportDot } from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { ATHLETIC_TRAITS, COUNTRIES, DEFAULT_COUNTRY, type AthleticTraitKey } from "../lib/profile";

const SPORTS: Sport[] = ["soccer", "tennis", "paddle"];

const STEPS = ["About you", "Location", "Sports", "Athletic profile"] as const;

function useRedirectTarget(): string {
  const location = useLocation() as { state?: { from?: string } };
  return location.state?.from ?? "/home";
}

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="mb-2 flex gap-1.5">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand" : "bg-line-2"}`}
          />
        ))}
      </div>
      <div className="text-[12.5px] font-semibold text-muted">
        Step {step + 1} of {STEPS.length} · {STEPS[step]}
      </div>
    </div>
  );
}

function WizardShell({ step, children }: { step: number; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-landing-line">
        <div className="mx-auto flex h-[70px] w-full max-w-[1180px] items-center px-8">
          <Link to="/" className="flex flex-none items-center gap-[11px] no-underline">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-brand font-display text-[20px] leading-none text-white">
              K
            </div>
            <div className="font-display text-xl tracking-[0.01em] text-ink">Kickoff</div>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-start justify-center px-6 py-14">
        <div className="w-full max-w-[480px]">
          <Progress step={step} />
          {children}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[12.5px] font-semibold text-landing-body">{label}</div>
      {children}
      {hint && <div className="mt-1.5 text-[12px] text-faint">{hint}</div>}
    </label>
  );
}

const inputClass =
  "w-full rounded-cta border border-landing-line-strong bg-white px-3.5 py-3 text-[15px] text-ink outline-none focus:border-brand";

function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-7">
      <h1 className="m-0 mb-1.5 text-[26px] font-extrabold tracking-[-0.02em]">{title}</h1>
      <p className="m-0 text-sm text-landing-body">{subtitle}</p>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-5 rounded-cta border border-[#d97066] bg-[#fdf3f2] px-3.5 py-3 text-[13px] text-[#9b3229]"
    >
      {message}
    </div>
  );
}

function StepActions({
  onBack,
  onNext,
  nextLabel = "Continue",
  busy,
  disabled,
  skip,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  busy: boolean;
  disabled?: boolean;
  skip?: ReactNode;
}) {
  return (
    <div className="mt-8 flex items-center gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded-cta border border-landing-line-strong bg-white px-5 py-3 text-sm font-bold text-ink hover:bg-landing-hover-soft"
        >
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={busy || disabled}
        className="flex-1 rounded-cta bg-brand px-6 py-3 text-sm font-bold text-white shadow-btn-brand transition duration-150 hover:brightness-[1.06] disabled:opacity-60"
      >
        {busy ? "…" : nextLabel}
      </button>
      {skip}
    </div>
  );
}

/** API errors are shown verbatim: the backend already words them for humans. */
function messageFor(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "Something went wrong. Please try again.";
}

export function OnboardingPage() {
  const { user, refresh } = useActingUser();
  const navigate = useNavigate();
  const target = useRedirectTarget();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nickname, setNickname] = useState(user?.nickname ?? "");
  const [age, setAge] = useState(user?.age?.toString() ?? "");
  const [country, setCountry] = useState(user?.country ?? DEFAULT_COUNTRY);
  const [city, setCity] = useState(user?.city ?? "");
  const [sports, setSports] = useState<Sport[]>(user?.favorite_sports ?? []);
  const [ratings, setRatings] = useState<Record<AthleticTraitKey, number | null>>({
    speed_rating: user?.speed_rating ?? null,
    strength_rating: user?.strength_rating ?? null,
    stamina_rating: user?.stamina_rating ?? null,
    agility_rating: user?.agility_rating ?? null,
  });

  if (!user) return null; // AppShell only renders this route once a user is resolved

  const toggleSport = (s: Sport) =>
    setSports((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const save = async (patch: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await api.patch("/users/me", patch);
      return true;
    } catch (err) {
      setError(messageFor(err));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const next = async (patch: Record<string, unknown>) => {
    if (await save(patch)) setStep((s) => s + 1);
  };

  const finish = async (patch: Record<string, unknown>) => {
    if (!(await save(patch))) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/users/me/onboarding/complete");
      await refresh();
      navigate(target, { replace: true });
    } catch (err) {
      setError(messageFor(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <WizardShell step={step}>
      {error && <ErrorNote message={error} />}

      {step === 0 && (
        <>
          <StepHeading
            title={`Nice to meet you, ${user.name.split(" ")[0]}`}
            subtitle="A couple of basics so other players know who they're playing."
          />
          <div className="flex flex-col gap-4">
            <Field label="Nickname">
              <input
                className={inputClass}
                autoFocus
                maxLength={60}
                placeholder="What should we call you?"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </Field>
            <Field label="Age">
              <input
                className={inputClass}
                type="number"
                min={13}
                max={100}
                inputMode="numeric"
                placeholder="25"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </Field>
          </div>
          <StepActions
            busy={busy}
            disabled={!nickname.trim() || !age}
            onNext={() => next({ nickname: nickname.trim(), age: Number(age) })}
          />
        </>
      )}

      {step === 1 && (
        <>
          <StepHeading title="Where are you based?" subtitle="This is how we find matches near you." />
          <div className="flex flex-col gap-4">
            <Field label="Country">
              <select
                className={inputClass}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="City">
              <input
                className={inputClass}
                autoFocus
                maxLength={120}
                placeholder="Casablanca"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </Field>
          </div>
          <StepActions
            busy={busy}
            disabled={!city.trim()}
            onBack={() => setStep(0)}
            onNext={() => next({ country, city: city.trim() })}
          />
        </>
      )}

      {step === 2 && (
        <>
          <StepHeading
            title="What do you play?"
            subtitle="Pick at least one — you can add more later."
          />
          <div className="flex flex-wrap gap-2.5">
            {SPORTS.map((s) => {
              const selected = sports.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSport(s)}
                  className={`flex items-center gap-2.5 rounded-cta border px-4 py-3 text-sm font-bold transition-colors ${
                    selected
                      ? "border-brand bg-landing-tint text-brand-deep"
                      : "border-landing-line-strong bg-white text-ink hover:bg-landing-hover-soft"
                  }`}
                >
                  <SportDot sport={s} size={20} />
                  {SPORT_LABEL[s]}
                </button>
              );
            })}
          </div>
          <StepActions
            busy={busy}
            disabled={sports.length === 0}
            onBack={() => setStep(1)}
            onNext={() => next({ favorite_sports: sports })}
          />
        </>
      )}

      {step === 3 && (
        <>
          <StepHeading
            title="Rate your game"
            subtitle="Optional self-ratings — helps teammates and opponents know what to expect."
          />
          <div className="flex flex-col gap-5">
            {ATHLETIC_TRAITS.map((t) => (
              <div key={t.key} className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold">{t.label}</div>
                  <div className="text-[12px] text-faint">{t.hint}</div>
                </div>
                <RatingDots
                  value={ratings[t.key]}
                  onChange={(n) => setRatings((prev) => ({ ...prev, [t.key]: n }))}
                />
              </div>
            ))}
          </div>
          <StepActions
            busy={busy}
            nextLabel="Finish"
            onBack={() => setStep(2)}
            onNext={() => finish(ratings)}
          />
        </>
      )}
    </WizardShell>
  );
}

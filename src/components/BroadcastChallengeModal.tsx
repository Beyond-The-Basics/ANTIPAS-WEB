// Broadcast Availability wizard — the flow a captain runs after marking a team complete, to put
// an open challenge in front of other teams.
//
// Built to the "Kickoff Broadcast Modal" handoff (turn 2, 2a–2d): three steps plus a live
// confirmation, carrying the five terms the rest of the product negotiates over — sport+format,
// date, time, pitch, and who books. Each term goes out FIXED or OPEN, and those flags are what
// gate what an opponent may counter later in NegotiationModal.
//
// Three things the design shows that the API cannot back, left out rather than faked (the same
// rule the rest of this client follows — see CLAUDE.md "Where the design outruns the API"):
//   - the audience estimate ("Sent to 14 teams within 10 km at level 6–8"): `Team` has neither
//     coordinates nor any level/rating concept;
//   - pitch availability filtering ("free at 18:30 on Sat 8"): no bookings model exists;
//   - a price on every pitch: the seeded Casablanca directory has none, so the cost callout
//     appears only for a venue whose rate is actually known.
// Distance *is* real — the directory carries coordinates and the API returns `distance_km`.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../api/client";
import type {
  BookingMode,
  GameType,
  OpponentApplication,
  OpponentSearch,
  Pitch,
  Team,
} from "../api/types";
import { BOOKING_MODES } from "../api/types";
import { useActingUser } from "../context/ActingUser";
import { translateApiError } from "../lib/errors";
import { SPORT_EMOJI, SPORT_LABEL, initials } from "./ui";

/** Kick-off options offered as chips; anything else goes through `Custom`. */
const KICKOFF_PRESETS = ["17:00", "18:30", "20:00", "21:30"];
/** How many days forward the date strip offers. Four fits the 406px width without scrolling. */
const DATE_STRIP_DAYS = 4;
/** The directory holds every venue in the city; the design shows a short "near you" shortlist.
 *  The API already returns them nearest-first, so taking the head is the shortlist. */
const MAX_PITCH_OPTIONS = 6;
/** `{weekday, day}` alone renders "5 Wed" in English — Intl only puts the weekday first once a
 *  month is present. Every short date in this modal goes through these options. */
const SHORT_DATE: Intl.DateTimeFormatOptions = {
  weekday: "short",
  day: "numeric",
  month: "short",
};
/** The rate is quoted per hour and the wizard collects no duration, so cost is for one hour.
 *  The exact window is settled later, in the negotiation, which does carry an end time. */
const BILLED_HOURS = 1;

type Step = 1 | 2 | 3 | "live";
type TermFlag = "fixed" | "open";

function ymd(d: Date): string {
  // Local calendar date, not `toISOString()` — that shifts to UTC and can land on the wrong day
  // for anyone east of Greenwich, which includes most of the product's users.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Combine a `yyyy-mm-dd` and an `HH:mm` into an instant the API can store. */
function toIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00`).toISOString();
}

export function BroadcastChallengeModal({
  team,
  gameTypes,
  memberCount,
  teamName,
  onClose,
  onPublished,
}: {
  team: Team;
  gameTypes: GameType[];
  /** Active roster size — what every format is validated against. */
  memberCount: number;
  /** Resolves a team id to its name, for the response rows' monograms. */
  teamName: (id: string) => string;
  onClose: () => void;
  /** Called once the challenge is live, so the team page can refresh its listings. */
  onPublished: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { user } = useActingUser();
  const language = i18n.language;

  const [step, setStep] = useState<Step>(1);
  const [gameTypeId, setGameTypeId] = useState<string>(team.game_type_id ?? "");
  const [datePrimary, setDatePrimary] = useState("");
  const [dateAlt, setDateAlt] = useState<string | null>(null);
  const [kickoff, setKickoff] = useState("18:30");
  const [customTime, setCustomTime] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [pitchId, setPitchId] = useState<string | null>(null);
  const [pitchOpen, setPitchOpen] = useState(false);
  const [bookingMode, setBookingMode] = useState<BookingMode>("we_book");
  const [pitches, setPitches] = useState<Pitch[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<OpponentSearch | null>(null);
  const [responses, setResponses] = useState<OpponentApplication[]>([]);

  // Formats belong to the team's sport: a squad cannot change sport, so step 1 offers the other
  // sports as context (disabled) and makes the *format* the real choice.
  const sportFormats = useMemo(
    () => gameTypes.filter((g) => g.sport === team.sport),
    [gameTypes, team.sport],
  );
  const selectedFormat = sportFormats.find((g) => g.id === gameTypeId) ?? null;
  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: DATE_STRIP_DAYS }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i + 1); // from tomorrow — today's kick-off times are mostly gone
      return d;
    });
  }, []);

  const selectedPitch = pitches.find((p) => p.id === pitchId) ?? null;
  const city = selectedPitch?.city ?? team.city ?? "";

  // Escape closes, matching every other dismissible surface in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Pitches load once, on entering step 3. `lat`/`lng` come from the captain's saved profile
  // location — the only real reference point the API has — so a captain who never set one simply
  // gets the list unsorted and without distances, rather than invented ones.
  useEffect(() => {
    if (step !== 3 || pitches.length > 0) return;
    const params = new URLSearchParams();
    if (team.city) params.set("city", team.city);
    if (user?.latitude != null && user?.longitude != null) {
      params.set("lat", String(user.latitude));
      params.set("lng", String(user.longitude));
    }
    api
      .get<Pitch[]>(`/teams/${team.id}/pitches?${params}`)
      .then(setPitches)
      .catch(() => setPitches([]));
  }, [step, pitches.length, team.id, team.city, user?.latitude, user?.longitude]);

  const loadResponses = useCallback(async (searchId: string) => {
    await api
      .get<OpponentApplication[]>(`/opponent-searches/${searchId}/applications`)
      .then(setResponses)
      .catch(() => setResponses([]));
  }, []);

  const termFlags: Record<string, TermFlag> = {
    sport: "fixed",
    date: dateAlt ? "open" : "fixed",
    time: timeOpen ? "open" : "fixed",
    pitch: pitchId ? "fixed" : "open",
    // Always negotiable: nothing in the wizard locks it, and who pays is the thing teams most
    // often want to re-cut once they're talking.
    booking: "open",
  };

  const publish = async () => {
    setPublishing(true);
    setError(null);
    try {
      const search = await api.post<OpponentSearch>(`/teams/${team.id}/opponent-searches`, {
        city,
        country: team.country,
        game_type_id: gameTypeId || null,
        pitch: selectedPitch?.name ?? null,
        pitch_id: pitchId,
        date: toIso(datePrimary, kickoff),
        date_alt: dateAlt ? toIso(dateAlt, kickoff) : null,
        time_open: timeOpen,
        booking_mode: bookingMode,
      });
      setPublished(search);
      setStep("live");
      onPublished();
      void loadResponses(search.id);
    } catch (err) {
      setError(translateApiError(err, t));
    } finally {
      setPublishing(false);
    }
  };

  const stepValid =
    step === 1
      ? Boolean(selectedFormat)
      : step === 2
        ? Boolean(datePrimary)
        : Boolean(pitchId || pitchOpen) && Boolean(city);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 max-[440px]:items-end max-[440px]:p-0"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-full w-[406px] flex-col overflow-hidden rounded-step bg-surface shadow-[0_24px_60px_rgba(0,0,0,.18)] max-[440px]:h-full max-[440px]:w-full max-[440px]:rounded-b-none"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "live" && published ? (
          <LiveState
            search={published}
            team={team}
            format={selectedFormat}
            pitch={selectedPitch}
            dateAlt={dateAlt}
            kickoff={kickoff}
            bookingMode={bookingMode}
            termFlags={termFlags}
            responses={responses}
            teamName={teamName}
            onEdit={() => setStep(3)}
            onDone={onClose}
          />
        ) : (
          <>
            <StepHeader
              step={step as 1 | 2 | 3}
              onBack={() => setStep((s) => ((s as number) - 1) as Step)}
              onClose={onClose}
              summary={
                <StepSummary
                  step={step as 1 | 2 | 3}
                  team={team}
                  memberCount={memberCount}
                  format={selectedFormat}
                  datePrimary={datePrimary}
                  kickoff={kickoff}
                  language={language}
                />
              }
            />

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              {step === 1 && (
                <StepSport
                  team={team}
                  formats={sportFormats}
                  gameTypeId={gameTypeId}
                  setGameTypeId={setGameTypeId}
                  memberCount={memberCount}
                />
              )}
              {step === 2 && (
                <StepWhen
                  dates={dates}
                  datePrimary={datePrimary}
                  setDatePrimary={setDatePrimary}
                  dateAlt={dateAlt}
                  setDateAlt={setDateAlt}
                  kickoff={kickoff}
                  setKickoff={setKickoff}
                  customTime={customTime}
                  setCustomTime={setCustomTime}
                  timeOpen={timeOpen}
                  setTimeOpen={setTimeOpen}
                  language={language}
                />
              )}
              {step === 3 && (
                <StepPitch
                  pitches={pitches}
                  teamId={team.id}
                  pitchId={pitchId}
                  pitchOpen={pitchOpen}
                  selectPitch={(id) => {
                    setPitchId(id);
                    setPitchOpen(false);
                  }}
                  chooseOpen={() => {
                    setPitchId(null);
                    setPitchOpen(true);
                  }}
                  bookingMode={bookingMode}
                  setBookingMode={setBookingMode}
                  selectedPitch={selectedPitch}
                  datePrimary={datePrimary}
                  kickoff={kickoff}
                  language={language}
                  error={error}
                />
              )}
            </div>

            <div className="border-t border-line-2 px-5 pb-5 pt-0 max-[440px]:pt-3">
              <button
                type="button"
                disabled={!stepValid || publishing}
                onClick={() => (step === 3 ? void publish() : setStep(((step as number) + 1) as Step))}
                className="mt-5 w-full rounded-tile bg-brand p-3.5 text-[14px] font-extrabold text-white transition disabled:cursor-not-allowed disabled:opacity-45 max-[440px]:mt-0"
              >
                {publishing
                  ? t("broadcast.publishing")
                  : step === 1
                    ? t("broadcast.continueToWhen")
                    : step === 2
                      ? t("broadcast.continueToPitch")
                      : t("broadcast.reviewAndBroadcast")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- shared chrome ------------------------------------------------------------

function StepHeader({
  step,
  onBack,
  onClose,
  summary,
}: {
  step: 1 | 2 | 3;
  onBack: () => void;
  onClose: () => void;
  summary: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div className="border-b border-line-2 px-5 pb-3.5 pt-[17px]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={step === 1}
          onClick={onBack}
          className="text-[12px] font-bold text-muted disabled:text-faint/60"
        >
          {/* An arrow that points "back" has to follow reading direction, so it's a glyph the
              RTL layout flips with the text rather than a fixed ←. */}
          <span className="rtl:hidden">←</span>
          <span className="hidden rtl:inline">→</span>{" "}
          {step === 1
            ? t("broadcast.back")
            : step === 2
              ? t("broadcast.stepSportShort")
              : t("broadcast.stepWhenShort")}
        </button>
        <span className="text-[12px] font-extrabold text-ink">
          {t("broadcast.stepOf", { step, total: 3 })}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("broadcast.close")}
          className="text-[19px] leading-none text-faint"
        >
          ×
        </button>
      </div>
      <div className="mt-3 flex gap-[5px]">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-sm transition-colors duration-150 ${
              i <= step ? "bg-brand" : "bg-line"
            }`}
          />
        ))}
      </div>
      <div className="mt-[13px] flex items-center gap-2">{summary}</div>
    </div>
  );
}

function SummaryChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-lg bg-chip px-2.5 py-[5px] text-[11.5px] font-bold text-ink">
      {children}
    </span>
  );
}

function StepSummary({
  step,
  team,
  memberCount,
  format,
  datePrimary,
  kickoff,
  language,
}: {
  step: 1 | 2 | 3;
  team: Team;
  memberCount: number;
  format: GameType | null;
  datePrimary: string;
  kickoff: string;
  language: string;
}) {
  const { t } = useTranslation();
  // Just the roster size: there is no target to measure it against, since `completed` — not a
  // player count — is what makes a team eligible to broadcast.
  const confirmed = t("broadcast.confirmedCount", { count: memberCount });
  if (step === 1) {
    return (
      <>
        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-brand text-[12px] text-white">
          ✓
        </span>
        <span className="whitespace-nowrap text-[11.5px] font-semibold text-brand-deep">
          {t("broadcast.squadComplete")} · {confirmed}
        </span>
      </>
    );
  }
  return (
    <>
      <SummaryChip>
        {SPORT_EMOJI[team.sport]} {SPORT_LABEL[team.sport]} {format?.label ?? ""}
      </SummaryChip>
      {step === 2 ? (
        <span className="whitespace-nowrap text-[11.5px] text-faint">{confirmed}</span>
      ) : (
        <SummaryChip>
          {datePrimary
            ? new Date(`${datePrimary}T${kickoff}`).toLocaleDateString(language, SHORT_DATE)
            : ""}{" "}
          · {kickoff}
        </SummaryChip>
      )}
    </>
  );
}

function Title({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div className="text-[18px] font-extrabold text-ink">{title}</div>
      <div className="mb-[17px] mt-[3px] text-[12.5px] text-muted">{subtitle}</div>
    </>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[11px] font-bold uppercase tracking-[.05em] text-muted">{children}</div>
  );
}

// --- step 1: sport ------------------------------------------------------------

function StepSport({
  team,
  formats,
  gameTypeId,
  setGameTypeId,
  memberCount,
}: {
  team: Team;
  formats: GameType[];
  gameTypeId: string;
  setGameTypeId: (id: string) => void;
  memberCount: number;
}) {
  const { t } = useTranslation();
  // Every sport is shown so the choice reads as a choice, but only the team's own is selectable:
  // a squad's sport is fixed at creation and an OpponentSearch inherits it.
  const sports = ["soccer", "paddle", "tennis", "basketball"] as const;

  return (
    <>
      <Title title={t("broadcast.step1Title")} subtitle={t("broadcast.step1Subtitle")} />
      <div className="mb-[18px] grid grid-cols-2 gap-[9px]">
        {sports.map((sport) => {
          const own = sport === team.sport;
          return (
            <div
              key={sport}
              aria-disabled={!own}
              className={`rounded-[13px] px-[13px] py-3.5 ${
                own
                  ? "border-[1.5px] border-brand bg-brand-tint/40"
                  : "cursor-not-allowed border border-line opacity-60"
              }`}
            >
              <div className="text-[22px] leading-none">{SPORT_EMOJI[sport]}</div>
              <div className={`mt-[7px] text-[13.5px] font-extrabold ${own ? "text-ink" : "text-faint"}`}>
                {SPORT_LABEL[sport]}
              </div>
              <div className={`text-[11px] ${own ? "text-brand-deep" : "text-faint"}`}>
                {own ? t("broadcast.yourSquadsSport") : t("broadcast.sportLocked")}
              </div>
            </div>
          );
        })}
      </div>

      <FieldLabel>{t("broadcast.format")}</FieldLabel>
      <div className="flex flex-wrap gap-[7px]">
        {/* Every format of the team's sport is offered whatever the roster size — the captain
            decides who they can field on the day, and guests cover the rest. */}
        {formats.map((f) => {
          const selected = f.id === gameTypeId;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setGameTypeId(f.id)}
              className={`rounded-btn px-3.5 py-2 text-[12.5px] transition ${
                selected
                  ? "bg-brand font-extrabold text-white"
                  : "border border-line font-semibold text-muted"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

// --- step 2: when -------------------------------------------------------------

function StepWhen({
  dates,
  datePrimary,
  setDatePrimary,
  dateAlt,
  setDateAlt,
  kickoff,
  setKickoff,
  customTime,
  setCustomTime,
  timeOpen,
  setTimeOpen,
  language,
}: {
  dates: Date[];
  datePrimary: string;
  setDatePrimary: (d: string) => void;
  dateAlt: string | null;
  setDateAlt: (d: string | null) => void;
  kickoff: string;
  setKickoff: (t: string) => void;
  customTime: boolean;
  setCustomTime: (v: boolean) => void;
  timeOpen: boolean;
  setTimeOpen: (v: boolean) => void;
  language: string;
}) {
  const { t } = useTranslation();

  // First tap sets the primary; a tap on a different day sets the single alternate; tapping the
  // primary again clears the whole selection.
  const tapDate = (value: string) => {
    if (value === datePrimary) {
      setDatePrimary("");
      setDateAlt(null);
    } else if (!datePrimary) {
      setDatePrimary(value);
    } else if (value === dateAlt) {
      setDateAlt(null);
    } else {
      setDateAlt(value);
    }
  };

  return (
    <>
      <Title title={t("broadcast.step2Title")} subtitle={t("broadcast.step2Subtitle")} />
      <div className="grid grid-cols-4 gap-[7px]">
        {dates.map((d) => {
          const value = ymd(d);
          const primary = value === datePrimary;
          const alt = value === dateAlt;
          return (
            <button
              key={value}
              type="button"
              onClick={() => tapDate(value)}
              className={`rounded-[11px] py-2.5 text-center transition ${
                primary
                  ? "bg-brand text-white"
                  : alt
                    ? "border-[1.5px] border-dashed border-brand text-brand"
                    : "border border-line text-ink"
              }`}
            >
              <div className={`text-[10.5px] font-bold ${primary ? "opacity-80" : "text-faint"}`}>
                {d.toLocaleDateString(language, { weekday: "short" }).toUpperCase()}
              </div>
              <div className="text-[15px] font-extrabold">{d.getDate()}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] text-faint">{t("broadcast.dateLegend")}</div>

      <div className="mt-[18px]">
        <FieldLabel>{t("broadcast.kickoff")}</FieldLabel>
        <div className="flex flex-wrap gap-[7px]">
          {KICKOFF_PRESETS.map((time) => (
            <button
              key={time}
              type="button"
              onClick={() => {
                setKickoff(time);
                setCustomTime(false);
              }}
              className={`rounded-btn px-[13px] py-2 text-[12.5px] transition ${
                kickoff === time && !customTime
                  ? "bg-brand font-extrabold text-white"
                  : "border border-line font-semibold text-muted"
              }`}
            >
              {time}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomTime(true)}
            className={`rounded-btn border border-dashed px-[13px] py-2 text-[12.5px] font-semibold transition ${
              customTime ? "border-brand text-brand" : "border-faint text-muted"
            }`}
          >
            {t("broadcast.custom")}
          </button>
          {customTime && (
            <input
              type="time"
              value={kickoff}
              onChange={(e) => setKickoff(e.target.value)}
              className="field !w-auto !py-1.5 !text-[12.5px]"
            />
          )}
        </div>
      </div>

      <div className="mt-[18px] flex items-center gap-[11px] rounded-tile bg-chip/60 px-3.5 py-3">
        <button
          type="button"
          role="switch"
          aria-checked={timeOpen}
          onClick={() => setTimeOpen(!timeOpen)}
          className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
            timeOpen ? "bg-brand" : "bg-line"
          }`}
        >
          <span
            className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white transition-[inset-inline-start] ${
              timeOpen ? "start-[18px]" : "start-[2px]"
            }`}
          />
        </button>
        <span className="text-[12.5px] text-ink-2">{t("broadcast.timeNegotiable")}</span>
      </div>
    </>
  );
}

// --- step 3: pitch & booking --------------------------------------------------

function StepPitch({
  pitches,
  teamId,
  pitchId,
  pitchOpen,
  selectPitch,
  chooseOpen,
  bookingMode,
  setBookingMode,
  selectedPitch,
  datePrimary,
  kickoff,
  language,
  error,
}: {
  pitches: Pitch[];
  teamId: string;
  pitchId: string | null;
  pitchOpen: boolean;
  selectPitch: (id: string) => void;
  chooseOpen: () => void;
  bookingMode: BookingMode;
  setBookingMode: (m: BookingMode) => void;
  selectedPitch: Pitch | null;
  datePrimary: string;
  kickoff: string;
  language: string;
  error: string | null;
}) {
  const { t } = useTranslation();
  const total = selectedPitch?.price_per_hour != null ? selectedPitch.price_per_hour * BILLED_HOURS : null;

  return (
    <>
      <Title
        title={t("broadcast.step3Title")}
        subtitle={t("broadcast.step3Subtitle", {
          time: kickoff,
          date: datePrimary
            ? new Date(`${datePrimary}T${kickoff}`).toLocaleDateString(language, SHORT_DATE)
            : "",
        })}
      />

      <div className="mb-[18px] flex flex-col gap-2">
        {pitches.slice(0, MAX_PITCH_OPTIONS).map((p) => {
          const selected = p.id === pitchId;
          const home = p.team_id === teamId;
          const meta = [
            p.district,
            p.distance_km != null ? t("broadcast.kmAway", { km: p.distance_km }) : null,
            p.price_per_hour != null ? t("broadcast.pricePerHour", { price: p.price_per_hour }) : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => selectPitch(p.id)}
              className={`flex items-center gap-[11px] rounded-tile px-[13px] py-3 text-start transition ${
                selected ? "border-[1.5px] border-brand bg-brand-tint/40" : "border border-line"
              }`}
            >
              <span className="text-[16px] leading-none">📍</span>
              <span className="min-w-0 flex-1">
                <span
                  className={`block truncate text-[13.5px] ${selected ? "font-extrabold" : "font-bold"} text-ink`}
                >
                  {p.name}
                </span>
                <span className={`block text-[11px] ${selected ? "text-brand-deep" : "text-muted"}`}>
                  {meta}
                </span>
              </span>
              {home && (
                <span className="shrink-0 rounded-full bg-brand-tint px-2 py-1 text-[10.5px] font-extrabold text-brand-deep">
                  {t("broadcast.home")}
                </span>
              )}
            </button>
          );
        })}

        {/* Escape hatch — publishes with pitch = OPEN and no venue at all. */}
        <button
          type="button"
          onClick={chooseOpen}
          className={`flex items-center gap-[11px] rounded-tile border border-dashed px-[13px] py-3 text-start transition ${
            pitchOpen ? "border-brand bg-brand-tint/40" : "border-line"
          }`}
        >
          <span className="text-[16px] leading-none">🤝</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-bold text-ink">{t("broadcast.opponentChooses")}</span>
            <span className="block text-[11px] text-muted">{t("broadcast.pitchStaysOpen")}</span>
          </span>
        </button>
      </div>

      <FieldLabel>{t("broadcast.whoBooks")}</FieldLabel>
      <div className="flex rounded-[11px] bg-chip p-[3px]">
        {BOOKING_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => setBookingMode(mode)}
            className={`flex-1 rounded-[9px] py-[9px] text-center text-[12.5px] transition ${
              bookingMode === mode
                ? "bg-surface font-extrabold text-ink shadow-[0_1px_3px_rgba(0,0,0,.08)]"
                : "font-semibold text-muted"
            }`}
          >
            {t(`broadcast.booking.${mode}`)}
          </button>
        ))}
      </div>

      {/* Only shown when there's a real rate behind it — the seeded directory has no prices. */}
      {total != null && bookingMode !== "you_book" && (
        <div className="mt-[18px] flex items-start gap-2.5 rounded-[11px] border border-warn-border bg-warn-bg px-[13px] py-[11px]">
          <span className="text-[14px] leading-none">💳</span>
          <span className="text-[11.5px] text-warn-text">
            {bookingMode === "split_cost"
              ? t("broadcast.costSplit", { total, half: Math.round(total / 2) })
              : t("broadcast.costFull", { total })}
          </span>
        </div>
      )}

      {error && (
        <div className="mt-[18px] rounded-[11px] border border-danger-border bg-danger-bg px-[13px] py-[11px] text-[11.5px] text-danger-text">
          {error}
        </div>
      )}
    </>
  );
}

// --- 2d: broadcast live -------------------------------------------------------

function LiveState({
  search,
  team,
  format,
  pitch,
  dateAlt,
  kickoff,
  bookingMode,
  termFlags,
  responses,
  teamName,
  onEdit,
  onDone,
}: {
  search: OpponentSearch;
  team: Team;
  format: GameType | null;
  pitch: Pitch | null;
  dateAlt: string | null;
  kickoff: string;
  bookingMode: BookingMode;
  termFlags: Record<string, TermFlag>;
  responses: OpponentApplication[];
  teamName: (id: string) => string;
  onEdit: () => void;
  onDone: () => void;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const dateLabel = new Date(search.date).toLocaleDateString(language, SHORT_DATE);

  const terms: { icon: string; value: string; extra?: string; flag: TermFlag }[] = [
    {
      icon: SPORT_EMOJI[team.sport],
      value: `${SPORT_LABEL[team.sport]} ${format?.label ?? ""}`,
      flag: termFlags.sport,
    },
    {
      icon: "📅",
      value: dateLabel,
      extra: dateAlt
        ? t("broadcast.orAlternate", {
            date: new Date(`${dateAlt}T${kickoff}`).toLocaleDateString(language, SHORT_DATE),
          })
        : undefined,
      flag: termFlags.date,
    },
    { icon: "⏰", value: kickoff, flag: termFlags.time },
    {
      icon: "📍",
      value: pitch?.name ?? t("broadcast.opponentChooses"),
      flag: termFlags.pitch,
    },
    { icon: "💳", value: t(`broadcast.booking.${bookingMode}`), flag: termFlags.booking },
  ];

  return (
    <>
      <div className="bg-gradient-to-br from-brand to-brand-deep px-5 pb-5 pt-6 text-center text-white">
        <div className="mx-auto mb-3 flex h-[46px] w-[46px] items-center justify-center rounded-full bg-white/20 text-[22px]">
          📡
        </div>
        <div className="text-[18px] font-extrabold">{t("broadcast.liveTitle")}</div>
        {/* The design's "Sent to 14 teams within 10 km at level 6–8" needs a team geo index and a
            level system, neither of which exists. This says what actually happened instead. */}
        <div className="text-[12.5px] opacity-85">
          {t("broadcast.liveSubtitle", {
            sport: SPORT_LABEL[team.sport],
            city: search.city,
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <FieldLabel>{t("broadcast.yourTerms")}</FieldLabel>
        <div className="flex flex-col gap-[9px]">
          {terms.map((term) => (
            <div key={term.icon} className="flex items-center gap-2">
              <span className="w-[18px] shrink-0 text-[14px] leading-none">{term.icon}</span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold text-ink">
                {term.value}
                {term.extra && <span className="font-normal text-faint"> {term.extra}</span>}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-[3px] text-[10.5px] font-extrabold ${
                  term.flag === "fixed"
                    ? "bg-brand-tint text-brand-deep"
                    : "bg-warn-chip text-warn-text"
                }`}
              >
                {t(`broadcast.flag.${term.flag}`)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-[15px] border-t border-line-2 pt-[15px]">
          <FieldLabel>{t("broadcast.firstResponses")}</FieldLabel>
          {responses.length === 0 ? (
            <div className="rounded-[11px] border border-dashed border-line px-3 py-4 text-center text-[11.5px] text-muted">
              {t("broadcast.noResponsesYet")}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {responses.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2.5 rounded-[11px] border border-line px-3 py-2.5"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-chip text-[11px] font-extrabold text-chip-ink">
                    {initials(teamName(r.responding_team_id))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-bold text-ink">
                      {teamName(r.responding_team_id)}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {t(`broadcast.responseStatus.${r.status}`, { defaultValue: r.status })}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2.5 border-t border-line-2 p-5">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 rounded-tile border border-line bg-surface py-[13px] text-[13.5px] font-bold text-ink-2"
        >
          {t("broadcast.editTerms")}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-tile bg-brand py-[13px] text-[13.5px] font-extrabold text-white"
        >
          {t("broadcast.done")}
        </button>
      </div>
    </>
  );
}

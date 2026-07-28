import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../api/client";
import { SPORTS, type Gender, type Match, type Sport, type User } from "../api/types";
import {
  Button,
  Card,
  Empty,
  Label,
  RatingDots,
  SPORT_LABEL,
  SectionLabel,
  SportDot,
  initials,
} from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
import { ATHLETIC_TRAITS, COUNTRIES, type AthleticTraitKey } from "../lib/profile";
import { useMyTeams } from "../lib/useMyTeams";

function Stat({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div className="flex-1 border-r border-line-2 px-4 py-3.5 text-center last:border-r-0">
      <div className={`text-xl font-bold ${tone ?? ""}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-muted">{label}</div>
    </div>
  );
}

export function ProfilePage() {
  const { user: acting, refresh } = useActingUser();
  const { run } = useToast();
  const { teams } = useMyTeams(acting);
  const { t } = useTranslation();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [favoriteSports, setFavoriteSports] = useState<Sport[]>([]);
  const [ratings, setRatings] = useState<Record<AthleticTraitKey, number | null>>({
    speed_rating: null,
    strength_rating: null,
    stamina_rating: null,
    agility_rating: null,
  });
  const [matchCount, setMatchCount] = useState<number | null>(null);

  useEffect(() => {
    setName(acting?.name ?? "");
    setEmail(acting?.email ?? "");
    setNickname(acting?.nickname ?? "");
    setAge(acting?.age?.toString() ?? "");
    setGender(acting?.gender ?? "");
    setCountry(acting?.country ?? "");
    setCity(acting?.city ?? "");
    setFavoriteSports(acting?.favorite_sports ?? []);
    setRatings({
      speed_rating: acting?.speed_rating ?? null,
      strength_rating: acting?.strength_rating ?? null,
      stamina_rating: acting?.stamina_rating ?? null,
      agility_rating: acting?.agility_rating ?? null,
    });
  }, [acting]);

  const toggleFavoriteSport = (s: Sport) =>
    setFavoriteSports((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const loadMatches = useCallback(async () => {
    if (!acting || teams.length === 0) return setMatchCount(teams.length === 0 ? 0 : null);
    const lists = await Promise.all(
      teams.map(({ team }) =>
        api.get<Match[]>(`/teams/${team.id}/matches`).catch(() => [] as Match[]),
      ),
    );
    const ids = new Set(lists.flat().map((m) => m.id));
    setMatchCount(ids.size);
  }, [acting, teams]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  if (!acting) {
    // Unreachable via normal navigation — AppShell only renders this page once a user is
    // resolved — but kept as a defensive fallback for the dev "act as" switcher's edge cases.
    return (
      <>
        <h1 className="mb-1 text-[26px] font-bold">{t("profile.title")}</h1>
        <p className="mb-7 text-sm text-muted">
          {t("profile.nobodySelected")}
          {import.meta.env.DEV && t("profile.orCreateBelow")}.
        </p>
        {import.meta.env.DEV && <CreateUser />}
      </>
    );
  }

  const sports = Array.from(new Set(teams.map((t) => t.team.sport))) as Sport[];
  const joined = new Date(acting.created_at).getFullYear();

  return (
    <>
      <Card className="overflow-hidden rounded-panel">
        <div className="h-[88px] bg-stripe-lg" />
        <div className="-mt-8 px-[26px] pb-[26px]">
          <div className="flex items-end gap-4">
            <div className="flex h-20 w-20 flex-none items-center justify-center rounded-full border-4 border-white bg-line text-[27px] font-bold text-[#3a3a3a] shadow-pin">
              {initials(acting.name)}
            </div>
            <div className="flex-1 pb-1.5">
              <div className="flex items-center gap-2.5">
                <div className="text-[21px] font-bold tracking-[-.01em]">{acting.name}</div>
                {acting.phone_verified ? (
                  <span className="rounded-full bg-brand-tint px-2.5 py-[3px] text-[11px] font-bold text-brand-deep">
                    {t("profile.verified")}
                  </span>
                ) : (
                  <span className="rounded-full bg-chip-2 px-2.5 py-[3px] text-[11px] font-bold text-chip-ink-2">
                    {t("profile.unverified")}
                  </span>
                )}
              </div>
              <div className="mt-1 text-[12.5px] text-muted">
                {t("profile.onKickoffSince", { year: Number.isNaN(joined) ? "—" : joined })}
              </div>
            </div>
          </div>

          {sports.length > 0 && (
            <div className="mb-[18px] mt-4 flex gap-1.5">
              {sports.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-[5px] text-[11.5px] font-semibold"
                >
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-brand text-[8px] font-bold text-white">
                    {SPORT_LABEL[s][0]}
                  </span>
                  {SPORT_LABEL[s]}
                </span>
              ))}
            </div>
          )}

          <div className="mb-[22px] mt-4 flex overflow-hidden rounded-tile border border-line-2">
            <Stat value="—" label={t("profile.rating")} />
            <Stat value={matchCount === null ? "…" : String(matchCount)} label={t("profile.matches")} />
            <Stat value={String(teams.length)} label={t("profile.teams")} />
            <Stat value="—" label={t("profile.strikes")} />
          </div>

          <div className="flex flex-col gap-5 md:flex-row">
            <div className="flex-1">
              <SectionLabel>{t("profile.account")}</SectionLabel>
              <Label>{t("profile.name")}</Label>
              <input
                className="field mb-3 w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Label>
                {t("profile.phone")} <span className="font-normal text-faint">{t("profile.phoneCannotChange")}</span>
              </Label>
              <div className="mb-3 w-full rounded-lg border border-line bg-[#fafafa] px-3 py-2.5 text-[12.5px] text-muted">
                {acting.phone}
              </div>
              <Label>{t("profile.email")}</Label>
              <input
                className="field mb-6 w-full"
                placeholder={t("common.none")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <SectionLabel>{t("profile.profileSection")}</SectionLabel>
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("profile.nickname")}</Label>
                  <input
                    className="field w-full"
                    placeholder={t("common.none")}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("profile.age")}</Label>
                  <input
                    className="field w-full"
                    type="number"
                    min={13}
                    max={100}
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t("profile.gender")}</Label>
                  <select
                    className="field w-full"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender | "")}
                  >
                    <option value="">{t("common.none")}</option>
                    <option value="male">{t("gender.male")}</option>
                    <option value="female">{t("gender.female")}</option>
                  </select>
                </div>
                <div>
                  <Label>{t("profile.country")}</Label>
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
                  <Label>{t("profile.city")}</Label>
                  <input
                    className="field w-full"
                    placeholder={t("common.none")}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <Label>{t("profile.favoriteSports")}</Label>
              <div className="mb-5 mt-1.5 flex flex-wrap gap-2">
                {SPORTS.map((s) => {
                  const selected = favoriteSports.includes(s);
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleFavoriteSport(s)}
                      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
                        selected
                          ? "border-brand bg-brand-tint text-brand-deep"
                          : "border-line bg-white text-muted hover:bg-canvas"
                      }`}
                    >
                      <SportDot sport={s} size={16} />
                      {SPORT_LABEL[s]}
                    </button>
                  );
                })}
              </div>

              <Label>{t("profile.athleticProfile")}</Label>
              <div className="mb-6 mt-2 flex flex-col gap-2.5">
                {ATHLETIC_TRAITS.map((t) => (
                  <div key={t.key} className="flex items-center justify-between gap-3">
                    <span className="text-[12.5px] text-ink-2">{t.label}</span>
                    <RatingDots
                      value={ratings[t.key]}
                      onChange={(n) => setRatings((prev) => ({ ...prev, [t.key]: n }))}
                    />
                  </div>
                ))}
              </div>

              <Button
                disabled={!name}
                onClick={() =>
                  run(
                    () =>
                      api.patch(`/users/me`, {
                        name,
                        email: email || null,
                        nickname: nickname || null,
                        age: age ? Number(age) : null,
                        gender: gender || null,
                        country,
                        city: city || null,
                        favorite_sports: favoriteSports,
                        ...ratings,
                      }),
                    t("profile.profileUpdated"),
                  ).then(refresh)
                }
              >
                {t("profile.saveChanges")}
              </Button>
              <p className="mt-3 text-[11.5px] leading-snug text-faint">
                {t("profile.phoneReadOnlyNote")}
              </p>
            </div>

            <div className="w-full flex-none md:w-64">
              <SectionLabel>
                {t("profile.reputation")}{" "}
                <span className="font-normal normal-case tracking-normal text-faint">
                  {t("profile.notBuiltYet")}
                </span>
              </SectionLabel>
              <Card className="rounded-card p-4">
                <p className="text-[12.5px] leading-relaxed text-muted">{t("profile.reputationNote")}</p>
                <div className="mt-4 flex flex-col gap-2.5">
                  {[t("profile.punctuality"), t("profile.sportsmanship"), t("profile.communication")].map(
                    (k) => (
                    <div key={k}>
                      <div className="mb-1 flex justify-between text-[11px] font-semibold">
                        <span>{k}</span>
                        <span className="text-faint">—</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded bg-line-2" />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </Card>

      {import.meta.env.DEV && (
        <div className="mt-10">
          <CreateUser />
        </div>
      )}
    </>
  );
}

/**
 * Signup normally follows Firebase phone verification; the stubbed backend creates the profile
 * directly. Kept on this page so the console can still bootstrap users to act as.
 */
function CreateUser() {
  const { actAs } = useActingUser();
  const { run } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const create = () =>
    run(async () => {
      const created = await api.post<User>("/users", { name, phone, email: email || null });
      setName("");
      setPhone("");
      setEmail("");
      setOpen(false);
      actAs(created); // start impersonating the new (credential-less) user
    }, t("profile.userCreated"));

  return (
    <>
      <SectionLabel>{t("profile.addUser")}</SectionLabel>
      {!open ? (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          {t("profile.createUser")}
        </Button>
      ) : (
        <Card className="flex flex-wrap items-end gap-2.5 p-4">
          <div>
            <Label>{t("profile.name")}</Label>
            <input
              className="field w-[160px]"
              autoFocus
              placeholder="Alice"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("profile.phoneUnique")}</Label>
            <input
              className="field w-[170px]"
              placeholder="+15555550100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("profile.emailOptional")}</Label>
            <input
              className="field w-[200px]"
              placeholder="alice@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button onClick={create} disabled={!name || !phone}>
            {t("profile.create")}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t("profile.cancel")}
          </Button>
        </Card>
      )}
      <p className="mt-2.5 text-[11.5px] text-faint">{t("profile.createUserNote")}</p>
    </>
  );
}

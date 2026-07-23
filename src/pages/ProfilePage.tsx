import { useCallback, useEffect, useState } from "react";

import { api } from "../api/client";
import type { Match, Sport, User } from "../api/types";
import {
  Button,
  Card,
  Empty,
  Label,
  SPORT_LABEL,
  SectionLabel,
  initials,
} from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";
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

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [matchCount, setMatchCount] = useState<number | null>(null);

  useEffect(() => {
    setName(acting?.name ?? "");
    setEmail(acting?.email ?? "");
  }, [acting?.id, acting?.name, acting?.email]);

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
    return (
      <>
        <h1 className="mb-1 text-[26px] font-bold">Profile</h1>
        <p className="mb-7 text-sm text-muted">
          Nobody selected — pick a user from the chip in the top right, or create one below.
        </p>
        <CreateUser />
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
                    ✓ Verified
                  </span>
                ) : (
                  <span className="rounded-full bg-chip-2 px-2.5 py-[3px] text-[11px] font-bold text-chip-ink-2">
                    Unverified
                  </span>
                )}
              </div>
              <div className="mt-1 text-[12.5px] text-muted">
                on Kickoff since {Number.isNaN(joined) ? "—" : joined}
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
            <Stat value="—" label="Rating" />
            <Stat value={matchCount === null ? "…" : String(matchCount)} label="Matches" />
            <Stat value={String(teams.length)} label="Teams" />
            <Stat value="—" label="Strikes" />
          </div>

          <div className="flex flex-col gap-5 md:flex-row">
            <div className="flex-1">
              <SectionLabel>Account</SectionLabel>
              <Label>Name</Label>
              <input
                className="field mb-3 w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <Label>
                Phone <span className="font-normal text-faint">· can't be changed</span>
              </Label>
              <div className="mb-3 w-full rounded-lg border border-line bg-[#fafafa] px-3 py-2.5 text-[12.5px] text-muted">
                {acting.phone}
              </div>
              <Label>Email</Label>
              <input
                className="field mb-4 w-full"
                placeholder="(none)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button
                disabled={!name}
                onClick={() =>
                  run(
                    () => api.patch(`/users/me`, { name, email: email || null }),
                    "Profile updated",
                  ).then(refresh)
                }
              >
                Save changes
              </Button>
              <p className="mt-3 text-[11.5px] leading-snug text-faint">
                Phone is set at signup and is the Firebase-verified identity, so it's read-only here.
              </p>
            </div>

            <div className="w-full flex-none md:w-64">
              <SectionLabel>
                Reputation{" "}
                <span className="font-normal normal-case tracking-normal text-faint">
                  · not built yet
                </span>
              </SectionLabel>
              <Card className="rounded-card p-4">
                <p className="text-[12.5px] leading-relaxed text-muted">
                  The design shows a rating breakdown across punctuality, sportsmanship and
                  communication. Nothing backs it yet — there are no rating, review or strike fields
                  on the API — so these are left blank rather than filled with sample numbers.
                </p>
                <div className="mt-4 flex flex-col gap-2.5">
                  {["Punctuality", "Sportsmanship", "Communication"].map((k) => (
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

      <div className="mt-10">
        <CreateUser />
      </div>
    </>
  );
}

/**
 * Signup normally follows Firebase phone verification; the stubbed backend creates the profile
 * directly. Kept on this page so the console can still bootstrap users to act as.
 */
function CreateUser() {
  const { setUser } = useActingUser();
  const { run } = useToast();
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
      setUser(created); // start acting as the new user
    }, "User created");

  return (
    <>
      <SectionLabel>Add a user</SectionLabel>
      {!open ? (
        <Button variant="ghost" onClick={() => setOpen(true)}>
          + Create a user
        </Button>
      ) : (
        <Card className="flex flex-wrap items-end gap-2.5 p-4">
          <div>
            <Label>Name</Label>
            <input
              className="field w-[160px]"
              autoFocus
              placeholder="Alice"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <Label>Phone (unique)</Label>
            <input
              className="field w-[170px]"
              placeholder="+15555550100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <Label>Email (optional)</Label>
            <input
              className="field w-[200px]"
              placeholder="alice@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button onClick={create} disabled={!name || !phone}>
            Create
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </Card>
      )}
      <p className="mt-2.5 text-[11.5px] text-faint">
        The new user becomes the one you're acting as. Phone stays unverified until Firebase is
        wired up.
      </p>
    </>
  );
}

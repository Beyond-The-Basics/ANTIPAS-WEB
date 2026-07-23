import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { User } from "../api/types";
import { useActingUser } from "../context/ActingUser";
import { Avatar } from "./ui";

const NAV = [
  { to: "/home", label: "Home" },
  { to: "/discover", label: "Discover" },
  { to: "/teams", label: "Teams" },
  { to: "/availability", label: "Availability" },
];

function Nav({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-field px-3 py-2.5 text-[13.5px] font-semibold no-underline ${
          isActive ? "bg-chip text-ink" : "text-[#6b6a60] hover:text-ink"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

/**
 * The design's profile chip assumes a signed-in user. There is no auth yet — `api/client.ts` sends
 * an `X-User-Id` stub — so the chip doubles as the "act as" switcher: it shows who you are, and
 * opens a picker to become someone else.
 */
function ProfileChip() {
  const { user, setUser } = useActingUser();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadUsers = () => {
    api
      .get<User[]>("/users")
      .then(setUsers)
      .catch(() => setUsers([]));
  };

  useEffect(loadUsers, []);
  // Re-read the roster whenever the acting user changes (a new user may have just been created).
  useEffect(loadUsers, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative ml-auto" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full border border-line bg-white py-1 pl-1 pr-2.5"
      >
        {user ? (
          <Avatar name={user.name} />
        ) : (
          <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-line text-xs font-bold text-[#3a3a3a]">
            ?
          </div>
        )}
        <span className="text-[13px] font-semibold">
          {user ? user.name.split(" ")[0] : "Sign in"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-tile border border-line bg-white py-1.5 shadow-float">
          {user && (
            <button
              onClick={() => {
                setOpen(false);
                navigate("/profile");
              }}
              className="w-full px-4 py-2 text-left text-[13px] font-semibold hover:bg-canvas"
            >
              View profile
            </button>
          )}
          <div className="my-1.5 border-t border-line-2" />
          <div className="px-4 pb-1 text-[11px] font-bold uppercase tracking-[.05em] text-faint">
            Act as
          </div>
          <div className="max-h-64 overflow-y-auto">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  setUser(u);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-[13px] hover:bg-canvas ${
                  u.id === user?.id ? "font-bold text-brand-deep" : ""
                }`}
              >
                <Avatar name={u.name} size={24} />
                <span className="min-w-0 flex-1 truncate">{u.name}</span>
              </button>
            ))}
            {users.length === 0 && (
              <div className="px-4 py-2 text-[12.5px] text-faint">No users yet.</div>
            )}
          </div>
          {user && (
            <>
              <div className="my-1.5 border-t border-line-2" />
              <button
                onClick={() => {
                  setUser(null);
                  setOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-[13px] text-muted hover:bg-canvas"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex h-[62px] max-w-[1100px] items-center gap-6 px-6">
          <NavLink to="/home" className="flex flex-none items-center gap-2.5 no-underline">
            <div className="h-[30px] w-[30px] flex-none rounded-lg bg-brand" />
            <span className="text-lg font-bold tracking-[-0.01em] text-ink">Kickoff</span>
          </NavLink>
          <nav className="flex gap-0.5">
            {NAV.map((n) => (
              <Nav key={n.to} {...n} />
            ))}
          </nav>
          <ProfileChip />
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-6 pb-16 pt-10">{children}</main>
    </div>
  );
}

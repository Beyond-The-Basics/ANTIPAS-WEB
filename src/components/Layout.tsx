import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";

import { api } from "../api/client";
import type { User } from "../api/types";
import { useActingUser } from "../context/ActingUser";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./ui";

const NAV = [
  { to: "/home", labelKey: "nav.home" },
  { to: "/discover", labelKey: "nav.discover" },
  { to: "/teams", labelKey: "nav.teams" },
  { to: "/availability", labelKey: "nav.availability" },
];

function Nav({ to, labelKey }: { to: string; labelKey: string }) {
  const { t } = useTranslation();
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-field px-3 py-2.5 text-[13.5px] font-semibold no-underline ${
          isActive ? "bg-chip text-ink" : "text-muted hover:text-ink"
        }`
      }
    >
      {t(labelKey)}
    </NavLink>
  );
}

/**
 * Shows who you're signed in as and opens the account menu.
 *
 * In dev it also carries the "act as" switcher, which impersonates any user through the backend's
 * non-production `X-User-Id` fallback. That list is gated on `import.meta.env.DEV` so a production
 * build never ships a one-click impersonate-anyone control.
 */
function ProfileChip() {
  const { user, isAuthenticated, actAs, logout } = useActingUser();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const loadUsers = () => {
    if (!import.meta.env.DEV) return;
    api
      .get<User[]>("/users")
      .then(setUsers)
      .catch(() => setUsers([]));
  };

  useEffect(loadUsers, []);
  // Re-read the roster whenever the acting user changes (a new user may have just been created).
  useEffect(loadUsers, [user?.id]);

  const signOut = () => {
    setOpen(false);
    logout();
    navigate("/");
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full border border-line bg-surface py-1 ps-1 pe-2.5"
      >
        {user ? (
          <Avatar name={user.name} />
        ) : (
          <div className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-line text-xs font-bold text-ink-2">
            ?
          </div>
        )}
        <span className="text-[13px] font-semibold">
          {user ? user.name.split(" ")[0] : t("layout.signIn")}
        </span>
      </button>

      {open && (
        <div className="absolute end-0 z-30 mt-2 w-64 rounded-tile border border-line bg-surface py-1.5 shadow-float">
          {user && (
            <button
              onClick={() => {
                setOpen(false);
                navigate("/profile");
              }}
              className="w-full px-4 py-2 text-start text-[13px] font-semibold hover:bg-canvas"
            >
              {t("layout.viewProfile")}
            </button>
          )}
          {import.meta.env.DEV && (
            <>
              <div className="my-1.5 border-t border-line-2" />
              <div className="px-4 pb-1 text-[11px] font-bold uppercase tracking-[.05em] text-faint">
                {t("layout.actAs")} <span className="font-medium normal-case">{t("layout.devOnly")}</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      actAs(u);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-4 py-2 text-start text-[13px] hover:bg-canvas ${
                      u.id === user?.id ? "font-bold text-brand-deep" : ""
                    }`}
                  >
                    <Avatar name={u.name} size={24} />
                    <span className="min-w-0 flex-1 truncate">{u.name}</span>
                  </button>
                ))}
                {users.length === 0 && (
                  <div className="px-4 py-2 text-[12.5px] text-faint">{t("layout.noUsers")}</div>
                )}
              </div>
            </>
          )}
          {user && (
            <>
              <div className="my-1.5 border-t border-line-2" />
              <button
                onClick={signOut}
                className="w-full px-4 py-2 text-start text-[13px] text-muted hover:bg-canvas"
              >
                {isAuthenticated ? t("layout.signOut") : t("layout.stopActingAs")}
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
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex h-[62px] max-w-[1100px] items-center gap-6 px-6">
          <NavLink to="/home" className="flex flex-none items-center gap-2.5 no-underline">
            <img src="/logo-icon.png" alt="" className="h-[30px] w-[30px] flex-none" />
            <span className="text-lg font-extrabold tracking-[-0.01em] text-ink">Kickoff</span>
          </NavLink>
          <nav className="flex gap-0.5">
            {NAV.map((n) => (
              <Nav key={n.to} {...n} />
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-3">
            <ThemeToggle />
            <LanguageSwitcher />
            <ProfileChip />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-6 pb-16 pt-10">{children}</main>
    </div>
  );
}

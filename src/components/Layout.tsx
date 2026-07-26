import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

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
 * Shows who you're signed in as and opens the account menu.
 *
 * In dev it also carries the "act as" switcher, which impersonates any user through the backend's
 * non-production `X-User-Id` fallback. That list is gated on `import.meta.env.DEV` so a production
 * build never ships a one-click impersonate-anyone control.
 */
function ProfileChip() {
  const { user, isAuthenticated, actAs, logout } = useActingUser();
  const navigate = useNavigate();
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
          {import.meta.env.DEV && (
            <>
              <div className="my-1.5 border-t border-line-2" />
              <div className="px-4 pb-1 text-[11px] font-bold uppercase tracking-[.05em] text-faint">
                Act as <span className="font-medium normal-case">(dev only)</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      actAs(u);
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
            </>
          )}
          {user && (
            <>
              <div className="my-1.5 border-t border-line-2" />
              <button
                onClick={signOut}
                className="w-full px-4 py-2 text-left text-[13px] text-muted hover:bg-canvas"
              >
                {isAuthenticated ? "Sign out" : "Stop acting as"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close the mobile menu whenever the route changes.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="mx-auto flex h-[62px] max-w-[1100px] items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <NavLink to="/home" className="flex flex-none items-center gap-2.5 no-underline">
            <img src="/logo-icon.png" alt="" className="h-[30px] w-[30px] flex-none" />
            <span className="text-lg font-extrabold tracking-[-0.01em] text-ink">Kickoff</span>
          </NavLink>
          {/* Desktop nav */}
          <nav className="hidden gap-0.5 md:flex">
            {NAV.map((n) => (
              <Nav key={n.to} {...n} />
            ))}
          </nav>
          <ProfileChip />
          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-9 w-9 flex-none items-center justify-center rounded-field border border-line text-ink md:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
        {/* Mobile nav sheet */}
        {menuOpen && (
          <nav className="flex flex-col gap-1 border-t border-line bg-white px-4 py-3 md:hidden">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `rounded-field px-3 py-2.5 text-sm font-semibold no-underline ${
                    isActive ? "bg-chip text-ink" : "text-[#6b6a60] hover:text-ink"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">{children}</main>
    </div>
  );
}

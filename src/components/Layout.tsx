import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

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

/** The dev-only impersonation directory, shared by the desktop menu and the mobile drawer so the
 * "act as" list stays available at every viewport. Gated on `import.meta.env.DEV`, so a production
 * build never fetches it or ships the control. */
function useImpersonationUsers(userId?: string): User[] {
  const [users, setUsers] = useState<User[]>([]);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    api
      .get<User[]>("/users")
      .then(setUsers)
      .catch(() => setUsers([]));
  }, [userId]);
  return users;
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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
 * Shows who you're signed in as and opens the account menu. Desktop only — below `lg` the same
 * actions live in the drawer.
 *
 * In dev it also carries the "act as" switcher, which impersonates any user through the backend's
 * non-production `X-User-Id` fallback. That list is gated on `import.meta.env.DEV` so a production
 * build never ships a one-click impersonate-anyone control.
 */
function ProfileChip() {
  const { user, isAuthenticated, actAs, logout } = useActingUser();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const users = useImpersonationUsers(user?.id);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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

/**
 * The mobile navigation drawer (below `lg`). Slides in from the end side — right in LTR, left in
 * RTL, via the `rtl:` transform variant — and holds everything the desktop header keeps inline: the
 * nav, appearance/language controls, and the account actions (including the dev "act as" list).
 *
 * Accessibility: `role="dialog"` + `aria-modal`, focus moves in on open, Tab is trapped within the
 * panel, Escape and a backdrop click close it, and body scroll is locked while open.
 */
function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, isAuthenticated, actAs, logout } = useActingUser();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const users = useImpersonationUsers(user?.id);
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while the drawer is open so the page behind it doesn't move under a swipe.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Escape to close, focus in on open, and trap Tab within the panel.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const signOut = () => {
    onClose();
    logout();
    navigate("/");
  };

  return (
    <div className={`fixed inset-0 z-40 lg:hidden ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("layout.menu")}
        className={`absolute inset-y-0 end-0 flex w-[280px] max-w-[85%] flex-col bg-surface shadow-float transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"
        }`}
      >
        <div className="flex h-[62px] flex-none items-center justify-between border-b border-line px-4">
          <span className="text-base font-extrabold tracking-[-0.01em] text-ink">Kickoff</span>
          <button
            data-autofocus
            onClick={onClose}
            aria-label={t("layout.closeMenu")}
            className="rounded-field p-2 text-muted hover:text-ink"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 p-3">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              onClick={onClose}
              className={({ isActive }) =>
                `rounded-field px-3 py-3 text-[15px] font-semibold no-underline ${
                  isActive ? "bg-chip text-ink" : "text-muted hover:text-ink"
                }`
              }
            >
              {t(n.labelKey)}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto border-t border-line p-3">
          <div className="flex items-center justify-between px-1 py-2">
            <span className="text-[13px] font-semibold text-muted">{t("layout.appearance")}</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between px-1 py-2">
            <span className="text-[13px] font-semibold text-muted">{t("layout.language")}</span>
            <LanguageSwitcher />
          </div>

          {user && (
            <button
              onClick={() => {
                onClose();
                navigate("/profile");
              }}
              className="mt-1 w-full rounded-field px-3 py-2.5 text-start text-[13.5px] font-semibold hover:bg-canvas"
            >
              {t("layout.viewProfile")}
            </button>
          )}

          {import.meta.env.DEV && users.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer px-3 py-2 text-[11px] font-bold uppercase tracking-[.05em] text-faint">
                {t("layout.actAs")} <span className="font-medium normal-case">{t("layout.devOnly")}</span>
              </summary>
              <div className="max-h-52 overflow-y-auto">
                {users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      actAs(u);
                      onClose();
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-field px-3 py-2 text-start text-[13px] hover:bg-canvas ${
                      u.id === user?.id ? "font-bold text-brand-deep" : ""
                    }`}
                  >
                    <Avatar name={u.name} size={24} />
                    <span className="min-w-0 flex-1 truncate">{u.name}</span>
                  </button>
                ))}
              </div>
            </details>
          )}

          {user && (
            <button
              onClick={signOut}
              className="mt-1 w-full rounded-field px-3 py-2.5 text-start text-[13.5px] text-muted hover:bg-canvas"
            >
              {isAuthenticated ? t("layout.signOut") : t("layout.stopActingAs")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Close the drawer whenever the route changes, so tapping a nav link both navigates and dismisses.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-20 border-b border-line bg-surface">
        <div className="mx-auto flex h-[62px] max-w-[1100px] items-center gap-4 px-4 sm:px-6 lg:gap-6">
          <NavLink to="/home" className="flex flex-none items-center gap-2.5 no-underline">
            <img src="/logo-icon.png" alt="" className="h-[30px] w-[30px] flex-none" />
            <span className="text-lg font-extrabold tracking-[-0.01em] text-ink">Kickoff</span>
          </NavLink>

          {/* Desktop nav + controls — collapsed into the drawer below lg. */}
          <nav className="hidden gap-0.5 lg:flex">
            {NAV.map((n) => (
              <Nav key={n.to} {...n} />
            ))}
          </nav>
          <div className="ms-auto hidden items-center gap-3 lg:flex">
            <ThemeToggle />
            <LanguageSwitcher />
            <ProfileChip />
          </div>

          {/* Mobile menu trigger. */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label={t("layout.openMenu")}
            aria-expanded={menuOpen}
            className="ms-auto rounded-field p-2 text-ink lg:hidden"
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-6 sm:pt-10">{children}</main>
    </div>
  );
}

import { useEffect, useState } from "react";
import { NavLink, type NavLinkProps } from "react-router-dom";

import { api } from "../api/client";
import type { User } from "../api/types";
import { useActingUser } from "../context/ActingUser";

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? "active" : undefined);

function Nav(props: NavLinkProps) {
  return <NavLink {...props} className={navClass} />;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useActingUser();
  const [users, setUsers] = useState<User[]>([]);

  const loadUsers = () => {
    api
      .get<User[]>("/users")
      .then(setUsers)
      .catch(() => setUsers([]));
  };

  useEffect(loadUsers, []);
  // Re-read the roster whenever the acting user changes (a new user may have just been created).
  useEffect(loadUsers, [user?.id]);

  const onPick = (id: string) => {
    if (!id) return setUser(null);
    const found = users.find((u) => u.id === id);
    if (found) setUser(found);
  };

  return (
    <div className="app">
      <header className="topbar">
        <span className="brand">⚽ Kickoff API Console</span>
        <nav>
          <Nav to="/users">Users</Nav>
          <Nav to="/teams">Teams</Nav>
          <Nav to="/discover">Discover</Nav>
        </nav>
        <span className="spacer" />
        <span className="acting">
          <span>Acting as</span>
          <select value={user?.id ?? ""} onChange={(e) => onPick(e.target.value)}>
            <option value="">— nobody —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.phone})
              </option>
            ))}
          </select>
        </span>
      </header>
      {children}
    </div>
  );
}

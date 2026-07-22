import { useEffect, useState } from "react";

import { api } from "../api/client";
import type { User } from "../api/types";
import { Empty, ShortId } from "../components/ui";
import { useActingUser } from "../context/ActingUser";
import { useToast } from "../context/Toast";

export function UsersPage() {
  const { user: acting, setUser } = useActingUser();
  const { run } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const load = () => {
    void run(async () => setUsers(await api.get<User[]>("/users")));
  };
  useEffect(load, []);

  const create = async () => {
    const ok = await run(async () => {
      const created = await api.post<User>("/users", {
        name,
        phone,
        email: email || null,
      });
      setName("");
      setPhone("");
      setEmail("");
      setUser(created); // start acting as the new user
      load();
    }, "User created");
    if (!ok) return;
  };

  return (
    <>
      <h1>Users</h1>

      <div className="card">
        <h2>Create user</h2>
        <p className="hint">
          Signup normally follows Firebase phone verification; the stubbed backend creates the
          profile directly (phone stays unverified). The new user becomes the acting user.
        </p>
        <div className="row">
          <div>
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alice" />
          </div>
          <div>
            <label>Phone (unique)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+15555550100"
            />
          </div>
          <div>
            <label>Email (optional)</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alice@example.com"
            />
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <button onClick={create} disabled={!name || !phone}>
              Create
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>All users ({users.length})</h2>
        {users.length === 0 ? (
          <Empty>No users yet — create one above.</Empty>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Id</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td className="mono">{u.phone}</td>
                  <td className="muted">{u.email ?? "—"}</td>
                  <td>
                    <ShortId id={u.id} />
                  </td>
                  <td>
                    {acting?.id === u.id ? (
                      <span className="badge captain">acting</span>
                    ) : (
                      <button className="small secondary" onClick={() => setUser(u)}>
                        Act as
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

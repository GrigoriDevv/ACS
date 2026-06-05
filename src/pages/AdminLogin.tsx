import { useState, type FormEvent } from "react";
import type { AdminHook } from "../hooks/useAdmin";

export default function AdminLogin({ login, error }: Pick<AdminHook, "login" | "error">) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [shake, setShake] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = login(user.trim(), pass);
    if (!ok) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPass("");
    }
  }

  return (
    <div className="login-wrapper" style={{ minHeight: "70vh" }}>
      <div
        className="login-card"
        style={{
          textAlign: "left",
          animation: shake ? "shake .4s" : undefined,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div className="login-logo" style={{
            width: 52, height: 52,
            borderRadius: "50%",
            background: "#6e7bff22",
            border: "1px solid #6e7bff44",
            fontSize: 22,
            margin: "0 auto 14px",
          }}>
            🔒
          </div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Login Administrativo</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            Somente a área Admin exige autenticação.<br />
            Estoque, entradas e saídas permanecem liberados.
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Usuário
            </label>
            <input
              className="input"
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="Informe o usuário admin"
              required
              autoFocus
              autoComplete="username"
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Senha
            </label>
            <input
              className="input"
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="alert error" style={{ margin: 0, fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: 4, padding: "10px", fontWeight: 600, fontSize: 14, width: "100%" }}
          >
            Entrar na área Admin
          </button>
        </form>

        <style>{`
          @keyframes shake {
            0%,100% { transform: translateX(0); }
            20%      { transform: translateX(-8px); }
            40%      { transform: translateX(8px); }
            60%      { transform: translateX(-6px); }
            80%      { transform: translateX(6px); }
          }
        `}</style>
      </div>
    </div>
  );
}

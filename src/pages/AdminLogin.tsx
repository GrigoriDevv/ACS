import { useState, type FormEvent } from "react";
import type { AdminHook } from "../hooks/useAdmin";

export default function AdminLogin({ login, error }: Pick<AdminHook, "login" | "error">) {
  const [user, setUser]     = useState("");
  const [pass, setPass]     = useState("");
  const [shake, setShake]   = useState(false);

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
    <div style={{
      minHeight: "60vh", display: "flex", alignItems: "center",
      justifyContent: "center",
    }}>
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "36px 32px",
        width: "100%",
        maxWidth: 380,
        animation: shake ? "shake .4s" : undefined,
      }}>
        {/* Lock icon + title */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52,
            borderRadius: "50%",
            background: "#6e7bff22",
            border: "1px solid #6e7bff44",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, margin: "0 auto 14px",
          }}>
            🔒
          </div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>Área Administrativa</div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
            Acesso restrito a administradores
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Usuário
            </label>
            <input
              type="text"
              value={user}
              onChange={(e) => setUser(e.target.value)}
              placeholder="admin"
              required
              autoFocus
              style={{
                width: "100%", padding: "9px 12px",
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text)", fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Senha
            </label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%", padding: "9px 12px",
                background: "var(--bg)", border: "1px solid var(--border)",
                borderRadius: 8, color: "var(--text)", fontSize: 14,
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "#f8717118", border: "1px solid #f8717133",
              borderRadius: 8, padding: "8px 12px",
              color: "var(--red)", fontSize: 13,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: 4, padding: "10px", fontWeight: 600, fontSize: 14 }}
          >
            Entrar
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

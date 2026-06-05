import { useEffect, useState } from "react";
import type { AdminHook } from "../hooks/useAdmin";
import AdminLogin from "./AdminLogin";
import Funcionarios from "./Funcionarios";
import Financeiro from "./Financeiro";

type AdminTab = "funcionarios" | "financeiro";

const TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: "funcionarios", label: "Funcionários", icon: "👥" },
  { id: "financeiro",   label: "Financeiro",   icon: "💰" },
];

export default function AdminPanel(admin: AdminHook) {
  const [tab, setTab] = useState<AdminTab>("funcionarios");

  useEffect(() => {
    if (admin.authenticated) {
      admin.loadAdminData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin.authenticated]);

  if (!admin.authenticated) {
    return <AdminLogin login={admin.login} error={admin.error} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>Administração</h2>
          <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
            Área restrita — dados sincronizados com o Google Sheets
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12 }}
          onClick={admin.loadAdminData}
          disabled={admin.loading}
        >
          {admin.loading ? "Atualizando..." : "↺ Atualizar"}
        </button>
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, color: "var(--red)" }}
          onClick={admin.logout}
        >
          🔒 Sair
        </button>
      </div>

      {/* Erro */}
      {admin.error && (
        <div className="alert error" style={{ marginBottom: 16 }}>{admin.error}</div>
      )}

      {/* Loading bar */}
      {admin.loading && <div className="loading-bar" />}

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        borderBottom: "1px solid var(--border)", paddingBottom: 0,
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 18px",
              border: "none", borderRadius: "8px 8px 0 0",
              cursor: "pointer", fontFamily: "var(--font)",
              fontSize: 13, fontWeight: 600, transition: "all .12s",
              background: tab === t.id ? "var(--surface)" : "transparent",
              color: tab === t.id ? "var(--accent)" : "var(--text-muted)",
              borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da tab */}
      {tab === "funcionarios" && (
        <Funcionarios
          funcionarios={admin.funcionarios}
          saving={admin.saving}
          registrarFuncionario={admin.registrarFuncionario}
          toggleFuncionarioStatus={admin.toggleFuncionarioStatus}
        />
      )}
      {tab === "financeiro" && (
        <Financeiro
          lancamentos={admin.lancamentos}
          saving={admin.saving}
          totalEntradas={admin.totalEntradas}
          totalSaidas={admin.totalSaidas}
          saldo={admin.saldo}
          registrarLancamento={admin.registrarLancamento}
        />
      )}
    </div>
  );
}

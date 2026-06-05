import { useState } from "react";
import { isConfigured } from "./api/auth";
import { useInventory } from "./hooks/useInventory";
import { useAdmin } from "./hooks/useAdmin";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import MovementForm from "./pages/MovementForm";
import History from "./pages/History";
import NewProduct from "./pages/NewProduct";
import AdminPanel from "./pages/AdminPanel";

type Page = "dashboard" | "products" | "inbound" | "outbound" | "history" | "new-product" | "admin";

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "dashboard",   label: "Dashboard",   icon: "⊞" },
  { id: "products",    label: "Estoque",      icon: "☰" },
  { id: "inbound",     label: "Entrada",      icon: "↓" },
  { id: "outbound",    label: "Saída",        icon: "↑" },
  { id: "history",     label: "Histórico",    icon: "≡" },
  { id: "new-product", label: "Novo Produto", icon: "+" },
];

// ── Tela de configuração incompleta ───────────────────────────────────────────
function NotConfigured() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "var(--bg)", padding: 24,
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "32px 28px", maxWidth: 500, width: "100%",
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
          Configuração necessária
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
          Adicione as variáveis abaixo ao arquivo{" "}
          <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>.env</code>:
        </div>
        <pre style={{
          background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
          padding: 14, fontSize: 12, fontFamily: "monospace",
          color: "var(--text)", lineHeight: 1.8, overflowX: "auto",
        }}>
{`VITE_SA_CLIENT_EMAIL=<email-da-service-account>
VITE_SA_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n...
VITE_SPREADSHEET_ID=<id-da-planilha>`}
        </pre>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 14, lineHeight: 1.7 }}>
          Compartilhe a planilha com o e-mail da Service Account (permissão de Editor).
        </div>
      </div>
    </div>
  );
}

// ── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const inventory = useInventory();
  const admin     = useAdmin();

  if (!isConfigured()) return <NotConfigured />;

  return (
    <div className="layout">
      <nav className="sidebar">
        <div className="sidebar-brand">Estoque</div>

        <div className="sidebar-title">Menu</div>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item${page === item.id ? " active" : ""}`}
            onClick={() => setPage(item.id)}
          >
            <span className="nav-icon" aria-hidden>{item.icon}</span>
            {item.label}
            {item.id === "dashboard" && inventory.alerts.length > 0 && (
              <span className="nav-badge">{inventory.alerts.length}</span>
            )}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <div className="sidebar-title" style={{ marginTop: 8 }}>Área Admin</div>
        <button
          className={`nav-item${page === "admin" ? " active" : ""}`}
          onClick={() => setPage("admin")}
          style={{ color: admin.authenticated ? "var(--accent)" : undefined }}
        >
          <span className="nav-icon">{admin.authenticated ? "🔓" : "🔒"}</span>
          Admin
          {admin.authenticated && (
            <span className="nav-badge" style={{ background: "var(--green)", color: "#000" }}>✓</span>
          )}
        </button>
      </nav>

      <main className="main">
        {inventory.loading && <div className="loading-bar" />}

        {inventory.error && (
          <div className="alert error" style={{ marginBottom: 16 }}>
            {inventory.error}
          </div>
        )}

        {page === "dashboard"   && <Dashboard  {...inventory} />}
        {page === "products"    && <Products   {...inventory} />}
        {page === "inbound"     && (
          <MovementForm tipo="entrada" produtos={inventory.produtos} registerMovement={inventory.registerMovement} />
        )}
        {page === "outbound"    && (
          <MovementForm tipo="saida" produtos={inventory.produtos} registerMovement={inventory.registerMovement} />
        )}
        {page === "history"     && <History    {...inventory} />}
        {page === "new-product" && <NewProduct {...inventory} />}
        {page === "admin"       && <AdminPanel {...admin} />}
      </main>
    </div>
  );
}

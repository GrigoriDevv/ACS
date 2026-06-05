import { useState } from "react";
import { useInventory } from "./hooks/useInventory";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import MovementForm from "./pages/MovementForm";
import History from "./pages/History";
import NewProduct from "./pages/NewProduct";

type Page = "dashboard" | "products" | "inbound" | "outbound" | "history" | "new-product";

const NAV: { id: Page; label: string; icon: string }[] = [
  { id: "dashboard",   label: "Dashboard",   icon: "⊞" },
  { id: "products",    label: "Estoque",      icon: "☰" },
  { id: "inbound",     label: "Entrada",      icon: "↓" },
  { id: "outbound",    label: "Saída",        icon: "↑" },
  { id: "history",     label: "Histórico",    icon: "≡" },
  { id: "new-product", label: "Novo Produto", icon: "+" },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const inventory = useInventory();

  // ── Not configured ─────────────────────────────────────────────────────────
  if (!inventory.configured) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "var(--bg)", padding: 24,
      }}>
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "32px 28px", maxWidth: 480, width: "100%",
        }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
            Configuração necessária
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7 }}>
            Adicione as variáveis abaixo ao arquivo <code style={{ background: "var(--bg)", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>.env</code>:
          </div>
          <pre style={{
            background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 8,
            padding: 14, fontSize: 12, fontFamily: "monospace", marginTop: 14,
            color: "var(--text)", lineHeight: 1.8, overflowX: "auto",
          }}>
{`VITE_SA_CLIENT_EMAIL=gtrigorti@...iam.gserviceaccount.com
VITE_SA_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\\n...
VITE_SPREADSHEET_ID=1OitPAbVG96e89ej...`}
          </pre>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
            Após editar o <code style={{ fontFamily: "monospace" }}>.env</code>, reinicie o servidor com <code style={{ fontFamily: "monospace" }}>npm run dev</code>.
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!inventory.ready && inventory.loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 14,
        background: "var(--bg)",
      }}>
        <div className="loading-bar" />
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
          Conectando ao Google Sheets...
        </div>
      </div>
    );
  }

  // ── Error (e.g. wrong key) ─────────────────────────────────────────────────
  if (!inventory.ready && inventory.error) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        background: "var(--bg)", padding: 24,
      }}>
        <div style={{
          background: "#f8717118", border: "1px solid #f8717144",
          borderRadius: 10, padding: "16px 20px", maxWidth: 460,
          color: "var(--red)", fontSize: 13, lineHeight: 1.6,
        }}>
          <strong>Erro ao conectar:</strong><br />{inventory.error}
        </div>
        <button className="btn btn-secondary" onClick={inventory.loadData}>
          Tentar novamente
        </button>
      </div>
    );
  }

  // ── App ────────────────────────────────────────────────────────────────────
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

        <button className="nav-item" onClick={inventory.logout} style={{ marginTop: 8 }}>
          <span className="nav-icon">↺</span> Recarregar
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
      </main>
    </div>
  );
}

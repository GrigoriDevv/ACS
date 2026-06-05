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

const PAGE_TITLES: Record<Page, string> = {
  dashboard:   "Dashboard",
  products:    "Estoque",
  inbound:     "Entrada",
  outbound:    "Saída",
  history:     "Histórico",
  "new-product": "Novo Produto",
  admin:       "Administração",
};

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const inventory = useInventory();
  const admin     = useAdmin();

  if (!isConfigured()) return <NotConfigured />;

  const goTo = (id: Page) => {
    setPage(id);
    setSidebarOpen(false);
  };

  return (
    <div className="layout">
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <nav className={`sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="sidebar-brand">Estoque</div>

        <div className="sidebar-title">Menu</div>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`nav-item${page === item.id ? " active" : ""}`}
            onClick={() => goTo(item.id)}
          >
            <span className="nav-icon" aria-hidden>{item.icon}</span>
            {item.label}
            {item.id === "dashboard" && inventory.alerts.length > 0 && (
              <span className="nav-badge">{inventory.alerts.length}</span>
            )}
          </button>
        ))}

        <div className="sidebar-title" style={{ marginTop: 12 }}>Área Admin</div>
        <button
          className={`nav-item nav-item-admin${page === "admin" ? " active" : ""}`}
          onClick={() => goTo("admin")}
          title={admin.authenticated ? "Área administrativa" : "Login necessário — área Admin"}
        >
          <span className="nav-icon">{admin.authenticated ? "🔓" : "🔒"}</span>
          Login Admin
          {admin.authenticated ? (
            <span className="nav-badge" style={{ background: "var(--green)", color: "#000" }}>✓</span>
          ) : (
            <span className="nav-badge" style={{ background: "var(--yellow)", color: "#000", fontSize: 10 }}>
              login
            </span>
          )}
        </button>
      </nav>

      <div className="content-shell">
        <header className="topbar">
          <button
            type="button"
            className="btn btn-secondary topbar-menu-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Abrir menu"
          >
            ☰ Menu
          </button>
          <h1 className="topbar-title">{PAGE_TITLES[page]}</h1>
          <button
            type="button"
            className={`btn topbar-admin-btn${page === "admin" ? " btn-primary" : " btn-secondary"}`}
            onClick={() => goTo("admin")}
          >
            {admin.authenticated ? "🔓 Admin" : "🔒 Login Admin"}
          </button>
        </header>

        <main className="main">
        {inventory.loading && <div className="loading-bar" />}

        {inventory.error && page !== "admin" && (
          <div className="alert error" style={{ marginBottom: 16 }}>
            {inventory.error}
          </div>
        )}

        {page === "dashboard"   && <Dashboard  {...inventory} adminAuthenticated={admin.authenticated} />}
        {page === "products"    && <Products   {...inventory} />}
        {page === "inbound"     && (
          <MovementForm tipo="entrada" produtos={inventory.produtos} funcionarios={inventory.funcionarios} registerMovement={inventory.registerMovement} />
        )}
        {page === "outbound"    && (
          <MovementForm tipo="saida" produtos={inventory.produtos} funcionarios={inventory.funcionarios} registerMovement={inventory.registerMovement} />
        )}
        {page === "history"     && <History    {...inventory} />}
        {page === "new-product" && <NewProduct {...inventory} />}
        {page === "admin"       && <AdminPanel {...admin} />}
        </main>
      </div>
    </div>
  );
}

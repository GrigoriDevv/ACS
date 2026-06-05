import { SEED_PRODUCTS } from "../data/seedProducts";
import type { InventoryHook } from "../hooks/useInventory";

export default function Dashboard({
  produtos,
  alerts,
  movimentacoes,
  loadData,
  loading,
  colorizing,
  seeding,
  resetting,
  settingUp,
  sendingEmail,
  emailStatus,
  emailConfigured,
  colorSpreadsheet,
  sendAlertEmail,
  importSeedProducts,
  resetAndSeed,
  setupSheet,
}: InventoryHook) {
  const total   = produtos.filter((p) => p.ativo).length;
  const zerados = produtos.filter((p) => p.ativo && p.estoqueAtual === 0).length;

  const emailStatusIsError = emailStatus?.startsWith("Error");

  const seedCategories = [...new Set(SEED_PRODUCTS.map((p) => p.categoria))];
  const alreadySeeded  = produtos.length > 0;

  return (
    <div>
      {/* ── Cabeçalho ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <h2 style={{ marginBottom: 0, flex: 1 }}>Dashboard</h2>
        <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
          {loading ? "Atualizando..." : "Atualizar dados"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={colorSpreadsheet}
          disabled={colorizing || loading}
          title="Aplica formatação condicional de cores na planilha Google Sheets"
        >
          {colorizing ? "Colorindo..." : "Colorir planilha"}
        </button>
        <button
          className="btn btn-primary"
          onClick={setupSheet}
          disabled={settingUp || loading}
          title="Cria aba Resumo com fórmulas, aplica formatação profissional e adiciona 3 gráficos na planilha"
        >
          {settingUp ? "Configurando planilha..." : "Configurar planilha"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={colorSpreadsheet}
          disabled={colorizing || loading}
          title="Atualiza as cores de alerta de estoque nas abas Produtos e Movimentações"
        >
          {colorizing ? "Colorindo..." : "Colorir alertas"}
        </button>
        <button
          className={`btn ${emailConfigured ? "btn-secondary" : "btn-secondary"}`}
          onClick={sendAlertEmail}
          disabled={sendingEmail || alerts.length === 0}
          title={
            !emailConfigured
              ? "Configure as variáveis VITE_EMAILJS_* no .env"
              : alerts.length === 0
              ? "Nenhum alerta no momento"
              : `Enviar alerta com ${alerts.length} produto(s)`
          }
        >
          {sendingEmail ? "Enviando..." : `Alerta e-mail${alerts.length > 0 ? ` (${alerts.length})` : ""}`}
        </button>
      </div>

      {/* ── Banner de configuração da planilha ── */}
      {settingUp && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "12px 16px", marginBottom: 16,
          fontSize: 13, color: "var(--text-muted)",
        }}>
          Criando aba Resumo, aplicando formatação e inserindo gráficos... aguarde alguns segundos.
        </div>
      )}

      {/* ── Status do e-mail ── */}
      {emailStatus && (
        <div className={`alert ${emailStatusIsError ? "error" : "success"}`} style={{ marginBottom: 16 }}>
          {emailStatus}
        </div>
      )}

      {/* ── Importação de produtos de manutenção ── */}
      {!alreadySeeded && (
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          padding: "20px 24px",
          marginBottom: 24,
        }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
            Importar catálogo de manutenção
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 14, lineHeight: 1.6 }}>
            {SEED_PRODUCTS.length} produtos prontos para importar, cobrindo:{" "}
            <strong>{seedCategories.join(", ")}</strong>.
            O estoque inicial será <strong>0</strong> — registre entradas depois.
          </div>
          <button
            className="btn btn-primary"
            onClick={importSeedProducts}
            disabled={seeding || loading}
          >
            {seeding ? `Importando ${SEED_PRODUCTS.length} produtos...` : `Importar ${SEED_PRODUCTS.length} produtos`}
          </button>
        </div>
      )}

      {alreadySeeded && (
        <div style={{ marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            className="btn btn-secondary"
            style={{ fontSize: 12 }}
            onClick={importSeedProducts}
            disabled={seeding || resetting || loading}
            title="Adiciona os produtos padrão ao catálogo existente (sem apagar os atuais)"
          >
            {seeding ? "Importando..." : `+ Adicionar catálogo padrão (${SEED_PRODUCTS.length} itens)`}
          </button>
          <button
            className="btn btn-primary"
            style={{ fontSize: 12 }}
            onClick={() => {
              if (confirm("Isso vai apagar TODOS os produtos e movimentações da planilha e reimportar o catálogo padrão com o estoque fictício. Confirmar?")) {
                resetAndSeed();
              }
            }}
            disabled={resetting || seeding || loading}
            title="Limpa a planilha inteira e reimporta o catálogo com quantidades de estoque definidas"
          >
            {resetting ? "Resetando planilha..." : `↺ Resetar e reimportar catálogo (${SEED_PRODUCTS.length} itens)`}
          </button>
        </div>
      )}

      {/* ── KPIs ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total de Produtos</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{total - alerts.length}</div>
          <div className="stat-label">Estoque OK</div>
        </div>
        <div className="stat-card red">
          <div className="stat-value">{alerts.length}</div>
          <div className="stat-label">Alertas</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-value">{zerados}</div>
          <div className="stat-label">Zerados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{movimentacoes.length}</div>
          <div className="stat-label">Movimentações</div>
        </div>
      </div>

      {/* ── Legenda de cores da planilha ── */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 8 }}>Legenda — Cores na Planilha</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { bg: "#f48f8f", label: "Estoque zerado" },
            { bg: "#ffe0e0", label: "Abaixo do mínimo" },
            { bg: "#ffffff", label: "Estoque OK" },
            { bg: "#e8f5e9", label: "Movimentação entrada" },
            { bg: "#fff3e0", label: "Movimentação saída" },
          ].map(({ bg, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
              <div style={{
                width: 16, height: 16, borderRadius: 3,
                background: bg, border: "1px solid var(--border)", flexShrink: 0,
              }} />
              <span style={{ color: "var(--text-muted)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabela de alertas ── */}
      <h2 style={{ marginBottom: 12 }}>Produtos com Alerta</h2>
      {alerts.length === 0 ? (
        <div style={{ color: "var(--text-muted)", padding: "20px 0", fontSize: 13 }}>
          Nenhum alerta. Estoque em dia!
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>SKU</th>
              <th>Categoria</th>
              <th>Estoque Atual</th>
              <th>Mínimo</th>
              <th>Falta</th>
              <th>Criticidade</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => {
              const p = produtos.find((p) => p.id === a.produtoId);
              return (
                <tr key={a.produtoId}>
                  <td style={{ fontWeight: 500 }}>{a.nome}</td>
                  <td style={{ fontFamily: "monospace", fontSize: 12 }}>{a.sku}</td>
                  <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{p?.categoria}</td>
                  <td style={{
                    fontWeight: 700,
                    color: a.estoqueAtual === 0 ? "var(--red)" : "var(--yellow)",
                  }}>
                    {a.estoqueAtual} {p?.unidade}
                  </td>
                  <td style={{ color: "var(--text-muted)" }}>
                    {a.estoqueMinimo} {p?.unidade}
                  </td>
                  <td style={{ color: "var(--red)", fontWeight: 600 }}>
                    {Math.abs(a.diferenca).toFixed(1)} {p?.unidade}
                  </td>
                  <td>
                    <span className={`badge ${a.criticidade === "critico" ? "saida" : "alerta"}`}>
                      {a.criticidade === "critico" ? "Crítico" : "Baixo"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* ── Aviso de e-mail não configurado ── */}
      {!emailConfigured && (
        <div className="config-notice" style={{ marginTop: 24 }}>
          <strong>Alertas por e-mail desativados.</strong> Adicione{" "}
          <code>VITE_EMAILJS_PUBLIC_KEY</code>, <code>VITE_EMAILJS_SERVICE_ID</code>,{" "}
          <code>VITE_EMAILJS_TEMPLATE_ID</code> e <code>VITE_ALERT_EMAIL</code> no{" "}
          <code>.env</code> para ativar.
        </div>
      )}
    </div>
  );
}

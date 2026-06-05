import { useState, type FormEvent } from "react";
import type { AdminHook } from "../hooks/useAdmin";

const CATS_ENTRADA = ["Serviços", "Venda de Peças", "Garantia/Reembolso", "Comissão", "Outros"];
const CATS_SAIDA   = ["Salários/Pagamentos", "Materiais/Peças", "Ferramentas/Equipamentos",
                      "Transporte", "Aluguel/Utilidades", "Impostos", "Marketing", "Outros"];

type Props = Pick<AdminHook,
  "lancamentos" | "saving" | "totalEntradas" | "totalSaidas" | "saldo" | "registrarLancamento"
>;

function fmt(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function Financeiro({
  lancamentos, saving, totalEntradas, totalSaidas, saldo, registrarLancamento,
}: Props) {
  const [showForm, setShowForm]   = useState(false);
  const [tipoFilter, setTipoFilter] = useState<"todos" | "entrada" | "saida">("todos");
  const [form, setForm] = useState({
    tipo: "entrada" as "entrada" | "saida",
    categoria: "",
    descricao: "",
    valor: "",
    responsavel: "",
    documento: "",
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await registrarLancamento({
      tipo:        form.tipo,
      categoria:   form.categoria,
      descricao:   form.descricao,
      valor:       parseFloat(form.valor.replace(",", ".")) || 0,
      responsavel: form.responsavel,
      documento:   form.documento,
    });
    if (ok) {
      setForm({ tipo: "entrada", categoria: "", descricao: "", valor: "", responsavel: "", documento: "" });
      setShowForm(false);
    }
  }

  const cats = form.tipo === "entrada" ? CATS_ENTRADA : CATS_SAIDA;
  const filtered = tipoFilter === "todos"
    ? lancamentos
    : lancamentos.filter((l) => l.tipo === tipoFilter);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <h2 style={{ flex: 1, marginBottom: 0 }}>Controle Financeiro</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancelar" : "+ Novo lançamento"}
        </button>
      </div>

      {/* KPIs */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card green">
          <div className="stat-value" style={{ fontSize: 18 }}>{fmtMoney(totalEntradas)}</div>
          <div className="stat-label">Total Entradas</div>
        </div>
        <div className="stat-card red">
          <div className="stat-value" style={{ fontSize: 18 }}>{fmtMoney(totalSaidas)}</div>
          <div className="stat-label">Total Saídas</div>
        </div>
        <div className={`stat-card ${saldo >= 0 ? "green" : "red"}`}>
          <div className="stat-value" style={{ fontSize: 18 }}>{fmtMoney(saldo)}</div>
          <div className="stat-label">Saldo</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{lancamentos.length}</div>
          <div className="stat-label">Lançamentos</div>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "24px", marginBottom: 24,
        }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 18 }}>
            Novo Lançamento
          </div>
          <form onSubmit={handleSubmit}>
            {/* Tipo */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {(["entrada", "saida"] as const).map((t) => (
                <button
                  key={t} type="button"
                  onClick={() => setForm({ ...form, tipo: t, categoria: "" })}
                  style={{
                    padding: "7px 20px", borderRadius: 8, border: "1px solid",
                    fontWeight: 600, fontSize: 13, cursor: "pointer",
                    background: form.tipo === t
                      ? t === "entrada" ? "#4ade8022" : "#f8717122"
                      : "var(--bg)",
                    borderColor: form.tipo === t
                      ? t === "entrada" ? "var(--green)" : "var(--red)"
                      : "var(--border)",
                    color: form.tipo === t
                      ? t === "entrada" ? "var(--green)" : "var(--red)"
                      : "var(--text-muted)",
                  }}
                >
                  {t === "entrada" ? "↓ Entrada" : "↑ Saída"}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Categoria *</label>
                <input
                  className="input" required list="cats-list"
                  value={form.categoria}
                  onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                  placeholder="Selecione ou digite..."
                />
                <datalist id="cats-list">
                  {cats.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Valor (R$) *</label>
                <input
                  className="input" required type="number" min="0.01" step="0.01"
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Descrição *</label>
                <input
                  className="input" required
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Descreva o lançamento..."
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Responsável</label>
                <input
                  className="input"
                  value={form.responsavel}
                  onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Documento / Referência</label>
                <input
                  className="input"
                  value={form.documento}
                  onChange={(e) => setForm({ ...form, documento: e.target.value })}
                  placeholder="NF-001, Recibo..."
                />
              </div>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Salvando..." : "Registrar"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtro */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        {(["todos", "entrada", "saida"] as const).map((t) => (
          <button
            key={t}
            className={`btn btn-secondary${tipoFilter === t ? " active" : ""}`}
            style={{
              fontSize: 12, padding: "5px 14px",
              background: tipoFilter === t ? "var(--accent)" : undefined,
              color: tipoFilter === t ? "#fff" : undefined,
            }}
            onClick={() => setTipoFilter(t)}
          >
            {t === "todos" ? "Todos" : t === "entrada" ? "↓ Entradas" : "↑ Saídas"}
          </button>
        ))}
      </div>

      {/* Tabela */}
      {filtered.length === 0 ? (
        <div style={{ color: "var(--text-muted)", padding: "24px 0", fontSize: 13 }}>
          Nenhum lançamento encontrado.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Tipo</th>
              <th>Categoria</th>
              <th>Descrição</th>
              <th>Valor</th>
              <th>Responsável</th>
              <th>Documento</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{fmt(l.dataHora)}</td>
                <td>
                  <span className={`badge ${l.tipo === "entrada" ? "entrada" : "saida"}`}>
                    {l.tipo === "entrada" ? "↓ Entrada" : "↑ Saída"}
                  </span>
                </td>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{l.categoria}</td>
                <td style={{ fontWeight: 500 }}>{l.descricao}</td>
                <td style={{
                  fontWeight: 700,
                  color: l.tipo === "entrada" ? "var(--green)" : "var(--red)",
                }}>
                  {l.tipo === "saida" ? "−" : "+"}{fmtMoney(l.valor)}
                </td>
                <td style={{ fontSize: 12 }}>{l.responsavel || "—"}</td>
                <td style={{ fontSize: 12, fontFamily: "monospace" }}>{l.documento || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

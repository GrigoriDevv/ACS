import { useState, type FormEvent } from "react";
import type { AdminHook } from "../hooks/useAdmin";
import { useFormDraft } from "../hooks/useFormDraft";

const CARGOS = [
  "Técnico de Refrigeração", "Técnico de Eletrodomésticos", "Auxiliar Técnico",
  "Atendente", "Vendedor", "Almoxarife", "Supervisor", "Gerente", "Outro",
];

type Props = Pick<AdminHook,
  "funcionarios" | "saving" | "registrarFuncionario" | "toggleFuncionarioStatus"
>;

function fmt(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}

function fmtMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const EMPTY_FORM = {
  nome: "", cargo: "", email: "", telefone: "", salario: "", status: "ativo" as const,
};

export default function Funcionarios({
  funcionarios, saving, registrarFuncionario, toggleFuncionarioStatus,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const { form, setForm, reset } = useFormDraft("funcionario", EMPTY_FORM);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const ok = await registrarFuncionario({
      nome:     form.nome,
      cargo:    form.cargo,
      email:    form.email,
      telefone: form.telefone,
      salario:  parseFloat(form.salario.replace(",", ".")) || 0,
      status:   "ativo",
    });
    if (ok) {
      reset();
      setShowForm(false);
    }
  }

  const ativos   = funcionarios.filter((f) => f.status === "ativo").length;
  const inativos = funcionarios.filter((f) => f.status === "inativo").length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <h2 style={{ flex: 1, marginBottom: 0 }}>Funcionários</h2>
        <button
          className="btn btn-primary"
          onClick={() => setShowForm((v) => !v)}
        >
          {showForm ? "Cancelar" : "+ Cadastrar funcionário"}
        </button>
      </div>

      {/* KPIs */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value">{funcionarios.length}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card green">
          <div className="stat-value">{ativos}</div>
          <div className="stat-label">Ativos</div>
        </div>
        <div className="stat-card red">
          <div className="stat-value">{inativos}</div>
          <div className="stat-label">Inativos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ fontSize: 18 }}>
            {fmtMoney(funcionarios.filter((f) => f.status === "ativo").reduce((s, f) => s + f.salario, 0))}
          </div>
          <div className="stat-label">Folha ativa</div>
        </div>
      </div>

      {/* Formulário de cadastro */}
      {showForm && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "24px", marginBottom: 24,
        }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 18 }}>
            Novo Funcionário
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Nome completo *</label>
                <input
                  className="input" required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="João da Silva"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Cargo *</label>
                <input
                  className="input" required list="cargos-list"
                  value={form.cargo}
                  onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                  placeholder="Técnico de Refrigeração"
                />
                <datalist id="cargos-list">
                  {CARGOS.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>E-mail</label>
                <input
                  className="input" type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="joao@empresa.com"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Telefone</label>
                <input
                  className="input"
                  value={form.telefone}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(11) 99999-0000"
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 5 }}>Salário (R$)</label>
                <input
                  className="input" type="number" min="0" step="0.01"
                  value={form.salario}
                  onChange={(e) => setForm({ ...form, salario: e.target.value })}
                  placeholder="2500,00"
                />
              </div>
            </div>
            <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Salvando..." : "Cadastrar"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabela */}
      {funcionarios.length === 0 ? (
        <div style={{ color: "var(--text-muted)", padding: "24px 0", fontSize: 13 }}>
          Nenhum funcionário cadastrado ainda.
        </div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Cargo</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Salário</th>
              <th>Cadastrado em</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {funcionarios.map((f) => (
              <tr key={f.id} style={{ opacity: f.status === "inativo" ? 0.55 : 1 }}>
                <td style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-muted)" }}>{f.id.slice(0, 8)}…</td>
                <td style={{ fontWeight: 500 }}>{f.nome}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{f.cargo}</td>
                <td style={{ fontSize: 12 }}>{f.email || "—"}</td>
                <td style={{ fontSize: 12 }}>{f.telefone || "—"}</td>
                <td style={{ fontWeight: 600 }}>{fmtMoney(f.salario)}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{fmt(f.criadoEm)}</td>
                <td>
                  <span className={`badge ${f.status === "ativo" ? "entrada" : "saida"}`}>
                    {f.status === "ativo" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: 11, padding: "4px 10px" }}
                    onClick={() => toggleFuncionarioStatus(f)}
                    disabled={saving}
                  >
                    {f.status === "ativo" ? "Desativar" : "Reativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

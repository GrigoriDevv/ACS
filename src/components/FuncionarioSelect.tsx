import type { Funcionario } from "../types";

interface Props {
  funcionarios: Funcionario[];
  funcionarioId: string;
  responsavel: string;
  onFuncionarioId: (id: string) => void;
  onResponsavel: (name: string) => void;
  /** Quando true, exige nome se nenhum funcionário cadastrado for selecionado */
  requireResponsavel?: boolean;
  /** Estilo compacto para formulários admin (Financeiro) */
  variant?: "form" | "admin";
}

export default function FuncionarioSelect({
  funcionarios,
  funcionarioId,
  responsavel,
  onFuncionarioId,
  onResponsavel,
  requireResponsavel = true,
  variant = "form",
}: Props) {
  const active = funcionarios.filter((f) => f.status === "ativo");
  const selected = active.find((f) => f.id === funcionarioId);

  const labelStyle = variant === "admin"
    ? { fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block" as const, marginBottom: 5 }
    : undefined;

  const inputClass = variant === "admin" ? "input" : undefined;

  return (
    <>
      <div className={variant === "form" ? "form-group" : undefined} style={variant === "admin" ? { gridColumn: "1 / -1" } : undefined}>
        {variant === "form" ? <label>Funcionário</label> : (
          <label style={labelStyle}>Funcionário cadastrado</label>
        )}
        <select
          className={inputClass}
          value={funcionarioId}
          onChange={(e) => onFuncionarioId(e.target.value)}
        >
          <option value="">Selecione um funcionário...</option>
          {active.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome} — {f.cargo}
            </option>
          ))}
        </select>
        {active.length === 0 && (
          <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
            Nenhum funcionário ativo. Cadastre em Administração ou informe o nome manualmente.
          </span>
        )}
      </div>

      {selected && (
        <div
          className={variant === "form" ? "form-group full-width" : undefined}
          style={{
            gridColumn: variant === "admin" ? "1 / -1" : undefined,
            background: "var(--bg)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 600 }}>{selected.nome}</div>
          <div style={{ color: "var(--text-muted)" }}>{selected.cargo}</div>
          {selected.email && <div>{selected.email}</div>}
          {selected.telefone && <div>{selected.telefone}</div>}
        </div>
      )}

      <div className={variant === "form" ? "form-group" : undefined}>
        {variant === "form" ? (
          <label>Responsável {!funcionarioId && requireResponsavel ? "*" : ""}</label>
        ) : (
          <label style={labelStyle}>
            Responsável {!funcionarioId && requireResponsavel ? "*" : ""}
          </label>
        )}
        <input
          className={inputClass}
          type="text"
          value={funcionarioId ? (selected?.nome ?? "") : responsavel}
          onChange={(e) => onResponsavel(e.target.value)}
          placeholder="Nome do operador"
          required={!funcionarioId && requireResponsavel}
          disabled={!!funcionarioId}
        />
      </div>
    </>
  );
}

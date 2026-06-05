import { useState } from "react";
import type { InventoryHook } from "../hooks/useInventory";
import type { TipoMovimentacao } from "../types";

export default function History({ movimentacoes, produtos }: InventoryHook) {
  const [typeFilter, setTypeFilter] = useState<TipoMovimentacao | "todos">("todos");
  const [productFilter, setProductFilter] = useState("");

  const filtered = movimentacoes.filter((m) => {
    const matchType = typeFilter === "todos" || m.tipo === typeFilter;
    const matchProduct =
      !productFilter ||
      m.produtoNome.toLowerCase().includes(productFilter.toLowerCase());
    return matchType && matchProduct;
  });

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("pt-BR");
    } catch {
      return iso;
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Histórico de Movimentações</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Filtrar por produto..."
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
        {(["todos", "entrada", "saida", "ajuste"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`btn ${typeFilter === t ? "btn-primary" : "btn-secondary"}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Produto</th>
            <th>Tipo</th>
            <th style={{ textAlign: "right" }}>Qtd</th>
            <th style={{ textAlign: "right" }}>Ant.</th>
            <th style={{ textAlign: "right" }}>Post.</th>
            <th>Funcionário</th>
            <th>Cargo</th>
            <th>E-mail</th>
            <th>Telefone</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={11} style={{ color: "var(--text-muted)", padding: "20px 12px" }}>
                Nenhuma movimentação encontrada.
              </td>
            </tr>
          )}
          {filtered.map((m) => {
            const p = produtos.find((p) => p.id === m.produtoId);
            return (
              <tr key={m.id}>
                <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmt(m.dataHora)}</td>
                <td style={{ fontWeight: 500 }}>{m.produtoNome}</td>
                <td>
                  <span className={`badge ${m.tipo}`}>{m.tipo}</span>
                </td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>
                  {m.quantidade} {p?.unidade}
                </td>
                <td style={{ textAlign: "right", color: "var(--text-muted)" }}>{m.saldoAnterior}</td>
                <td style={{ textAlign: "right", fontWeight: 600 }}>{m.saldoPosterior}</td>
                <td style={{ fontSize: 12, fontWeight: 500 }}>{m.funcionarioNome || m.responsavel}</td>
                <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.funcionarioCargo || "—"}</td>
                <td style={{ fontSize: 12 }}>{m.funcionarioEmail || "—"}</td>
                <td style={{ fontSize: 12 }}>{m.funcionarioTelefone || "—"}</td>
                <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{m.motivo}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

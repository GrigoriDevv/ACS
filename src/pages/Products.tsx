import { useState } from "react";
import type { InventoryHook } from "../hooks/useInventory";
import { produtoAbaixoMinimo } from "../types";

export default function Products({ produtos }: InventoryHook) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "alerta" | "ok">("todos");

  const filtered = produtos.filter((p) => {
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const isAlert = produtoAbaixoMinimo(p);
    const matchFilter =
      filter === "todos" || (filter === "alerta" && isAlert) || (filter === "ok" && !isAlert);
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Produtos em Estoque</h2>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Buscar por nome ou SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        {(["todos", "alerta", "ok"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`btn ${filter === f ? "btn-primary" : "btn-secondary"}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>SKU</th>
            <th>Categoria</th>
            <th>Unidade</th>
            <th>Estoque</th>
            <th>Mínimo</th>
            <th>Localização</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 && (
            <tr>
              <td colSpan={8} style={{ color: "var(--text-muted)", padding: "20px 12px" }}>
                Nenhum produto encontrado.
              </td>
            </tr>
          )}
          {filtered.map((p) => {
            const isAlert = produtoAbaixoMinimo(p);
            return (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.nome}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.sku}</td>
                <td>{p.categoria || "—"}</td>
                <td>{p.unidade}</td>
                <td style={{
                  fontWeight: 700,
                  color: p.estoqueAtual === 0 ? "var(--red)" : isAlert ? "var(--yellow)" : "var(--green)",
                }}>
                  {p.estoqueAtual}
                </td>
                <td style={{ color: "var(--text-muted)" }}>{p.estoqueMinimo}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{p.localizacao || "—"}</td>
                <td>
                  <span className={`badge ${isAlert ? "alerta" : "ok"}`}>
                    {isAlert ? "Alerta" : "OK"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

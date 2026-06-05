import { useState } from "react";
import type { InventoryHook } from "../hooks/useInventory";
import { produtoAbaixoMinimo, type Produto } from "../types";

type Props = Pick<InventoryHook, "produtos" | "updateStock">;

export default function Products({ produtos, updateStock }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"todos" | "alerta" | "ok">("todos");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  const filtered = produtos.filter((p) => {
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const isAlert = produtoAbaixoMinimo(p);
    const matchFilter =
      filter === "todos" || (filter === "alerta" && isAlert) || (filter === "ok" && !isAlert);
    return matchSearch && matchFilter;
  });

  function startEdit(p: Produto) {
    setEditingId(p.id);
    setEditValue(String(p.estoqueAtual));
    setFeedback(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function saveEdit(p: Produto) {
    const novo = parseFloat(editValue);
    if (isNaN(novo) || novo < 0) {
      setFeedback({ id: p.id, msg: "Valor inválido", ok: false });
      return;
    }
    if (novo === p.estoqueAtual) {
      cancelEdit();
      return;
    }

    setSavingId(p.id);
    setFeedback(null);
    try {
      await updateStock(p.id, novo);
      setFeedback({ id: p.id, msg: "Estoque atualizado", ok: true });
      cancelEdit();
    } catch (e) {
      setFeedback({ id: p.id, msg: (e as Error).message, ok: false });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Produtos em Estoque</h2>
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
        Clique no ícone ✎ na coluna Estoque para editar a quantidade. Cada alteração é registrada no histórico como ajuste.
      </p>

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
            const isEditing = editingId === p.id;
            const isSaving = savingId === p.id;
            const rowFeedback = feedback?.id === p.id ? feedback : null;

            return (
              <tr key={p.id}>
                <td style={{ fontWeight: 500 }}>{p.nome}</td>
                <td style={{ fontFamily: "monospace", fontSize: 12 }}>{p.sku}</td>
                <td>{p.categoria || "—"}</td>
                <td>{p.unidade}</td>
                <td>
                  {isEditing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        disabled={isSaving}
                        style={{ width: 72, padding: "4px 6px", fontSize: 13 }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(p);
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <button
                        className="btn btn-primary"
                        style={{ padding: "3px 8px", fontSize: 11 }}
                        onClick={() => saveEdit(p)}
                        disabled={isSaving}
                      >
                        {isSaving ? "..." : "✓"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "3px 8px", fontSize: 11 }}
                        onClick={cancelEdit}
                        disabled={isSaving}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        fontWeight: 700,
                        color: p.estoqueAtual === 0 ? "var(--red)" : isAlert ? "var(--yellow)" : "var(--green)",
                      }}>
                        {p.estoqueAtual} {p.unidade}
                      </span>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "2px 7px", fontSize: 11 }}
                        onClick={() => startEdit(p)}
                        title="Editar estoque"
                        disabled={!p.ativo}
                      >
                        ✎
                      </button>
                    </div>
                  )}
                  {rowFeedback && (
                    <div style={{
                      fontSize: 11, marginTop: 4,
                      color: rowFeedback.ok ? "var(--green)" : "var(--red)",
                    }}>
                      {rowFeedback.msg}
                    </div>
                  )}
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

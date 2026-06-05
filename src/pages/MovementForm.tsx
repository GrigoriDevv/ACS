import { useState } from "react";
import type { TipoMovimentacao } from "../types";
import type { InventoryHook } from "../hooks/useInventory";

interface Props extends Pick<InventoryHook, "produtos" | "registerMovement"> {
  tipo: TipoMovimentacao;
}

export default function MovementForm({ tipo, produtos, registerMovement }: Props) {
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [responsible, setResponsible] = useState("");
  const [reason, setReason] = useState("");
  const [document, setDocument] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const active = produtos.filter((p) => p.ativo);
  const selected = active.find((p) => p.id === productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !quantity || !responsible || !reason) return;

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      setFeedback({ type: "err", msg: "Quantidade inválida. Informe um número maior que zero." });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      await registerMovement({
        produtoId: productId,
        tipo,
        quantidade: qty,
        responsavel: responsible,
        motivo: reason,
        documento: document || undefined,
      });

      setFeedback({ type: "ok", msg: `${tipo === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!` });
      setProductId("");
      setQuantity("");
      setReason("");
      setDocument("");
    } catch (err) {
      setFeedback({ type: "err", msg: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const isInbound = tipo === "entrada";

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>
        Registrar {isInbound ? "Entrada" : "Saída"} de Material
      </h2>

      {feedback && (
        <div className={`alert ${feedback.type === "ok" ? "success" : "error"}`} style={{ marginBottom: 16 }}>
          {feedback.msg}
        </div>
      )}

      <div className="section">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Produto *</label>
            <select value={productId} onChange={(e) => setProductId(e.target.value)} required>
              <option value="">Selecione um produto...</option>
              {active.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} ({p.sku}) — {p.estoqueAtual} {p.unidade}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Quantidade *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            {selected && tipo === "saida" && (
              <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
                Disponível:{" "}
                <strong style={{ color: selected.estoqueAtual > 0 ? "var(--green)" : "var(--red)" }}>
                  {selected.estoqueAtual} {selected.unidade}
                </strong>
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Responsável *</label>
            <input
              type="text"
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
              placeholder="Nome ou e-mail do operador"
              required
            />
          </div>

          <div className="form-group">
            <label>Documento (NF, OS, pedido...)</label>
            <input
              type="text"
              value={document}
              onChange={(e) => setDocument(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="form-group full-width">
            <label>Motivo *</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isInbound
                  ? "ex: Compra mensal, reposição de estoque..."
                  : "ex: Consumo produção, manutenção..."
              }
              required
            />
          </div>

          <div className="btn-row full-width">
            <button
              type="submit"
              className={`btn ${isInbound ? "btn-success" : "btn-danger"}`}
              disabled={loading}
            >
              {loading ? "Salvando..." : isInbound ? "Registrar Entrada" : "Registrar Saída"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

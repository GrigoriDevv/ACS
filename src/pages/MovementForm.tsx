import { useState } from "react";
import type { Funcionario, TipoMovimentacao } from "../types";
import type { InventoryHook } from "../hooks/useInventory";
import { useFormDraft } from "../hooks/useFormDraft";
import FuncionarioSelect from "../components/FuncionarioSelect";

interface Props extends Pick<InventoryHook, "produtos" | "registerMovement"> {
  tipo: TipoMovimentacao;
  funcionarios: Funcionario[];
}

const EMPTY = {
  productId: "",
  quantity: "",
  funcionarioId: "",
  responsible: "",
  reason: "",
  document: "",
};

export default function MovementForm({ tipo, produtos, funcionarios, registerMovement }: Props) {
  const { form, setForm, setField, reset } = useFormDraft(`movement_${tipo}`, EMPTY);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const active = produtos.filter((p) => p.ativo);
  const selected = active.find((p) => p.id === form.productId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || !form.quantity || !form.reason) return;
    if (!form.funcionarioId && !form.responsible) return;

    const qty = parseFloat(form.quantity);
    if (isNaN(qty) || qty <= 0) {
      setFeedback({ type: "err", msg: "Quantidade inválida. Informe um número maior que zero." });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      await registerMovement({
        produtoId: form.productId,
        tipo,
        quantidade: qty,
        funcionarioId: form.funcionarioId || undefined,
        responsavel: form.responsible,
        motivo: form.reason,
        documento: form.document || undefined,
      });

      setFeedback({ type: "ok", msg: `${tipo === "entrada" ? "Entrada" : "Saída"} registrada com sucesso!` });
      const keep = { funcionarioId: form.funcionarioId, responsible: form.responsible };
      reset();
      setForm({ ...EMPTY, ...keep });
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
      <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
        Campos salvos automaticamente no navegador enquanto você preenche.
      </p>

      {feedback && (
        <div className={`alert ${feedback.type === "ok" ? "success" : "error"}`} style={{ marginBottom: 16 }}>
          {feedback.msg}
        </div>
      )}

      <div className="section">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Produto *</label>
            <select value={form.productId} onChange={setField("productId")} required>
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
              value={form.quantity}
              onChange={setField("quantity")}
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

          <FuncionarioSelect
            funcionarios={funcionarios}
            funcionarioId={form.funcionarioId}
            responsavel={form.responsible}
            onFuncionarioId={(id) => setForm({ ...form, funcionarioId: id })}
            onResponsavel={(name) => setForm({ ...form, responsible: name })}
          />

          <div className="form-group">
            <label>Documento (NF, OS, pedido...)</label>
            <input
              type="text"
              value={form.document}
              onChange={setField("document")}
              placeholder="Opcional"
            />
          </div>

          <div className="form-group full-width">
            <label>Motivo *</label>
            <input
              type="text"
              value={form.reason}
              onChange={setField("reason")}
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

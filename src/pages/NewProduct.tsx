import { useState } from "react";
import type { InventoryHook } from "../hooks/useInventory";

const UNITS = ["UN", "KG", "L", "M", "M²", "CX", "PCT", "PAR", "RL"];

export default function NewProduct({ registerProduct }: InventoryHook) {
  const [form, setForm] = useState({
    nome: "",
    sku: "",
    categoria: "",
    unidade: "UN",
    estoqueMinimo: "0",
    localizacao: "",
    ativo: true,
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      await registerProduct({
        nome: form.nome,
        sku: form.sku.toUpperCase(),
        categoria: form.categoria,
        unidade: form.unidade,
        estoqueMinimo: parseFloat(form.estoqueMinimo) || 0,
        localizacao: form.localizacao,
        ativo: form.ativo,
      });
      setFeedback({ type: "ok", msg: `Produto "${form.nome}" cadastrado com sucesso!` });
      setForm({ nome: "", sku: "", categoria: "", unidade: "UN", estoqueMinimo: "0", localizacao: "", ativo: true });
    } catch (err) {
      setFeedback({ type: "err", msg: (err as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Cadastrar Novo Produto</h2>

      {feedback && (
        <div className={`alert ${feedback.type === "ok" ? "success" : "error"}`} style={{ marginBottom: 16 }}>
          {feedback.msg}
        </div>
      )}

      <div className="section">
        <form onSubmit={handleSubmit} className="form-grid">
          <div className="form-group">
            <label>Nome *</label>
            <input type="text" value={form.nome} onChange={set("nome")} required />
          </div>

          <div className="form-group">
            <label>SKU *</label>
            <input
              type="text"
              value={form.sku}
              onChange={set("sku")}
              placeholder="Código interno único"
              style={{ textTransform: "uppercase" }}
              required
            />
          </div>

          <div className="form-group">
            <label>Categoria</label>
            <input
              type="text"
              value={form.categoria}
              onChange={set("categoria")}
              placeholder="ex: Limpeza, EPI, Elétrico..."
            />
          </div>

          <div className="form-group">
            <label>Unidade *</label>
            <select value={form.unidade} onChange={set("unidade")} required>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Estoque Mínimo</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.estoqueMinimo}
              onChange={set("estoqueMinimo")}
            />
            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, display: "block" }}>
              Alerta é gerado quando o estoque cai abaixo deste valor
            </span>
          </div>

          <div className="form-group">
            <label>Localização</label>
            <input
              type="text"
              value={form.localizacao}
              onChange={set("localizacao")}
              placeholder="ex: Prateleira A3, Depósito 2..."
            />
          </div>

          <div className="btn-row full-width">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Salvando..." : "Cadastrar Produto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

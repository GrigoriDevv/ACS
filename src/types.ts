export type TipoMovimentacao = "entrada" | "saida" | "ajuste";

export interface Produto {
  id: string;
  nome: string;
  sku: string;
  categoria: string;
  unidade: string;
  estoqueMinimo: number;
  estoqueAtual: number;
  localizacao: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
  /** Número da linha na planilha (1-indexed, inclui cabeçalho) */
  _rowNumber: number;
}

export interface Movimentacao {
  id: string;
  dataHora: string;
  produtoId: string;
  produtoNome: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  saldoAnterior: number;
  saldoPosterior: number;
  responsavel: string;
  motivo: string;
  documento: string;
}

export interface AlertaEstoque {
  produtoId: string;
  nome: string;
  sku: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  diferenca: number;
  criticidade: "critico" | "alto" | "medio";
}

export function alertaFromProduto(p: Produto): AlertaEstoque {
  const diferenca = p.estoqueAtual - p.estoqueMinimo;
  const criticidade =
    p.estoqueAtual === 0 ? "critico" : diferenca < 0 ? "alto" : "medio";
  return {
    produtoId: p.id,
    nome: p.nome,
    sku: p.sku,
    estoqueAtual: p.estoqueAtual,
    estoqueMinimo: p.estoqueMinimo,
    diferenca,
    criticidade,
  };
}

export function produtoAbaixoMinimo(p: Produto): boolean {
  return p.ativo && p.estoqueAtual < p.estoqueMinimo;
}

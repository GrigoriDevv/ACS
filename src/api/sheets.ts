/**
 * Cliente para Google Sheets API v4 via REST + fetch.
 * Usa o access token do OAuth 2.0 — sem backend necessário.
 */

import { getToken } from "./auth";
import type { Movimentacao, Produto } from "../types";

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// ── Nomes das abas ───────────────────────────────────────────────────────────
export const SHEET_PRODUTOS = "Produtos";
export const SHEET_MOVIMENTACOES = "Movimentações";

const HEADERS_PRODUTOS = [
  "ID", "Nome", "SKU", "Categoria", "Unidade",
  "Estoque Mínimo", "Estoque Atual", "Localização", "Ativo",
  "Criado Em", "Atualizado Em",
];

const HEADERS_MOVIMENTACOES = [
  "ID", "Data/Hora", "Produto ID", "Produto Nome", "Tipo",
  "Quantidade", "Saldo Anterior", "Saldo Posterior",
  "Responsável", "Motivo", "Documento",
];

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function req<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ?? res.statusText
    );
  }
  return res.json() as Promise<T>;
}

// ── Cache de IDs numéricos das abas (necessário para formatação) ──────────────
type SheetMeta = { properties: { title: string; sheetId: number } };
let _sheetIdCache: Record<string, number> = {};

async function refreshSheetIds(spreadsheetId: string): Promise<void> {
  const data = await req<{ sheets: SheetMeta[] }>(
    "GET",
    `/${spreadsheetId}?fields=sheets.properties`
  );
  _sheetIdCache = {};
  for (const s of data.sheets) {
    _sheetIdCache[s.properties.title] = s.properties.sheetId;
  }
}

async function getSheetId(spreadsheetId: string, title: string): Promise<number> {
  if (_sheetIdCache[title] !== undefined) return _sheetIdCache[title];
  await refreshSheetIds(spreadsheetId);
  return _sheetIdCache[title] ?? 0;
}

// ── Criação das abas ─────────────────────────────────────────────────────────
export async function ensureSheets(spreadsheetId: string): Promise<void> {
  type SheetsResponse = { sheets: Array<{ properties: { title: string } }> };
  const info = await req<SheetsResponse>("GET", `/${spreadsheetId}?fields=sheets.properties.title`);
  const existing = info.sheets.map((s) => s.properties.title);

  const toCreate: Array<{ title: string; headers: string[] }> = [];
  if (!existing.includes(SHEET_PRODUTOS))
    toCreate.push({ title: SHEET_PRODUTOS, headers: HEADERS_PRODUTOS });
  if (!existing.includes(SHEET_MOVIMENTACOES))
    toCreate.push({ title: SHEET_MOVIMENTACOES, headers: HEADERS_MOVIMENTACOES });

  if (toCreate.length === 0) return;

  await req("POST", `/${spreadsheetId}:batchUpdate`, {
    requests: toCreate.map(({ title }) => ({
      addSheet: { properties: { title } },
    })),
  });

  for (const { title, headers } of toCreate) {
    await req("PUT", `/${spreadsheetId}/values/${encodeURIComponent(title + "!A1")}?valueInputOption=RAW`, {
      values: [headers],
    });
  }
}

// ── Leitura ───────────────────────────────────────────────────────────────────
type ValuesResponse = { values?: string[][] };

async function getValues(spreadsheetId: string, range: string): Promise<string[][]> {
  const data = await req<ValuesResponse>(
    "GET",
    `/${spreadsheetId}/values/${encodeURIComponent(range)}`
  );
  return (data.values ?? []).slice(1); // remove cabeçalho
}

export async function loadProdutos(spreadsheetId: string): Promise<Produto[]> {
  const rows = await getValues(spreadsheetId, `${SHEET_PRODUTOS}!A:K`);
  return rows
    .filter((r) => r[0])
    .map((r, i) => ({
      id: r[0] ?? "",
      nome: r[1] ?? "",
      sku: r[2] ?? "",
      categoria: r[3] ?? "",
      unidade: r[4] ?? "",
      estoqueMinimo: parseFloat(r[5] ?? "0") || 0,
      estoqueAtual: parseFloat(r[6] ?? "0") || 0,
      localizacao: r[7] ?? "",
      ativo: r[8] !== "FALSE",
      criadoEm: r[9] ?? "",
      atualizadoEm: r[10] ?? "",
      _rowNumber: i + 2, // +1 header +1 because 1-indexed
    }));
}

export async function loadMovimentacoes(spreadsheetId: string): Promise<Movimentacao[]> {
  const rows = await getValues(spreadsheetId, `${SHEET_MOVIMENTACOES}!A:K`);
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      id: r[0] ?? "",
      dataHora: r[1] ?? "",
      produtoId: r[2] ?? "",
      produtoNome: r[3] ?? "",
      tipo: (r[4] ?? "entrada") as Movimentacao["tipo"],
      quantidade: parseFloat(r[5] ?? "0"),
      saldoAnterior: parseFloat(r[6] ?? "0"),
      saldoPosterior: parseFloat(r[7] ?? "0"),
      responsavel: r[8] ?? "",
      motivo: r[9] ?? "",
      documento: r[10] ?? "",
    }))
    .reverse(); // mais recente primeiro
}

// ── Escrita ───────────────────────────────────────────────────────────────────
export async function addProduto(
  spreadsheetId: string,
  produto: Produto
): Promise<void> {
  await req("POST", `/${spreadsheetId}/values/${encodeURIComponent(SHEET_PRODUTOS + "!A:K")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    values: [produtoToRow(produto)],
  });
}

export async function updateProduto(
  spreadsheetId: string,
  produto: Produto
): Promise<void> {
  const range = `${SHEET_PRODUTOS}!A${produto._rowNumber}:K${produto._rowNumber}`;
  await req("PUT", `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`, {
    values: [produtoToRow(produto)],
  });
}

export async function addMovimentacao(
  spreadsheetId: string,
  mov: Movimentacao
): Promise<void> {
  await req("POST", `/${spreadsheetId}/values/${encodeURIComponent(SHEET_MOVIMENTACOES + "!A:K")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
    values: [[
      mov.id, mov.dataHora, mov.produtoId, mov.produtoNome,
      mov.tipo, mov.quantidade, mov.saldoAnterior, mov.saldoPosterior,
      mov.responsavel, mov.motivo, mov.documento,
    ]],
  });
}

// ── Seed em lote ─────────────────────────────────────────────────────────────
export async function seedProdutos(
  spreadsheetId: string,
  items: Omit<Produto, "id" | "estoqueAtual" | "criadoEm" | "atualizadoEm" | "_rowNumber">[]
): Promise<number> {
  const now = new Date().toISOString();
  const rows = items.map((item, i) => {
    const p: Produto = {
      ...item,
      id: crypto.randomUUID(),
      estoqueAtual: 0,
      criadoEm: now,
      atualizadoEm: now,
      _rowNumber: i + 2,
    };
    return produtoToRow(p);
  });

  await req(
    "POST",
    `/${spreadsheetId}/values/${encodeURIComponent(SHEET_PRODUTOS + "!A:K")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { values: rows }
  );

  return rows.length;
}

// ── Serialização ──────────────────────────────────────────────────────────────
function produtoToRow(p: Produto): (string | number | boolean)[] {
  return [
    p.id, p.nome, p.sku, p.categoria, p.unidade,
    p.estoqueMinimo, p.estoqueAtual, p.localizacao,
    p.ativo ? "TRUE" : "FALSE", p.criadoEm, p.atualizadoEm,
  ];
}

// ── Formatação visual na planilha ─────────────────────────────────────────────

type RgbColor = { red: number; green: number; blue: number; alpha: number };

function rgb(r: number, g: number, b: number): RgbColor {
  return { red: r / 255, green: g / 255, blue: b / 255, alpha: 1 };
}

const COLORS = {
  header:       rgb(63,  81,  181),  // azul índigo
  headerText:   rgb(255, 255, 255),
  normal:       rgb(255, 255, 255),  // branco
  lowStock:     rgb(255, 224, 224),  // vermelho claro
  zeroStock:    rgb(244, 143, 143),  // vermelho médio
  movHeader:    rgb(38,  166, 154),  // verde-azulado
  entradaRow:   rgb(232, 245, 233),  // verde muito claro
  saidaRow:     rgb(255, 243, 224),  // laranja muito claro
} satisfies Record<string, RgbColor>;

function repeatCell(
  sheetId: number,
  startRow: number,
  endRow: number,
  startCol: number,
  endCol: number,
  bg: RgbColor,
  textColor?: RgbColor,
  bold?: boolean
) {
  const format: Record<string, unknown> = { backgroundColor: bg };
  if (textColor || bold !== undefined) {
    format.textFormat = {
      ...(textColor ? { foregroundColor: textColor } : {}),
      ...(bold !== undefined ? { bold } : {}),
    };
  }
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
      cell: { userEnteredFormat: format },
      fields: `userEnteredFormat(backgroundColor${textColor || bold !== undefined ? ",textFormat" : ""})`,
    },
  };
}

/**
 * Aplica formatação condicional na aba Produtos:
 * - Cabeçalho: fundo azul + texto branco
 * - Produto normal: branco
 * - Estoque abaixo do mínimo: vermelho claro
 * - Estoque zerado: vermelho médio
 */
export async function applyStockColors(
  spreadsheetId: string,
  produtos: Produto[]
): Promise<void> {
  const sheetId = await getSheetId(spreadsheetId, SHEET_PRODUTOS);
  const COL_COUNT = 11;

  const requests: unknown[] = [
    // 1. Reset de todas as linhas para branco
    repeatCell(sheetId, 1, 2000, 0, COL_COUNT, COLORS.normal),
    // 2. Estilo do cabeçalho
    repeatCell(sheetId, 0, 1, 0, COL_COUNT, COLORS.header, COLORS.headerText, true),
  ];

  // 3. Colorir linhas de alerta
  for (const p of produtos) {
    if (!p.ativo || p.estoqueAtual >= p.estoqueMinimo) continue;
    const row = p._rowNumber - 1; // 0-indexed
    const bg = p.estoqueAtual === 0 ? COLORS.zeroStock : COLORS.lowStock;
    requests.push(repeatCell(sheetId, row, row + 1, 0, COL_COUNT, bg));
  }

  await req("POST", `/${spreadsheetId}:batchUpdate`, { requests });
}

/**
 * Aplica formatação condicional na aba Movimentações:
 * - Cabeçalho: fundo verde-azulado + texto branco
 * - Entradas: verde muito claro
 * - Saídas: laranja muito claro
 */
export async function applyMovimentacoesColors(
  spreadsheetId: string,
  movimentacoes: Movimentacao[]
): Promise<void> {
  const sheetId = await getSheetId(spreadsheetId, SHEET_MOVIMENTACOES);
  const COL_COUNT = 11;

  const requests: unknown[] = [
    repeatCell(sheetId, 1, 2000, 0, COL_COUNT, COLORS.normal),
    repeatCell(sheetId, 0, 1, 0, COL_COUNT, COLORS.movHeader, COLORS.headerText, true),
  ];

  // Movimentações chegam com mais recente primeiro; a planilha tem a mais antiga no topo.
  // Invertemos para alinhar com as linhas reais.
  const ordenadas = [...movimentacoes].reverse();
  for (let i = 0; i < ordenadas.length; i++) {
    const mov = ordenadas[i];
    if (mov.tipo === "ajuste") continue;
    const row = i + 1; // +1 pelo cabeçalho, 0-indexed
    const bg = mov.tipo === "entrada" ? COLORS.entradaRow : COLORS.saidaRow;
    requests.push(repeatCell(sheetId, row, row + 1, 0, COL_COUNT, bg));
  }

  await req("POST", `/${spreadsheetId}:batchUpdate`, { requests });
}

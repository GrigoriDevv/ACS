/**
 * Google Sheets API v4 REST client.
 * Autenticação via Service Account (auth.ts) — sem backend.
 */

import { getToken } from "./auth";
import type { Funcionario, LancamentoFinanceiro, Movimentacao, Produto } from "../types";

const BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// ── Nomes das abas ────────────────────────────────────────────────────────────
export const SHEET_PRODUTOS       = "Produtos";
export const SHEET_MOVIMENTACOES  = "Movimentações";
export const SHEET_RESUMO         = "Resumo";
export const SHEET_POR_PRODUTO    = "Por Produto";
export const SHEET_FUNCIONARIOS   = "Funcionários";
export const SHEET_FINANCEIRO     = "Financeiro";

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
const HEADERS_FUNCIONARIOS = [
  "ID", "Nome", "Cargo", "Email", "Telefone", "Salário", "Status", "Criado Em",
];
const HEADERS_FINANCEIRO = [
  "ID", "Data/Hora", "Tipo", "Categoria", "Descrição", "Valor", "Responsável", "Documento",
];

// ── HTTP helper ───────────────────────────────────────────────────────────────
async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
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

// ── Cache de IDs numéricos das abas ──────────────────────────────────────────
type SheetMeta = { properties: { title: string; sheetId: number }; charts?: { chartId: number }[] };
let _sheetIdCache: Record<string, number> = {};

async function refreshSheetIds(spreadsheetId: string): Promise<SheetMeta[]> {
  const data = await req<{ sheets: SheetMeta[] }>(
    "GET",
    `/${spreadsheetId}?fields=sheets.properties,sheets.charts.chartId`
  );
  _sheetIdCache = {};
  for (const s of data.sheets) _sheetIdCache[s.properties.title] = s.properties.sheetId;
  return data.sheets;
}

async function getSheetId(spreadsheetId: string, title: string): Promise<number> {
  if (_sheetIdCache[title] !== undefined) return _sheetIdCache[title];
  await refreshSheetIds(spreadsheetId);
  return _sheetIdCache[title] ?? 0;
}

// ── Criação das abas ──────────────────────────────────────────────────────────
export async function ensureSheets(spreadsheetId: string): Promise<void> {
  type InfoRes = { sheets: Array<{ properties: { title: string } }> };
  const info = await req<InfoRes>("GET", `/${spreadsheetId}?fields=sheets.properties.title`);
  const existing = info.sheets.map((s) => s.properties.title);

  const toCreate: { title: string; headers: string[] }[] = [];
  if (!existing.includes(SHEET_PRODUTOS))
    toCreate.push({ title: SHEET_PRODUTOS, headers: HEADERS_PRODUTOS });
  if (!existing.includes(SHEET_MOVIMENTACOES))
    toCreate.push({ title: SHEET_MOVIMENTACOES, headers: HEADERS_MOVIMENTACOES });

  if (toCreate.length === 0) return;

  await req("POST", `/${spreadsheetId}:batchUpdate`, {
    requests: toCreate.map(({ title }) => ({ addSheet: { properties: { title } } })),
  });

  for (const { title, headers } of toCreate) {
    await req(
      "PUT",
      `/${spreadsheetId}/values/${encodeURIComponent(title + "!A1")}?valueInputOption=RAW`,
      { values: [headers] }
    );
  }
}

// ── Leitura ───────────────────────────────────────────────────────────────────
// UNFORMATTED_VALUE garante:
//  • Números chegam como number (sem formatação de separador de milhar que quebraria parseFloat)
//  • Booleanos chegam como boolean true/false (não string "TRUE"/"FALSE")
type CellValue = string | number | boolean | null;
type ValuesResponse = { values?: CellValue[][] };

function str(v: CellValue): string {
  return v == null ? "" : String(v);
}
function num(v: CellValue): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}
function bool(v: CellValue): boolean {
  // Trata boolean true, string "TRUE"/"true", número 1
  if (v === true || v === 1) return true;
  if (typeof v === "string") return v.toUpperCase() === "TRUE";
  return false;
}

async function getValues(spreadsheetId: string, range: string): Promise<CellValue[][]> {
  const data = await req<ValuesResponse>(
    "GET",
    `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=UNFORMATTED_VALUE`
  );
  return (data.values ?? []).slice(1);
}

export async function loadProdutos(spreadsheetId: string): Promise<Produto[]> {
  const rows = await getValues(spreadsheetId, `${SHEET_PRODUTOS}!A:K`);
  return rows
    .filter((r) => r[0])
    .map((r, i) => ({
      id:            str(r[0]),
      nome:          str(r[1]),
      sku:           str(r[2]),
      categoria:     str(r[3]),
      unidade:       str(r[4]),
      estoqueMinimo: num(r[5]),
      estoqueAtual:  num(r[6]),
      localizacao:   str(r[7]),
      ativo:         bool(r[8]),
      criadoEm:      str(r[9]),
      atualizadoEm:  str(r[10]),
      _rowNumber:    i + 2,
    }));
}

export async function loadMovimentacoes(spreadsheetId: string): Promise<Movimentacao[]> {
  const rows = await getValues(spreadsheetId, `${SHEET_MOVIMENTACOES}!A:K`);
  return rows
    .filter((r) => r[0])
    .map((r) => ({
      id:             str(r[0]),
      dataHora:       str(r[1]),
      produtoId:      str(r[2]),
      produtoNome:    str(r[3]),
      tipo:           str(r[4]) as Movimentacao["tipo"],
      quantidade:     num(r[5]),
      saldoAnterior:  num(r[6]),
      saldoPosterior: num(r[7]),
      responsavel:    str(r[8]),
      motivo:         str(r[9]),
      documento:      str(r[10]),
    }))
    .reverse();
}

// ── Escrita ───────────────────────────────────────────────────────────────────
export async function addProduto(spreadsheetId: string, produto: Produto): Promise<void> {
  await req(
    "POST",
    `/${spreadsheetId}/values/${encodeURIComponent(SHEET_PRODUTOS + "!A:K")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { values: [produtoToRow(produto)] }
  );
}

export async function updateProduto(spreadsheetId: string, produto: Produto): Promise<void> {
  const range = `${SHEET_PRODUTOS}!A${produto._rowNumber}:K${produto._rowNumber}`;
  await req(
    "PUT",
    `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    { values: [produtoToRow(produto)] }
  );
}

export async function addMovimentacao(spreadsheetId: string, mov: Movimentacao): Promise<void> {
  await req(
    "POST",
    `/${spreadsheetId}/values/${encodeURIComponent(SHEET_MOVIMENTACOES + "!A:K")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { values: [[
      mov.id, mov.dataHora, mov.produtoId, mov.produtoNome,
      mov.tipo, mov.quantidade, mov.saldoAnterior, mov.saldoPosterior,
      mov.responsavel, mov.motivo, mov.documento,
    ]] }
  );
}

export async function seedProdutos(
  spreadsheetId: string,
  items: Omit<Produto, "id" | "criadoEm" | "atualizadoEm" | "_rowNumber">[]
): Promise<number> {
  const now = new Date().toISOString();
  const rows = items.map((item) =>
    produtoToRow({
      ...item,
      id: crypto.randomUUID(),
      estoqueAtual: item.estoqueAtual ?? 0,
      criadoEm: now,
      atualizadoEm: now,
      _rowNumber: 0,
    })
  );
  await req(
    "POST",
    `/${spreadsheetId}/values/${encodeURIComponent(SHEET_PRODUTOS + "!A:K")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { values: rows }
  );
  return rows.length;
}

/**
 * Apaga todos os dados de uma aba a partir da linha `fromRow` (mantém cabeçalho).
 * Usa a API values.clear — preserva formatação de célula.
 */
export async function clearSheetData(
  spreadsheetId: string,
  sheetName: string,
  fromRow = 2,
): Promise<void> {
  const range = `${sheetName}!A${fromRow}:Z`;
  await req("POST", `/${spreadsheetId}/values/${encodeURIComponent(range)}:clear`);
}

// ── Admin — abas Funcionários e Financeiro ────────────────────────────────────
export async function ensureAdminSheets(spreadsheetId: string): Promise<void> {
  type InfoRes = { sheets: Array<{ properties: { title: string } }> };
  const info = await req<InfoRes>("GET", `/${spreadsheetId}?fields=sheets.properties.title`);
  const existing = info.sheets.map((s) => s.properties.title);

  const toCreate: { title: string; headers: string[] }[] = [];
  if (!existing.includes(SHEET_FUNCIONARIOS))
    toCreate.push({ title: SHEET_FUNCIONARIOS, headers: HEADERS_FUNCIONARIOS });
  if (!existing.includes(SHEET_FINANCEIRO))
    toCreate.push({ title: SHEET_FINANCEIRO, headers: HEADERS_FINANCEIRO });

  if (toCreate.length === 0) return;

  await req("POST", `/${spreadsheetId}:batchUpdate`, {
    requests: toCreate.map(({ title }) => ({ addSheet: { properties: { title } } })),
  });
  for (const { title, headers } of toCreate) {
    await req(
      "PUT",
      `/${spreadsheetId}/values/${encodeURIComponent(title + "!A1")}?valueInputOption=RAW`,
      { values: [headers] }
    );
  }
}

export async function loadFuncionarios(spreadsheetId: string): Promise<Funcionario[]> {
  const rows = await getValues(spreadsheetId, `${SHEET_FUNCIONARIOS}!A:H`);
  return rows
    .filter((r) => r[0])
    .map((r, i) => ({
      id:         str(r[0]),
      nome:       str(r[1]),
      cargo:      str(r[2]),
      email:      str(r[3]),
      telefone:   str(r[4]),
      salario:    num(r[5]),
      status:     (str(r[6]) || "ativo") as Funcionario["status"],
      criadoEm:   str(r[7]),
      _rowNumber: i + 2,
    }));
}

export async function addFuncionario(spreadsheetId: string, f: Funcionario): Promise<void> {
  await req(
    "POST",
    `/${spreadsheetId}/values/${encodeURIComponent(SHEET_FUNCIONARIOS + "!A:H")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { values: [[f.id, f.nome, f.cargo, f.email, f.telefone, f.salario, f.status, f.criadoEm]] }
  );
}

export async function updateFuncionario(spreadsheetId: string, f: Funcionario): Promise<void> {
  const range = `${SHEET_FUNCIONARIOS}!A${f._rowNumber}:H${f._rowNumber}`;
  await req(
    "PUT",
    `/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    { values: [[f.id, f.nome, f.cargo, f.email, f.telefone, f.salario, f.status, f.criadoEm]] }
  );
}

export async function loadLancamentos(spreadsheetId: string): Promise<LancamentoFinanceiro[]> {
  const rows = await getValues(spreadsheetId, `${SHEET_FINANCEIRO}!A:H`);
  return rows
    .filter((r) => r[0])
    .map((r, i) => ({
      id:          str(r[0]),
      dataHora:    str(r[1]),
      tipo:        (str(r[2]) || "entrada") as LancamentoFinanceiro["tipo"],
      categoria:   str(r[3]),
      descricao:   str(r[4]),
      valor:       num(r[5]),
      responsavel: str(r[6]),
      documento:   str(r[7]),
      _rowNumber:  i + 2,
    }))
    .reverse();
}

export async function addLancamento(spreadsheetId: string, l: LancamentoFinanceiro): Promise<void> {
  await req(
    "POST",
    `/${spreadsheetId}/values/${encodeURIComponent(SHEET_FINANCEIRO + "!A:H")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { values: [[l.id, l.dataHora, l.tipo, l.categoria, l.descricao, l.valor, l.responsavel, l.documento]] }
  );
}

// ── Serialização ──────────────────────────────────────────────────────────────
function produtoToRow(p: Produto): (string | number | boolean)[] {
  return [
    p.id, p.nome, p.sku, p.categoria, p.unidade,
    p.estoqueMinimo, p.estoqueAtual, p.localizacao,
    p.ativo ? "TRUE" : "FALSE", p.criadoEm, p.atualizadoEm,
  ];
}

// ── Tipos e helpers de formatação ─────────────────────────────────────────────
type RgbColor = { red: number; green: number; blue: number; alpha: number };

function rgb(r: number, g: number, b: number): RgbColor {
  return { red: r / 255, green: g / 255, blue: b / 255, alpha: 1 };
}

/** Retorna cor sem alpha — necessário para chart.backgroundColor */
function rgbChart(r: number, g: number, b: number) {
  return { red: r / 255, green: g / 255, blue: b / 255 };
}

const COLORS = {
  // Produtos
  headerBlue:   rgb(48,  63, 159),
  headerText:   rgb(255, 255, 255),
  normal:       rgb(255, 255, 255),
  lowStock:     rgb(255, 224, 224),
  zeroStock:    rgb(244, 143, 143),
  // Movimentações
  headerTeal:   rgb(0,   121, 107),
  entradaRow:   rgb(232, 245, 233),
  saidaRow:     rgb(255, 243, 224),
  // Resumo
  resumoTitle:  rgb(26,  35,  126),
  sectionHdr:   rgb(63,  81, 181),
  sectionLight: rgb(197, 202, 233),
  metricBg:     rgb(248, 249, 255),
  catHdr:       rgb(0,   96,  100),
  catLight:     rgb(178, 235, 242),
  statusHdr:    rgb(74, 20,  140),
  statusLight:  rgb(225, 190, 231),
} satisfies Record<string, RgbColor>;

function repeatCell(
  sheetId: number, startRow: number, endRow: number,
  startCol: number, endCol: number, bg: RgbColor,
  textColor?: RgbColor, bold?: boolean, fontSize?: number
) {
  const hasText = textColor !== undefined || bold !== undefined || fontSize !== undefined;
  const format: Record<string, unknown> = { backgroundColor: bg };
  if (hasText) {
    format.textFormat = {
      ...(textColor  ? { foregroundColor: textColor } : {}),
      ...(bold !== undefined ? { bold } : {}),
      ...(fontSize !== undefined ? { fontSize } : {}),
    };
  }
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
      cell: { userEnteredFormat: format },
      fields: `userEnteredFormat(backgroundColor${hasText ? ",textFormat" : ""})`,
    },
  };
}

function colWidth(sheetId: number, startIdx: number, endIdx: number, pixels: number) {
  return {
    updateDimensionProperties: {
      range: { sheetId, dimension: "COLUMNS", startIndex: startIdx, endIndex: endIdx },
      properties: { pixelSize: pixels },
      fields: "pixelSize",
    },
  };
}

function rowHeight(sheetId: number, startIdx: number, endIdx: number, pixels: number) {
  return {
    updateDimensionProperties: {
      range: { sheetId, dimension: "ROWS", startIndex: startIdx, endIndex: endIdx },
      properties: { pixelSize: pixels },
      fields: "pixelSize",
    },
  };
}

function freezeRows(sheetId: number, count = 1) {
  return {
    updateSheetProperties: {
      properties: { sheetId, gridProperties: { frozenRowCount: count } },
      fields: "gridProperties.frozenRowCount",
    },
  };
}

function autoFilter(sheetId: number, endCol: number, startRow = 0) {
  return {
    setBasicFilter: {
      filter: { range: { sheetId, startRowIndex: startRow, startColumnIndex: 0, endColumnIndex: endCol } },
    },
  };
}

function mergeCols(sheetId: number, row: number, startCol: number, endCol: number) {
  return {
    mergeCells: {
      range: { sheetId, startRowIndex: row, endRowIndex: row + 1, startColumnIndex: startCol, endColumnIndex: endCol },
      mergeType: "MERGE_ALL",
    },
  };
}

function numFmt(sheetId: number, startRow: number, endRow: number, startCol: number, endCol: number, pattern = "#,##0.##") {
  return {
    repeatCell: {
      range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
      cell: { userEnteredFormat: { numberFormat: { type: "NUMBER", pattern } } },
      fields: "userEnteredFormat.numberFormat",
    },
  };
}

function borders(
  sheetId: number, startRow: number, endRow: number, startCol: number, endCol: number,
  color = rgb(218, 220, 224)
) {
  const s = { style: "SOLID", color };
  return {
    updateBorders: {
      range: { sheetId, startRowIndex: startRow, endRowIndex: endRow, startColumnIndex: startCol, endColumnIndex: endCol },
      innerHorizontal: s,
      innerVertical: s,
      top: s, bottom: s, left: s, right: s,
    },
  };
}

function anchor(sheetId: number, row: number, col: number, w: number, h: number) {
  return {
    overlayPosition: {
      anchorCell: { sheetId, rowIndex: row, columnIndex: col },
      offsetXPixels: 0,
      offsetYPixels: 0,
      widthPixels: w,
      heightPixels: h,
    },
  };
}

function srcRange(sheetId: number, r0: number, r1: number, c0: number, c1: number) {
  return { sourceRange: { sources: [{ sheetId, startRowIndex: r0, endRowIndex: r1, startColumnIndex: c0, endColumnIndex: c1 }] } };
}

// ── Formatação de estoque existente ──────────────────────────────────────────
export async function applyStockColors(spreadsheetId: string, produtos: Produto[]): Promise<void> {
  const sheetId = await getSheetId(spreadsheetId, SHEET_PRODUTOS);
  const COL = 11;
  const requests: unknown[] = [
    repeatCell(sheetId, 1, 2000, 0, COL, COLORS.normal),
    repeatCell(sheetId, 0, 1, 0, COL, COLORS.headerBlue, COLORS.headerText, true),
  ];
  for (const p of produtos) {
    if (!p.ativo || p.estoqueAtual >= p.estoqueMinimo) continue;
    const row = p._rowNumber - 1;
    requests.push(repeatCell(sheetId, row, row + 1, 0, COL, p.estoqueAtual === 0 ? COLORS.zeroStock : COLORS.lowStock));
  }
  await req("POST", `/${spreadsheetId}:batchUpdate`, { requests });
}

export async function applyMovimentacoesColors(spreadsheetId: string, movimentacoes: Movimentacao[]): Promise<void> {
  const sheetId = await getSheetId(spreadsheetId, SHEET_MOVIMENTACOES);
  const COL = 11;
  const requests: unknown[] = [
    repeatCell(sheetId, 1, 2000, 0, COL, COLORS.normal),
    repeatCell(sheetId, 0, 1, 0, COL, COLORS.headerTeal, COLORS.headerText, true),
  ];
  const ordenadas = [...movimentacoes].reverse();
  for (let i = 0; i < ordenadas.length; i++) {
    const mov = ordenadas[i];
    if (mov.tipo === "ajuste") continue;
    const bg = mov.tipo === "entrada" ? COLORS.entradaRow : COLORS.saidaRow;
    requests.push(repeatCell(sheetId, i + 1, i + 2, 0, COL, bg));
  }
  await req("POST", `/${spreadsheetId}:batchUpdate`, { requests });
}

// ── Configuração completa da planilha ─────────────────────────────────────────
/**
 * Cria a aba "Resumo" com fórmulas dinâmicas e gráficos,
 * e aplica formatação profissional em todas as abas.
 * Pode ser re-executada sem duplicar gráficos.
 */
export async function setupSpreadsheet(spreadsheetId: string): Promise<void> {

  // ── 1. Estado atual da planilha ───────────────────────────────────────────
  const sheets = await refreshSheetIds(spreadsheetId);

  const prodId  = _sheetIdCache[SHEET_PRODUTOS]      ?? 0;
  const movId   = _sheetIdCache[SHEET_MOVIMENTACOES] ?? 0;

  // ── 2. Criar Resumo e Por Produto (se necessário) + limpar gráficos antigos ─
  const initReqs: unknown[] = [];

  if (_sheetIdCache[SHEET_RESUMO] === undefined) {
    initReqs.push({ addSheet: { properties: { title: SHEET_RESUMO, index: 0 } } });
  } else {
    // Deletar gráficos existentes para evitar duplicação
    const resumoSheet = sheets.find((s) => s.properties.title === SHEET_RESUMO);
    for (const c of resumoSheet?.charts ?? []) {
      initReqs.push({ deleteEmbeddedObject: { objectId: c.chartId } });
    }
  }

  if (_sheetIdCache[SHEET_POR_PRODUTO] === undefined) {
    initReqs.push({ addSheet: { properties: { title: SHEET_POR_PRODUTO, index: 1 } } });
  }

  if (initReqs.length > 0) {
    await req("POST", `/${spreadsheetId}:batchUpdate`, { requests: initReqs });
    await refreshSheetIds(spreadsheetId);
  }

  const resumoId     = _sheetIdCache[SHEET_RESUMO]      ?? 0;
  const porProdId    = _sheetIdCache[SHEET_POR_PRODUTO]  ?? 0;

  // ── 3. Escrever fórmulas na aba Resumo ────────────────────────────────────
  // Layout das linhas (0-indexed como referência):
  //  0: Título principal (merged A-D)
  //  1: vazio
  //  2: seção "INDICADORES"       (merged)
  //  3-9: métricas (label | valor)
  // 10: vazio
  // 11: seção "ESTOQUE POR CATEGORIA" (merged)
  // 12: cabeçalho tabela categoria
  // 13-16: dados por categoria (4 categorias)
  // 17: vazio
  // 18: seção "STATUS DO ESTOQUE" (merged)
  // 19: cabeçalho tabela status
  // 20-22: OK / Abaixo / Zerado

  const CATS = ["Refrigeração", "Eletrodomésticos", "Consumíveis", "EPI"];

  // Nomes com acentos precisam de aspas simples nas fórmulas do Sheets.
  // COUNTIF/COUNTIFS falham em locale pt-BR via API — usamos SUMPRODUCT para tudo.
  const P  = "'Produtos'";
  const MV = "'Movimentações'";
  // SUMPRODUCT helpers
  // Ativo é armazenado como booleano TRUE (não string "TRUE") via USER_ENTERED
  const sp  = (...conds: string[]) => `=SUMPRODUCT(${conds.join("*")})`;
  const ativo = `(${P}!I2:I2000=TRUE)`;

  const resumoValues: (string | number)[][] = [
    ["SISTEMA DE CONTROLE DE ESTOQUE — RESUMO GERAL"],          // 0
    [""],                                                         // 1
    ["INDICADORES PRINCIPAIS"],                                   // 2
    ["Total de Produtos",      `=COUNTA(${P}!B2:B9999)`],        // 3
    ["Produtos Ativos",        sp(ativo)],                        // 4
    ["Abaixo do Mínimo",       sp(`(${P}!G2:G2000<${P}!F2:F2000)`, ativo)], // 5
    ["Estoque Zerado",         sp(`(${P}!G2:G2000=0)`, ativo)],  // 6
    ["Total de Movimentações", `=COUNTA(${MV}!A2:A9999)`],       // 7
    ["Entradas registradas",   sp(`(${MV}!E2:E2000="entrada")`)], // 8
    ["Saídas registradas",     sp(`(${MV}!E2:E2000="saida")`)],  // 9
    [""],                                                         // 10
    ["ESTOQUE POR CATEGORIA"],                                    // 11
    ["Categoria", "Qtd Produtos", "Estoque Total"],               // 12
    ...CATS.map((cat) => [
      cat,
      sp(`(${P}!D2:D2000="${cat}")`, ativo),
      `=SUMPRODUCT((${P}!D2:D2000="${cat}")*(${P}!I2:I2000=TRUE)*(${P}!G2:G2000))`,
    ] as (string | number)[]),                                    // 13-16
    [""],                                                         // 17
    ["STATUS DO ESTOQUE"],                                        // 18
    ["Status", "Qtd Produtos"],                                   // 19
    ["Estoque OK",       sp(`(${P}!G2:G2000>=${P}!F2:F2000)`, ativo)],              // 20
    ["Abaixo do Mínimo", sp(`(${P}!G2:G2000<${P}!F2:F2000)`, `(${P}!G2:G2000>0)`, ativo)], // 21
    ["Estoque Zerado",   sp(`(${P}!G2:G2000=0)`, ativo)],        // 22
  ];

  await req(
    "PUT",
    `/${spreadsheetId}/values/${encodeURIComponent(SHEET_RESUMO + "!A1")}?valueInputOption=USER_ENTERED`,
    { values: resumoValues }
  );

  // ── 3b. Escrever aba "Por Produto" ─────────────────────────────────────────
  // Estrutura (12 colunas: A = Nº na Cat., B-L = dados do produto):
  //  Row 0: Título (mesclado A:L)
  //  Row 1: vazio
  //  Row 2: Cabeçalhos (Nº na Cat. + 11 colunas de Produtos)
  //  Row 3: A3 = ARRAYFORMULA de ranking por categoria
  //          B3 = SORT(FILTER(...)) — derrama 11 colunas (B-L) para baixo
  //
  // O ranking usa COUNTIFS para contar quantas linhas com a mesma categoria
  // têm número de linha <= linha atual (funciona porque o dado está ordenado).
  const rankFormula =
    `=ARRAYFORMULA(IF(E4:E2000="","",` +
    `COUNTIFS(E4:E2000,E4:E2000,ROW(E4:E2000),"<="&ROW(E4:E2000))))`;

  const filterFormula =
    `=SORT(FILTER('Produtos'!A2:K2000,'Produtos'!I2:I2000=TRUE),4,TRUE,2,TRUE)`;

  const porProdValues: (string | number)[][] = [
    ["ESTOQUE POR PRODUTO — AGRUPADO POR CATEGORIA"],  // row 0
    [""],                                               // row 1
    ["Nº na Cat.", ...HEADERS_PRODUTOS],                // row 2 (12 colunas)
    [rankFormula, filterFormula],                       // row 3: A3 + B3 (spill)
  ];

  await req(
    "PUT",
    `/${spreadsheetId}/values/${encodeURIComponent(SHEET_POR_PRODUTO + "!A1")}?valueInputOption=USER_ENTERED`,
    { values: porProdValues }
  );

  // ── 4. Formatar todas as abas + adicionar gráficos ────────────────────────
  const FMT: unknown[] = [

    // ════════════════════════════════════════════════════════════
    // ABA: Produtos
    // ════════════════════════════════════════════════════════════
    freezeRows(prodId),
    autoFilter(prodId, 11),

    // Cabeçalho azul profundo
    repeatCell(prodId, 0, 1, 0, 11, COLORS.headerBlue, COLORS.headerText, true, 10),
    rowHeight(prodId, 0, 1, 32),

    // Cores zerado/baixo nas linhas de dados (reset geral + reaplicar é feito em applyStockColors)
    repeatCell(prodId, 1, 5000, 0, 11, COLORS.normal),

    // Larguras das colunas
    colWidth(prodId, 0, 1, 240),  // ID (UUID)
    colWidth(prodId, 1, 2, 240),  // Nome
    colWidth(prodId, 2, 3, 130),  // SKU
    colWidth(prodId, 3, 4, 125),  // Categoria
    colWidth(prodId, 4, 5, 80),   // Unidade
    colWidth(prodId, 5, 6, 105),  // Mínimo
    colWidth(prodId, 6, 7, 100),  // Atual
    colWidth(prodId, 7, 8, 210),  // Localização
    colWidth(prodId, 8, 9, 55),   // Ativo
    colWidth(prodId, 9, 10, 160), // Criado Em
    colWidth(prodId, 10, 11, 160),// Atualizado Em

    // Formato numérico nas colunas de estoque
    numFmt(prodId, 1, 5000, 5, 7, "#,##0.##"),

    // Bordas
    borders(prodId, 0, 5000, 0, 11),

    // ════════════════════════════════════════════════════════════
    // ABA: Movimentações
    // ════════════════════════════════════════════════════════════
    freezeRows(movId),
    autoFilter(movId, 11),

    repeatCell(movId, 0, 1, 0, 11, COLORS.headerTeal, COLORS.headerText, true, 10),
    rowHeight(movId, 0, 1, 32),
    repeatCell(movId, 1, 5000, 0, 11, COLORS.normal),

    colWidth(movId, 0, 1, 240),   // ID
    colWidth(movId, 1, 2, 160),   // Data/Hora
    colWidth(movId, 2, 3, 240),   // Produto ID
    colWidth(movId, 3, 4, 200),   // Produto Nome
    colWidth(movId, 4, 5, 80),    // Tipo
    colWidth(movId, 5, 6, 90),    // Quantidade
    colWidth(movId, 6, 7, 115),   // Saldo Anterior
    colWidth(movId, 7, 8, 115),   // Saldo Posterior
    colWidth(movId, 8, 9, 140),   // Responsável
    colWidth(movId, 9, 10, 200),  // Motivo
    colWidth(movId, 10, 11, 120), // Documento

    numFmt(movId, 1, 5000, 5, 8, "#,##0.##"),
    borders(movId, 0, 5000, 0, 11),

    // ════════════════════════════════════════════════════════════
    // ABA: Resumo
    // ════════════════════════════════════════════════════════════

    // Larguras
    colWidth(resumoId, 0, 1, 220),
    colWidth(resumoId, 1, 2, 130),
    colWidth(resumoId, 2, 3, 120),
    colWidth(resumoId, 3, 4, 520), // coluna dos gráficos

    // Linha do título
    mergeCols(resumoId, 0, 0, 4),
    repeatCell(resumoId, 0, 1, 0, 4, COLORS.resumoTitle, COLORS.headerText, true, 16),
    rowHeight(resumoId, 0, 1, 52),

    // Seção INDICADORES (row 2)
    mergeCols(resumoId, 2, 0, 3),
    repeatCell(resumoId, 2, 3, 0, 3, COLORS.sectionHdr, COLORS.headerText, true, 11),
    rowHeight(resumoId, 2, 3, 28),

    // Linhas de métricas (3-9)
    repeatCell(resumoId, 3, 10, 0, 1, COLORS.metricBg),
    repeatCell(resumoId, 3, 10, 1, 2, COLORS.normal, undefined, true),
    borders(resumoId, 3, 10, 0, 2),
    numFmt(resumoId, 3, 10, 1, 2, "#,##0"),

    // Seção CATEGORIA (row 11)
    mergeCols(resumoId, 11, 0, 3),
    repeatCell(resumoId, 11, 12, 0, 3, COLORS.catHdr, COLORS.headerText, true, 11),
    rowHeight(resumoId, 11, 12, 28),

    // Cabeçalho tabela categoria (row 12)
    repeatCell(resumoId, 12, 13, 0, 3, COLORS.catLight, undefined, true),
    // Dados categoria (rows 13-16)
    repeatCell(resumoId, 13, 17, 0, 1, COLORS.metricBg),
    numFmt(resumoId, 13, 17, 1, 3, "#,##0"),
    borders(resumoId, 12, 17, 0, 3),

    // Seção STATUS (row 18)
    mergeCols(resumoId, 18, 0, 2),
    repeatCell(resumoId, 18, 19, 0, 2, COLORS.statusHdr, COLORS.headerText, true, 11),
    rowHeight(resumoId, 18, 19, 28),

    // Cabeçalho tabela status (row 19)
    repeatCell(resumoId, 19, 20, 0, 2, COLORS.statusLight, undefined, true),
    // Dados status (rows 20-22)
    repeatCell(resumoId, 20, 23, 0, 1, COLORS.metricBg),
    numFmt(resumoId, 20, 23, 1, 2, "#,##0"),
    borders(resumoId, 19, 23, 0, 2),

    // ════════════════════════════════════════════════════════════
    // GRÁFICOS
    // ════════════════════════════════════════════════════════════

    // ── Gráfico 1: Pizza — Status do Estoque ──────────────────
    // Posição: Resumo, col D (3), linha 1
    {
      addChart: {
        chart: {
          spec: {
            title: "Status do Estoque",
            titleTextFormat: { bold: true, fontSize: 13 },
            backgroundColor: rgbChart(250, 250, 255),
            pieChart: {
              legendPosition: "RIGHT_LEGEND",
              domain: srcRange(resumoId, 20, 23, 0, 1),
              series: srcRange(resumoId, 20, 23, 1, 2),
              threeDimensional: false,
            },
          },
          position: anchor(resumoId, 1, 3, 500, 300),
        },
      },
    },

    // ── Gráfico 2: Barras — Estoque por Categoria ─────────────
    // Posição: Resumo, col D (3), linha 11
    {
      addChart: {
        chart: {
          spec: {
            title: "Estoque por Categoria",
            titleTextFormat: { bold: true, fontSize: 13 },
            backgroundColor: rgbChart(250, 255, 252),
            basicChart: {
              chartType: "BAR",
              legendPosition: "NO_LEGEND",
              axis: [
                { position: "BOTTOM_AXIS", title: "Qtd. em Estoque" },
                { position: "LEFT_AXIS", title: "" },
              ],
              domains: [{
                domain: srcRange(resumoId, 13, 17, 0, 1),
              }],
              series: [{
                series: srcRange(resumoId, 13, 17, 2, 3),
                targetAxis: "BOTTOM_AXIS",
              }],
              headerCount: 0,
            },
          },
          position: anchor(resumoId, 11, 3, 500, 280),
        },
      },
    },

    // ── Gráfico 3: Colunas — Produtos Ativos por Categoria ────
    // Posição: Resumo, col D (3), linha 19
    {
      addChart: {
        chart: {
          spec: {
            title: "Produtos por Categoria",
            titleTextFormat: { bold: true, fontSize: 13 },
            backgroundColor: rgbChart(255, 252, 250),
            basicChart: {
              chartType: "COLUMN",
              legendPosition: "NO_LEGEND",
              axis: [
                { position: "BOTTOM_AXIS", title: "Categoria" },
                { position: "LEFT_AXIS", title: "Qtd. de Produtos" },
              ],
              domains: [{
                domain: srcRange(resumoId, 13, 17, 0, 1),
              }],
              series: [{
                series: srcRange(resumoId, 13, 17, 1, 2),
                targetAxis: "LEFT_AXIS",
              }],
              headerCount: 0,
            },
          },
          position: anchor(resumoId, 19, 3, 500, 280),
        },
      },
    },

    // ════════════════════════════════════════════════════════════
    // ABA: Por Produto (12 colunas: A = Nº na Cat., B-L = dados)
    // ════════════════════════════════════════════════════════════

    // Remove filtro existente ANTES do merge para evitar conflito.
    // (clearBasicFilter é no-op se não houver filtro — seguro na 1ª execução)
    { clearBasicFilter: { sheetId: porProdId } },

    freezeRows(porProdId, 3),

    // Título (row 0) — mesclado A:L (12 colunas)
    mergeCols(porProdId, 0, 0, 12),
    repeatCell(porProdId, 0, 1, 0, 12, COLORS.resumoTitle, COLORS.headerText, true, 14),
    rowHeight(porProdId, 0, 1, 48),

    // Linha 1 vazia
    repeatCell(porProdId, 1, 2, 0, 12, COLORS.normal),
    rowHeight(porProdId, 1, 2, 8),

    // Cabeçalho (row 2) — 12 colunas
    repeatCell(porProdId, 2, 3, 0, 12, COLORS.headerBlue, COLORS.headerText, true, 10),
    rowHeight(porProdId, 2, 3, 32),
    // autoFilter começa na row 2 (índice 2) para não conflitar com o merge do título (row 0)
    autoFilter(porProdId, 12, 2),

    // Dados (rows 3+) — 12 colunas
    repeatCell(porProdId, 3, 5000, 0, 12, COLORS.normal),
    // Nº na Cat. (col A) — alinhamento central e bold
    repeatCell(porProdId, 3, 5000, 0, 1, COLORS.sectionLight, undefined, true),
    // Colunas de estoque mínimo e atual (cols F e G = índices 6 e 7 no sheet, mas shifted +1 = 6-7)
    numFmt(porProdId, 3, 5000, 6, 8, "#,##0.##"),
    borders(porProdId, 2, 5000, 0, 12),

    // Largura col A: Nº na Cat.
    colWidth(porProdId, 0, 1, 72),
    // Colunas B-L (índices 1-11): mesmas larguras da aba Produtos
    colWidth(porProdId, 1, 2, 240),   // B: ID
    colWidth(porProdId, 2, 3, 240),   // C: Nome
    colWidth(porProdId, 3, 4, 130),   // D: SKU
    colWidth(porProdId, 4, 5, 125),   // E: Categoria
    colWidth(porProdId, 5, 6, 80),    // F: Unidade
    colWidth(porProdId, 6, 7, 105),   // G: Estoque Mínimo
    colWidth(porProdId, 7, 8, 100),   // H: Estoque Atual
    colWidth(porProdId, 8, 9, 210),   // I: Localização
    colWidth(porProdId, 9, 10, 55),   // J: Ativo
    colWidth(porProdId, 10, 11, 160), // K: Criado Em
    colWidth(porProdId, 11, 12, 160), // L: Atualizado Em
  ];

  await req("POST", `/${spreadsheetId}:batchUpdate`, { requests: FMT });
}

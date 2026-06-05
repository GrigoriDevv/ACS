/**
 * Configura aba Resumo + Por Produto + formatação (igual planilha modelo).
 * Uso: npx tsx scripts/setup-resumo.ts
 */
import fs from "fs";

// Carrega .env ANTES de importar sheets/auth
const envFile = fs.readFileSync(".env", "utf8");
for (const line of envFile.split("\n")) {
  const m = line.match(/^([^#=\s][^=]*)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

const { ensureSheets, setupSpreadsheet, loadProdutos, applyStockColors } = await import("../src/api/sheets");
const { normalizeSpreadsheetId } = await import("../src/lib/spreadsheetId");

const sheetId = normalizeSpreadsheetId(process.env.VITE_SPREADSHEET_ID);
if (!sheetId) throw new Error("VITE_SPREADSHEET_ID não definido no .env");

console.log("Planilha:", sheetId);
console.log("1/3 Garantindo abas Produtos e Movimentações...");
await ensureSheets(sheetId);

console.log("2/3 Configurando Resumo, Por Produto, formatação e gráficos...");
await setupSpreadsheet(sheetId);

console.log("3/3 Aplicando cores de alerta...");
const produtos = await loadProdutos(sheetId);
await applyStockColors(sheetId, produtos);

console.log(`\n✓ Concluído! ${produtos.length} produtos na aba Produtos`);
console.log(`  Abra a aba "Resumo" (primeira aba):`);
console.log(`  https://docs.google.com/spreadsheets/d/${sheetId}`);

/** Extrai o ID de uma URL do Google Sheets ou devolve o valor já limpo. */
export function normalizeSpreadsheetId(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : trimmed;
}

const nodeEnv = (globalThis as { process?: { env?: Record<string, string> } }).process?.env;
const SA_EMAIL =
  (import.meta.env?.VITE_SA_CLIENT_EMAIL as string | undefined)?.trim() ??
  nodeEnv?.VITE_SA_CLIENT_EMAIL?.trim() ??
  "acs-569@acsrefrigeracao.iam.gserviceaccount.com";

/** Traduz erros comuns da Google Sheets API para português. */
export function formatSheetsError(message: string): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("does not have permission") ||
    lower.includes("permission denied") ||
    lower.includes("forbidden")
  ) {
    return (
      `Sem permissão na planilha Google Sheets. ` +
      `Abra a planilha → Compartilhar → adicione ${SA_EMAIL} como Editor. ` +
      `Se estiver na Vercel, confira também as variáveis VITE_SA_* no painel do projeto.`
    );
  }

  if (lower.includes("requested entity was not found") || lower.includes("not found")) {
    return "Planilha não encontrada. Verifique VITE_SPREADSHEET_ID no .env ou nas variáveis da Vercel.";
  }

  if (lower.includes("invalid_grant") || lower.includes("private key")) {
    return "Chave da Service Account inválida. Verifique VITE_SA_PRIVATE_KEY (use \\n entre as linhas do PEM).";
  }

  return message;
}

export function getServiceAccountEmail(): string {
  return SA_EMAIL;
}

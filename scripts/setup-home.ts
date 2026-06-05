/**
 * Configura Página1 com resumo visível e executa setupSpreadsheet.
 * Uso: npx tsx scripts/setup-sheet.ts
 */
import crypto from "crypto";
import fs from "fs";

const env = fs.readFileSync(".env", "utf8");
const get = (k: string) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1]?.trim();
const email = get("VITE_SA_CLIENT_EMAIL")!;
const pem = get("VITE_SA_PRIVATE_KEY")!.replace(/\\n/g, "\n");
const sheetId = get("VITE_SPREADSHEET_ID")!;

async function getToken() {
  const now = Math.floor(Date.now() / 1000);
  const h = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const p = Buffer.from(JSON.stringify({
    iss: email, sub: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  })).toString("base64url");
  const sig = crypto.sign("RSA-SHA256", Buffer.from(`${h}.${p}`), pem);
  const jwt = `${h}.${p}.${sig.toString("base64url")}`;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(JSON.stringify(d));
  return d.access_token as string;
}

async function main() {
  const BASE = "https://sheets.googleapis.com/v4/spreadsheets";
  const t = await getToken();
  const auth = { Authorization: `Bearer ${t}`, "Content-Type": "application/json" };

  const P = "Produtos";
  const ativo = `(${P}!I2:I2000=TRUE)`;

  // Escreve painel na Página1 (aba que o usuário vê ao abrir)
  const homeValues: (string | number)[][] = [
    ["ACS GESTÃO — PAINEL DE ESTOQUE"],
    [""],
    ["Indicador", "Valor"],
    ["Total de Produtos", `=COUNTA(${P}!B2:B9999)`],
    ["Produtos Ativos", `=SUMPRODUCT(${ativo})`],
    ["Abaixo do Mínimo", `=SUMPRODUCT((${P}!G2:G2000<${P}!F2:F2000)*${ativo})`],
    ["Estoque Zerado", `=SUMPRODUCT((${P}!G2:G2000=0)*${ativo})`],
    [""],
    ["→ Clique na aba \"Produtos\" abaixo para ver todos os itens"],
    ["→ No app, clique \"Configurar planilha\" para criar aba Resumo com gráficos"],
  ];

  const w = await fetch(
    `${BASE}/${sheetId}/values/${encodeURIComponent("Página1!A1")}?valueInputOption=USER_ENTERED`,
    { method: "PUT", headers: auth, body: JSON.stringify({ values: homeValues }) }
  );
  if (!w.ok) throw new Error(JSON.stringify(await w.json()));
  console.log("✓ Página1 atualizada com painel de resumo");

  // Verificar Produtos
  const prod = await (await fetch(
    `${BASE}/${sheetId}/values/Produtos!A1:B3`, { headers: auth }
  )).json() as { values?: string[][] };
  console.log("✓ Aba Produtos:", prod.values?.length ?? 0, "linhas visíveis");
  if (prod.values?.[1]) console.log("  Exemplo:", prod.values[1][1]);

  console.log(`\nAbra: https://docs.google.com/spreadsheets/d/${sheetId}`);
  console.log("Atualize a página (F5) — você verá os números na Página1 e os produtos na aba Produtos.");
}

main().catch((e) => { console.error("FALHA:", e.message); process.exit(1); });

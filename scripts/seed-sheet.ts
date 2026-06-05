import crypto from "crypto";
import fs from "fs";
import { SEED_PRODUCTS } from "../src/data/seedProducts";

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

  const HEADERS = [
    "ID", "Nome", "SKU", "Categoria", "Unidade",
    "Estoque Mínimo", "Estoque Atual", "Localização", "Ativo",
    "Criado Em", "Atualizado Em",
  ];

  await fetch(`${BASE}/${sheetId}/values/${encodeURIComponent("Produtos!A1")}?valueInputOption=RAW`, {
    method: "PUT", headers: auth, body: JSON.stringify({ values: [HEADERS] }),
  });
  console.log("✓ Cabeçalhos escritos");

  await fetch(`${BASE}/${sheetId}/values/${encodeURIComponent("Produtos!A2:Z")}:clear`, {
    method: "POST", headers: auth,
  });
  console.log("✓ Dados antigos limpos");

  const now = new Date().toISOString();
  const rows = SEED_PRODUCTS.map((item) => [
    crypto.randomUUID(), item.nome, item.sku, item.categoria, item.unidade,
    item.estoqueMinimo, item.estoqueAtual ?? 0, item.localizacao,
    item.ativo, now, now,
  ]);
  const w = await fetch(
    `${BASE}/${sheetId}/values/${encodeURIComponent("Produtos!A:K")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: "POST", headers: auth, body: JSON.stringify({ values: rows }) }
  );
  const wd = await w.json();
  if (!w.ok) throw new Error(JSON.stringify(wd));
  console.log(`✓ ${rows.length} produtos importados`);

  const v = await (await fetch(`${BASE}/${sheetId}/values/Produtos!B2:B5`, { headers: auth })).json();
  console.log("  Amostra:", (v as { values?: string[][] }).values?.map((r) => r[0]).join(", "));
  console.log(`\nLink: https://docs.google.com/spreadsheets/d/${sheetId}`);
}

main().catch((e) => { console.error("FALHA:", e.message); process.exit(1); });

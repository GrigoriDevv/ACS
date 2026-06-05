/**
 * Email alerts via EmailJS CDN — no npm package needed.
 * The script is loaded on first use and cached for subsequent calls.
 */

import type { AlertaEstoque } from "../types";

const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string | undefined;
const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID  as string | undefined;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string | undefined;
const ALERT_EMAIL = import.meta.env.VITE_ALERT_EMAIL         as string | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EmailJS = { init: (key: string) => void; send: (svc: string, tpl: string, params: Record<string, string>) => Promise<unknown> };

let emailjs: EmailJS | null = null;

function loadEmailJS(): Promise<EmailJS> {
  if (emailjs) return Promise.resolve(emailjs);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-emailjs]');
    if (existing) {
      // Script already in DOM but not yet resolved — wait for it
      existing.addEventListener("load", () => resolve((window as unknown as { emailjs: EmailJS }).emailjs));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.dataset.emailjs = "1";
    script.onload = () => {
      emailjs = (window as unknown as { emailjs: EmailJS }).emailjs;
      emailjs.init(PUBLIC_KEY!);
      resolve(emailjs);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export function isEmailConfigured(): boolean {
  return !!(PUBLIC_KEY && SERVICE_ID && TEMPLATE_ID && ALERT_EMAIL);
}

/** Sends a low-stock alert email with the list of products below minimum. */
export async function sendLowStockAlert(alerts: AlertaEstoque[]): Promise<void> {
  if (!isEmailConfigured()) {
    throw new Error(
      "Email not configured. Add VITE_EMAILJS_* and VITE_ALERT_EMAIL to .env."
    );
  }
  if (alerts.length === 0) {
    throw new Error("No products in alert to notify.");
  }

  const ejs = await loadEmailJS();

  const productList = alerts
    .map((a) => {
      const level = a.criticidade === "critico" ? "CRITICAL" : "LOW";
      return `[${level}]  ${a.nome} (${a.sku})\n   Current: ${a.estoqueAtual}  |  Min: ${a.estoqueMinimo}`;
    })
    .join("\n\n");

  const critical = alerts.filter((a) => a.criticidade === "critico").length;

  await ejs.send(SERVICE_ID!, TEMPLATE_ID!, {
    to_email:      ALERT_EMAIL!,
    subject:       `[Inventory] ${alerts.length} product(s) below minimum — ${critical} critical`,
    produtos_lista: productList,
    total_alertas: String(alerts.length),
    criticos:      String(critical),
    data_hora:     new Date().toLocaleString("pt-BR"),
  });
}

/**
 * Persistência local permanente (localStorage — sem expiração).
 * Espelha todos os dados cadastrados e rascunhos de formulários.
 */

import type { Funcionario, LancamentoFinanceiro, Movimentacao, Produto } from "../types";

const PREFIX = "acs_v1_";

const KEYS = {
  produtos:       `${PREFIX}produtos`,
  movimentacoes:  `${PREFIX}movimentacoes`,
  funcionarios:   `${PREFIX}funcionarios`,
  lancamentos:    `${PREFIX}lancamentos`,
  adminAuth:      `${PREFIX}admin_auth`,
} as const;

function save(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota exceeded — ignora silenciosamente */
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ── Inventário ────────────────────────────────────────────────────────────────

export function saveInventory(produtos: Produto[], movimentacoes: Movimentacao[]): void {
  save(KEYS.produtos, produtos);
  save(KEYS.movimentacoes, movimentacoes);
}

export function loadInventory(): { produtos: Produto[]; movimentacoes: Movimentacao[] } {
  return {
    produtos:      load<Produto[]>(KEYS.produtos, []),
    movimentacoes: load<Movimentacao[]>(KEYS.movimentacoes, []),
  };
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export function saveAdmin(funcionarios: Funcionario[], lancamentos: LancamentoFinanceiro[]): void {
  save(KEYS.funcionarios, funcionarios);
  save(KEYS.lancamentos, lancamentos);
}

export function loadAdmin(): { funcionarios: Funcionario[]; lancamentos: LancamentoFinanceiro[] } {
  return {
    funcionarios: load<Funcionario[]>(KEYS.funcionarios, []),
    lancamentos:  load<LancamentoFinanceiro[]>(KEYS.lancamentos, []),
  };
}

// ── Admin auth (permanente — localStorage, não expira ao fechar aba) ──────────

export function isAdminAuthenticated(): boolean {
  return localStorage.getItem(KEYS.adminAuth) === "1";
}

export function setAdminAuthenticated(value: boolean): void {
  if (value) localStorage.setItem(KEYS.adminAuth, "1");
  else localStorage.removeItem(KEYS.adminAuth);
}

// ── Rascunhos de formulários ──────────────────────────────────────────────────

export function saveDraft<T>(name: string, data: T): void {
  save(`${PREFIX}draft_${name}`, data);
}

export function loadDraft<T>(name: string, fallback: T): T {
  return load(`${PREFIX}draft_${name}`, fallback);
}

export function clearDraft(name: string): void {
  localStorage.removeItem(`${PREFIX}draft_${name}`);
}

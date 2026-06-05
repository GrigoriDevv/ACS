import { useCallback, useEffect, useReducer } from "react";
import { getToken, revokeToken, isConfigured } from "../api/auth";
import {
  ensureSheets,
  ensureAdminSheets,
  loadProdutos,
  loadMovimentacoes,
  loadFuncionarios,
  addProduto,
  updateProduto,
  addMovimentacao,
  applyStockColors,
  applyMovimentacoesColors,
  seedProdutos,
  clearSheetData,
  setupSpreadsheet,
  SHEET_PRODUTOS,
  SHEET_MOVIMENTACOES,
} from "../api/sheets";
import { SEED_PRODUCTS } from "../data/seedProducts";
import { sendLowStockAlert, isEmailConfigured } from "../api/email";
import { normalizeSpreadsheetId } from "../lib/spreadsheetId";
import { formatSheetsError } from "../lib/sheetsError";
import { loadInventory, saveInventory, loadAdmin, saveAdmin } from "../lib/localStore";
import type { Funcionario, Movimentacao, Produto, TipoMovimentacao } from "../types";
import { alertaFromProduto, produtoAbaixoMinimo } from "../types";
import { snapshotFuncionario, snapshotResponsavel } from "../lib/funcionario";

// ── State ─────────────────────────────────────────────────────────────────────
interface State {
  ready: boolean;           // data loaded at least once
  loading: boolean;
  colorizing: boolean;
  seeding: boolean;
  resetting: boolean;
  settingUp: boolean;
  sendingEmail: boolean;
  error: string | null;
  emailStatus: string | null;
  produtos: Produto[];
  movimentacoes: Movimentacao[];
  funcionarios: Funcionario[];
}

type Action =
  | { type: "READY" }
  | { type: "LOADING"; payload: boolean }
  | { type: "COLORIZING"; payload: boolean }
  | { type: "SEEDING"; payload: boolean }
  | { type: "RESETTING"; payload: boolean }
  | { type: "SETTING_UP"; payload: boolean }
  | { type: "SENDING_EMAIL"; payload: boolean }
  | { type: "ERROR"; payload: string | null }
  | { type: "EMAIL_STATUS"; payload: string | null }
  | { type: "SET_PRODUTOS"; payload: Produto[] }
  | { type: "SET_MOVIMENTACOES"; payload: Movimentacao[] }
  | { type: "SET_FUNCIONARIOS"; payload: Funcionario[] }
  | { type: "UPDATE_PRODUTO"; payload: Produto }
  | { type: "ADD_PRODUTO"; payload: Produto }
  | { type: "ADD_MOVIMENTACAO"; payload: Movimentacao };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "READY":         return { ...state, ready: true, loading: false };
    case "LOADING":       return { ...state, loading: action.payload };
    case "COLORIZING":    return { ...state, colorizing: action.payload };
    case "SEEDING":       return { ...state, seeding: action.payload };
    case "RESETTING":     return { ...state, resetting: action.payload };
    case "SETTING_UP":    return { ...state, settingUp: action.payload };
    case "SENDING_EMAIL": return { ...state, sendingEmail: action.payload };
    case "ERROR":         return { ...state, error: action.payload, loading: false };
    case "EMAIL_STATUS":  return { ...state, emailStatus: action.payload };
    case "SET_PRODUTOS":      return { ...state, produtos: action.payload };
    case "SET_MOVIMENTACOES": return { ...state, movimentacoes: action.payload };
    case "SET_FUNCIONARIOS":  return { ...state, funcionarios: action.payload };
    case "UPDATE_PRODUTO":
      return {
        ...state,
        produtos: state.produtos.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    case "ADD_PRODUTO":
      return { ...state, produtos: [...state.produtos, action.payload] };
    case "ADD_MOVIMENTACAO":
      return { ...state, movimentacoes: [action.payload, ...state.movimentacoes] };
    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
const SHEET_ID = normalizeSpreadsheetId(import.meta.env.VITE_SPREADSHEET_ID as string);
const cached = loadInventory();

export function useInventory() {
  const [state, dispatch] = useReducer(reducer, {
    ready: cached.produtos.length > 0,
    loading: true,
    colorizing: false,
    seeding: false,
    resetting: false,
    settingUp: false,
    sendingEmail: false,
    error: null,
    emailStatus: null,
    produtos: cached.produtos,
    movimentacoes: cached.movimentacoes,
    funcionarios: loadAdmin().funcionarios,
  });

  // Persiste localmente a cada alteração (sem expiração)
  useEffect(() => {
    saveInventory(state.produtos, state.movimentacoes);
  }, [state.produtos, state.movimentacoes]);

  // ── Load data ───────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!SHEET_ID) {
      dispatch({ type: "ERROR", payload: "VITE_SPREADSHEET_ID não configurado no .env" });
      return;
    }
    try {
      dispatch({ type: "LOADING", payload: true });
      dispatch({ type: "ERROR", payload: null });
      // getToken() handles service account JWT automatically
      await getToken();
      await ensureSheets(SHEET_ID);
      try {
        await ensureAdminSheets(SHEET_ID);
      } catch (adminErr) {
        console.warn("Abas admin:", adminErr);
      }
      const [prods, movs, funcs] = await Promise.all([
        loadProdutos(SHEET_ID),
        loadMovimentacoes(SHEET_ID),
        loadFuncionarios(SHEET_ID).catch(() => loadAdmin().funcionarios),
      ]);
      dispatch({ type: "SET_PRODUTOS", payload: prods });
      dispatch({ type: "SET_MOVIMENTACOES", payload: movs });
      dispatch({ type: "SET_FUNCIONARIOS", payload: funcs });
      saveAdmin(funcs, loadAdmin().lancamentos);
      dispatch({ type: "READY" });
    } catch (e) {
      const msg = formatSheetsError((e as Error).message);
      const local = loadInventory();
      if (local.produtos.length > 0) {
        dispatch({ type: "SET_PRODUTOS", payload: local.produtos });
        dispatch({ type: "SET_MOVIMENTACOES", payload: local.movimentacoes });
        dispatch({ type: "SET_FUNCIONARIOS", payload: loadAdmin().funcionarios });
        dispatch({
          type: "ERROR",
          payload: `Planilha indisponível (${msg}). Exibindo dados salvos localmente.`,
        });
        dispatch({ type: "READY" });
      } else {
        dispatch({ type: "ERROR", payload: msg });
      }
    }
  }, []);

  // Auto-load on mount
  useEffect(() => { loadData(); }, [loadData]);

  // ── Color spreadsheet ───────────────────────────────────────────────────────
  const colorSpreadsheet = useCallback(async () => {
    try {
      dispatch({ type: "COLORIZING", payload: true });
      await Promise.all([
        applyStockColors(SHEET_ID, state.produtos),
        applyMovimentacoesColors(SHEET_ID, state.movimentacoes),
      ]);
    } catch (e) {
      dispatch({ type: "ERROR", payload: (e as Error).message });
    } finally {
      dispatch({ type: "COLORIZING", payload: false });
    }
  }, [state.produtos, state.movimentacoes]);

  // ── Send alert email ────────────────────────────────────────────────────────
  const sendAlertEmail = useCallback(async () => {
    const alerts = state.produtos.filter(produtoAbaixoMinimo).map(alertaFromProduto);
    try {
      dispatch({ type: "SENDING_EMAIL", payload: true });
      dispatch({ type: "EMAIL_STATUS", payload: null });
      await sendLowStockAlert(alerts);
      dispatch({ type: "EMAIL_STATUS", payload: `Email sent with ${alerts.length} alert(s).` });
    } catch (e) {
      dispatch({ type: "EMAIL_STATUS", payload: `Error: ${(e as Error).message}` });
    } finally {
      dispatch({ type: "SENDING_EMAIL", payload: false });
    }
  }, [state.produtos]);

  // ── Register product ────────────────────────────────────────────────────────
  const registerProduct = useCallback(
    async (data: Omit<Produto, "id" | "estoqueAtual" | "criadoEm" | "atualizadoEm" | "_rowNumber">) => {
      const now = new Date().toISOString();
      const produto: Produto = {
        ...data,
        id: crypto.randomUUID(),
        estoqueAtual: 0,
        criadoEm: now,
        atualizadoEm: now,
        _rowNumber: 0,
      };
      dispatch({ type: "ADD_PRODUTO", payload: produto });
      try {
        dispatch({ type: "ERROR", payload: null });
        await addProduto(SHEET_ID, produto);
        const prods = await loadProdutos(SHEET_ID);
        dispatch({ type: "SET_PRODUTOS", payload: prods });
      } catch (e) {
        dispatch({
          type: "ERROR",
          payload: `Salvo localmente, mas falha ao sincronizar planilha: ${(e as Error).message}`,
        });
        throw e;
      }
    },
    []
  );

  // ── Register movement ───────────────────────────────────────────────────────
  const registerMovement = useCallback(
    async (params: {
      produtoId: string;
      tipo: TipoMovimentacao;
      quantidade: number;
      responsavel: string;
      funcionarioId?: string;
      motivo: string;
      documento?: string;
    }) => {
      const produto = state.produtos.find((p) => p.id === params.produtoId);
      if (!produto) throw new Error("Product not found.");
      if (!produto.ativo) throw new Error("Product is inactive.");

      if (params.tipo === "saida" && produto.estoqueAtual < params.quantidade) {
        throw new Error(
          `Insufficient stock. Available: ${produto.estoqueAtual} ${produto.unidade}.`
        );
      }

      const saldoAnterior = produto.estoqueAtual;
      const saldoPosterior =
        params.tipo === "entrada" ? saldoAnterior + params.quantidade
        : params.tipo === "saida" ? saldoAnterior - params.quantidade
        : params.quantidade;

      const now = new Date().toISOString();

      const allFuncs = state.funcionarios.length > 0
        ? state.funcionarios
        : loadAdmin().funcionarios;
      const func = params.funcionarioId
        ? allFuncs.find((f) => f.id === params.funcionarioId && f.status === "ativo")
        : undefined;
      const funcSnap = func
        ? snapshotFuncionario(func)
        : snapshotResponsavel(params.responsavel);

      const mov: Movimentacao = {
        id: crypto.randomUUID(),
        dataHora: now,
        produtoId: produto.id,
        produtoNome: produto.nome,
        tipo: params.tipo,
        quantidade: params.quantidade,
        saldoAnterior,
        saldoPosterior,
        ...funcSnap,
        motivo: params.motivo,
        documento: params.documento ?? "",
      };

      const updated: Produto = { ...produto, estoqueAtual: saldoPosterior, atualizadoEm: now };

      dispatch({ type: "UPDATE_PRODUTO", payload: updated });
      dispatch({ type: "ADD_MOVIMENTACAO", payload: mov });

      try {
        dispatch({ type: "ERROR", payload: null });
        await Promise.all([updateProduto(SHEET_ID, updated), addMovimentacao(SHEET_ID, mov)]);
      } catch (e) {
        dispatch({
          type: "ERROR",
          payload: `Salvo localmente, mas falha ao sincronizar planilha: ${(e as Error).message}`,
        });
        throw e;
      }

      const wasOk    = saldoAnterior >= produto.estoqueMinimo;
      const nowBelow = saldoPosterior < produto.estoqueMinimo;
      if (wasOk && nowBelow) {
        applyStockColors(SHEET_ID, [updated]).catch(() => null);
        if (isEmailConfigured()) {
          sendLowStockAlert([alertaFromProduto(updated)]).catch(() => null);
        }
      }
    },
    [state.produtos, state.funcionarios]
  );

  // ── Update stock (ajuste manual) ────────────────────────────────────────────
  const updateStock = useCallback(
    async (produtoId: string, novoEstoque: number) => {
      if (isNaN(novoEstoque) || novoEstoque < 0) {
        throw new Error("Estoque inválido. Informe um número maior ou igual a zero.");
      }

      const produto = state.produtos.find((p) => p.id === produtoId);
      if (!produto) throw new Error("Produto não encontrado.");
      if (!produto.ativo) throw new Error("Produto inativo.");
      if (produto.estoqueAtual === novoEstoque) return;

      const saldoAnterior = produto.estoqueAtual;
      const now = new Date().toISOString();

      const mov: Movimentacao = {
        id: crypto.randomUUID(),
        dataHora: now,
        produtoId: produto.id,
        produtoNome: produto.nome,
        tipo: "ajuste",
        quantidade: novoEstoque,
        saldoAnterior,
        saldoPosterior: novoEstoque,
        ...snapshotResponsavel("Ajuste manual"),
        motivo: "Correção de estoque via tela de produtos",
        documento: "",
      };

      const updated: Produto = { ...produto, estoqueAtual: novoEstoque, atualizadoEm: now };

      dispatch({ type: "UPDATE_PRODUTO", payload: updated });
      dispatch({ type: "ADD_MOVIMENTACAO", payload: mov });

      try {
        dispatch({ type: "ERROR", payload: null });
        await Promise.all([updateProduto(SHEET_ID, updated), addMovimentacao(SHEET_ID, mov)]);
        applyStockColors(SHEET_ID, [updated]).catch(() => null);
      } catch (e) {
        dispatch({
          type: "ERROR",
          payload: `Salvo localmente, mas falha ao sincronizar planilha: ${(e as Error).message}`,
        });
        throw e;
      }
    },
    [state.produtos]
  );

  // ── Setup spreadsheet (formatting + charts + Resumo sheet) ─────────────────
  const setupSheet = useCallback(async () => {
    try {
      dispatch({ type: "SETTING_UP", payload: true });
      dispatch({ type: "ERROR", payload: null });
      await setupSpreadsheet(SHEET_ID);
    } catch (e) {
      dispatch({ type: "ERROR", payload: (e as Error).message });
    } finally {
      dispatch({ type: "SETTING_UP", payload: false });
    }
  }, []);

  // ── Seed products ───────────────────────────────────────────────────────────
  const importSeedProducts = useCallback(async () => {
    try {
      dispatch({ type: "SEEDING", payload: true });
      dispatch({ type: "ERROR", payload: null });
      await seedProdutos(SHEET_ID, SEED_PRODUCTS);
      await loadData();
    } catch (e) {
      dispatch({ type: "ERROR", payload: (e as Error).message });
    } finally {
      dispatch({ type: "SEEDING", payload: false });
    }
  }, [loadData]);

  // ── Reset + reseed (limpa tudo e reimporta o catálogo com estoque fictício) ──
  const resetAndSeed = useCallback(async () => {
    try {
      dispatch({ type: "RESETTING", payload: true });
      dispatch({ type: "ERROR", payload: null });
      await Promise.all([
        clearSheetData(SHEET_ID, SHEET_PRODUTOS),
        clearSheetData(SHEET_ID, SHEET_MOVIMENTACOES),
      ]);
      await seedProdutos(SHEET_ID, SEED_PRODUCTS);
      await loadData();
    } catch (e) {
      dispatch({ type: "ERROR", payload: (e as Error).message });
    } finally {
      dispatch({ type: "RESETTING", payload: false });
    }
  }, [loadData]);

  // ── Logout (clears token cache, reloads) ────────────────────────────────────
  const logout = useCallback(() => {
    revokeToken();
    loadData();
  }, [loadData]);

  const alerts = state.produtos.filter(produtoAbaixoMinimo).map(alertaFromProduto);

  return {
    ...state,
    alerts,
    configured: isConfigured(),
    emailConfigured: isEmailConfigured(),
    loadData,
    registerProduct,
    registerMovement,
    updateStock,
    colorSpreadsheet,
    sendAlertEmail,
    importSeedProducts,
    resetAndSeed,
    setupSheet,
    logout,
  };
}

export type InventoryHook = ReturnType<typeof useInventory>;

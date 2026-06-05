import { useCallback, useEffect, useReducer } from "react";
import {
  ensureAdminSheets,
  loadFuncionarios,
  addFuncionario,
  updateFuncionario,
  loadLancamentos,
  addLancamento,
} from "../api/sheets";
import type { Funcionario, LancamentoFinanceiro } from "../types";
import { snapshotFuncionario, snapshotResponsavel } from "../lib/funcionario";
import { normalizeSpreadsheetId } from "../lib/spreadsheetId";
import {
  isAdminAuthenticated,
  loadAdmin,
  saveAdmin,
  setAdminAuthenticated,
} from "../lib/localStore";

const SHEET_ID     = normalizeSpreadsheetId(import.meta.env.VITE_SPREADSHEET_ID as string);
const ADMIN_USER   = import.meta.env.VITE_ADMIN_USER     as string ?? "admin";
const ADMIN_PASS   = import.meta.env.VITE_ADMIN_PASSWORD  as string ?? "";

// ── State ─────────────────────────────────────────────────────────────────────
interface State {
  authenticated: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  funcionarios: Funcionario[];
  lancamentos: LancamentoFinanceiro[];
}

type Action =
  | { type: "AUTH"; payload: boolean }
  | { type: "LOADING"; payload: boolean }
  | { type: "SAVING"; payload: boolean }
  | { type: "ERROR"; payload: string | null }
  | { type: "SET_FUNCIONARIOS"; payload: Funcionario[] }
  | { type: "SET_LANCAMENTOS"; payload: LancamentoFinanceiro[] }
  | { type: "ADD_FUNCIONARIO"; payload: Funcionario }
  | { type: "UPDATE_FUNCIONARIO"; payload: Funcionario }
  | { type: "ADD_LANCAMENTO"; payload: LancamentoFinanceiro };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "AUTH":     return { ...state, authenticated: action.payload };
    case "LOADING":  return { ...state, loading: action.payload };
    case "SAVING":   return { ...state, saving: action.payload };
    case "ERROR":    return { ...state, error: action.payload };
    case "SET_FUNCIONARIOS": return { ...state, funcionarios: action.payload };
    case "SET_LANCAMENTOS":  return { ...state, lancamentos: action.payload };
    case "ADD_FUNCIONARIO":
      return { ...state, funcionarios: [...state.funcionarios, action.payload] };
    case "UPDATE_FUNCIONARIO":
      return {
        ...state,
        funcionarios: state.funcionarios.map((f) =>
          f.id === action.payload.id ? action.payload : f
        ),
      };
    case "ADD_LANCAMENTO":
      return { ...state, lancamentos: [action.payload, ...state.lancamentos] };
    default: return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
const cachedAdmin = loadAdmin();

export function useAdmin() {
  const [state, dispatch] = useReducer(reducer, {
    authenticated: isAdminAuthenticated(),
    loading: false,
    saving: false,
    error: null,
    funcionarios: cachedAdmin.funcionarios,
    lancamentos: cachedAdmin.lancamentos,
  });

  useEffect(() => {
    saveAdmin(state.funcionarios, state.lancamentos);
  }, [state.funcionarios, state.lancamentos]);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const login = useCallback((user: string, password: string): boolean => {
    const ok = user === ADMIN_USER && password === ADMIN_PASS;
    if (ok) {
      setAdminAuthenticated(true);
      dispatch({ type: "AUTH", payload: true });
      dispatch({ type: "ERROR", payload: null });
    } else {
      dispatch({ type: "ERROR", payload: "Usuário ou senha incorretos." });
    }
    return ok;
  }, []);

  const logout = useCallback(() => {
    setAdminAuthenticated(false);
    dispatch({ type: "AUTH", payload: false });
  }, []);

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadAdminData = useCallback(async () => {
    try {
      dispatch({ type: "LOADING", payload: true });
      dispatch({ type: "ERROR", payload: null });
      await ensureAdminSheets(SHEET_ID);
      const [funcs, lancs] = await Promise.all([
        loadFuncionarios(SHEET_ID),
        loadLancamentos(SHEET_ID),
      ]);
      dispatch({ type: "SET_FUNCIONARIOS", payload: funcs });
      dispatch({ type: "SET_LANCAMENTOS", payload: lancs });
    } catch (e) {
      const msg = (e as Error).message;
      const local = loadAdmin();
      if (local.funcionarios.length > 0 || local.lancamentos.length > 0) {
        dispatch({ type: "SET_FUNCIONARIOS", payload: local.funcionarios });
        dispatch({ type: "SET_LANCAMENTOS", payload: local.lancamentos });
        dispatch({
          type: "ERROR",
          payload: `Planilha indisponível (${msg}). Exibindo dados salvos localmente.`,
        });
      } else {
        dispatch({ type: "ERROR", payload: msg });
      }
    } finally {
      dispatch({ type: "LOADING", payload: false });
    }
  }, []);

  // ── Funcionários ────────────────────────────────────────────────────────────
  const registrarFuncionario = useCallback(
    async (data: Omit<Funcionario, "id" | "criadoEm" | "_rowNumber">): Promise<boolean> => {
      const f: Funcionario = {
        ...data,
        id: crypto.randomUUID(),
        criadoEm: new Date().toISOString(),
        _rowNumber: 0,
      };
      dispatch({ type: "ADD_FUNCIONARIO", payload: f });
      try {
        dispatch({ type: "SAVING", payload: true });
        dispatch({ type: "ERROR", payload: null });
        await addFuncionario(SHEET_ID, f);
        const updated = await loadFuncionarios(SHEET_ID);
        dispatch({ type: "SET_FUNCIONARIOS", payload: updated });
        return true;
      } catch (e) {
        dispatch({
          type: "ERROR",
          payload: `Salvo localmente, mas falha ao sincronizar planilha: ${(e as Error).message}`,
        });
        return false;
      } finally {
        dispatch({ type: "SAVING", payload: false });
      }
    },
    []
  );

  const toggleFuncionarioStatus = useCallback(
    async (f: Funcionario) => {
      const updated: Funcionario = {
        ...f,
        status: f.status === "ativo" ? "inativo" : "ativo",
      };
      dispatch({ type: "UPDATE_FUNCIONARIO", payload: updated });
      try {
        dispatch({ type: "SAVING", payload: true });
        await updateFuncionario(SHEET_ID, updated);
      } catch (e) {
        dispatch({
          type: "ERROR",
          payload: `Salvo localmente, mas falha ao sincronizar planilha: ${(e as Error).message}`,
        });
      } finally {
        dispatch({ type: "SAVING", payload: false });
      }
    },
    []
  );

  // ── Financeiro ──────────────────────────────────────────────────────────────
  const registrarLancamento = useCallback(
    async (
      data: Omit<LancamentoFinanceiro, "id" | "dataHora" | "_rowNumber" | keyof ReturnType<typeof snapshotFuncionario>> & {
        funcionarioId?: string;
        responsavel?: string;
      }
    ): Promise<boolean> => {
      const func = data.funcionarioId
        ? cachedAdmin.funcionarios.find((f) => f.id === data.funcionarioId)
        ?? loadAdmin().funcionarios.find((f) => f.id === data.funcionarioId)
        : undefined;
      const funcSnap = func
        ? snapshotFuncionario(func)
        : snapshotResponsavel(data.responsavel ?? "");

      const l: LancamentoFinanceiro = {
        tipo:        data.tipo,
        categoria:   data.categoria,
        descricao:   data.descricao,
        valor:       data.valor,
        documento:   data.documento,
        ...funcSnap,
        id: crypto.randomUUID(),
        dataHora: new Date().toISOString(),
        _rowNumber: 0,
      };
      dispatch({ type: "ADD_LANCAMENTO", payload: l });
      try {
        dispatch({ type: "SAVING", payload: true });
        dispatch({ type: "ERROR", payload: null });
        await addLancamento(SHEET_ID, l);
        return true;
      } catch (e) {
        dispatch({
          type: "ERROR",
          payload: `Salvo localmente, mas falha ao sincronizar planilha: ${(e as Error).message}`,
        });
        return false;
      } finally {
        dispatch({ type: "SAVING", payload: false });
      }
    },
    []
  );

  // ── Saldos ──────────────────────────────────────────────────────────────────
  const totalEntradas = state.lancamentos
    .filter((l) => l.tipo === "entrada")
    .reduce((s, l) => s + l.valor, 0);
  const totalSaidas = state.lancamentos
    .filter((l) => l.tipo === "saida")
    .reduce((s, l) => s + l.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  return {
    ...state,
    totalEntradas,
    totalSaidas,
    saldo,
    login,
    logout,
    loadAdminData,
    registrarFuncionario,
    toggleFuncionarioStatus,
    registrarLancamento,
  };
}

export type AdminHook = ReturnType<typeof useAdmin>;

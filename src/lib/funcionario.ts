import type { Funcionario } from "../types";

export const EMPTY_FUNCIONARIO_SNAPSHOT = {
  funcionarioId:       "",
  funcionarioNome:     "",
  funcionarioCargo:    "",
  funcionarioEmail:    "",
  funcionarioTelefone: "",
  responsavel:         "",
};

export function snapshotFuncionario(f: Funcionario) {
  return {
    funcionarioId:       f.id,
    funcionarioNome:     f.nome,
    funcionarioCargo:    f.cargo,
    funcionarioEmail:    f.email,
    funcionarioTelefone: f.telefone,
    responsavel:         f.nome,
  };
}

/** Responsável avulso (sem cadastro vinculado) */
export function snapshotResponsavel(nome: string) {
  return {
    ...EMPTY_FUNCIONARIO_SNAPSHOT,
    funcionarioNome: nome,
    responsavel:     nome,
  };
}

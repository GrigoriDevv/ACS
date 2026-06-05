import { useCallback, useState } from "react";
import { clearDraft, loadDraft, saveDraft } from "../lib/localStore";

/**
 * Estado de formulário com auto-save em localStorage (permanente).
 * clear() apaga o rascunho após submit bem-sucedido.
 */
export function useFormDraft<T>(name: string, initial: T) {
  const [form, setFormState] = useState<T>(() => loadDraft(name, initial));

  const setForm = useCallback(
    (value: T | ((prev: T) => T)) => {
      setFormState((prev) => {
        const next = typeof value === "function" ? (value as (p: T) => T)(prev) : value;
        saveDraft(name, next);
        return next;
      });
    },
    [name]
  );

  const setField = useCallback(
    (field: keyof T) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const val = e.target.type === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : e.target.value;
        setForm((prev) => ({ ...prev, [field]: val }));
      },
    [setForm]
  );

  const reset = useCallback(() => {
    clearDraft(name);
    setFormState(initial);
  }, [name, initial]);

  return { form, setForm, setField, reset };
}

import { useData } from "../../../shared/ui";

export function useExpensesData() {
  const [expenses, reloadExpenses] = useData("/gastos");
  return { expenses, reloadExpenses };
}

import { api } from "../../../infrastructure/api";

export const expensesService = {
  list: () => api.get("/gastos"),
  create: (expense) => api.post("/gastos", expense),
  remove: (id) => api.del(`/gastos/${id}`),
};

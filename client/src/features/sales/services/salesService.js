import { api } from "../../../infrastructure/api";

export const salesService = {
  list: () => api.get("/ventas"),
  create: (sale) => api.post("/ventas", sale),
  remove: (id) => api.del(`/ventas/${id}`),
};

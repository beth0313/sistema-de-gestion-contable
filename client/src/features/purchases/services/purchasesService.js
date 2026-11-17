import { api } from "../../../infrastructure/api";

export const purchasesService = {
  list: () => api.get("/compras"),
  create: (purchase) => api.post("/compras", purchase),
  remove: (id) => api.del(`/compras/${id}`),
};

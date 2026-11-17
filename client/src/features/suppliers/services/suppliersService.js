import { api } from "../../../infrastructure/api";

export const suppliersService = {
  list: () => api.get("/proveedores"),
  create: (supplier) => api.post("/proveedores", supplier),
  remove: (id) => api.del(`/proveedores/${id}`),
};

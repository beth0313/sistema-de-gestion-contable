import { api } from "../../../infrastructure/api";

export const productsService = {
  create: (product) => api.post("/productos", product),
  remove: (id) => api.del(`/productos/${id}`),
};

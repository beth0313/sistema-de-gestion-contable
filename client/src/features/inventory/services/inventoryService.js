import { api } from "../../../infrastructure/api";

export const inventoryService = {
  create: (item) => api.post("/insumos", item),
  updateMinimum: (id, minimo) => api.patch(`/insumos/${id}`, { minimo }),
  updateSettings: (settings) => api.put("/ajustes", settings),
  remove: (id) => api.del(`/insumos/${id}`),
};

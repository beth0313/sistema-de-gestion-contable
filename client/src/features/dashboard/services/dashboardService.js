import { api } from "../../../infrastructure/api";

export const dashboardService = {
  getByMonth: (month) => api.get(`/dashboard?mes=${month}`),
};

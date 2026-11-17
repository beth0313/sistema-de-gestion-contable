import { api } from "../../../infrastructure/api";

export const authService = {
  status: () => api.get("/auth/estado"),
  signIn: (credentials) => api.post("/auth/login", credentials),
  setup: (credentials) => api.post("/auth/setup", credentials),
};

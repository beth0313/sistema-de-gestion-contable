import { useEffect, useState } from "react";
import { authService } from "../services/authService";
import { say } from "../../../shared/ui";

export function useAuthSetup() {
  const [configured, setConfigured] = useState(null);
  useEffect(() => {
    authService.status().then((data) => setConfigured(data.configurado)).catch((error) => say(error.message, true));
  }, []);
  return configured;
}

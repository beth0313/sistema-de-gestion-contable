import { useData } from "../../../shared/ui";

export function usePurchaseOptions() {
  const [inventory] = useData("/insumos");
  const [suppliers] = useData("/proveedores");
  return { inventory, suppliers };
}

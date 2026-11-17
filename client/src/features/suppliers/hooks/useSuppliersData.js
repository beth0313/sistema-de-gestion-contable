import { useData } from "../../../shared/ui";

export function useSuppliersData() {
  const [suppliers, reloadSuppliers] = useData("/proveedores");
  return { suppliers, reloadSuppliers };
}

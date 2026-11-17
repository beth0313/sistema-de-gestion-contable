import { useData } from "../../../shared/ui";

export function useSalesData() {
  const [products] = useData("/productos");
  const [inventory, reloadInventory] = useData("/insumos");
  const [settings] = useData("/ajustes");
  const [sales, reloadSales] = useData("/ventas");
  return { products, inventory, settings, sales, reloadInventory, reloadSales };
}

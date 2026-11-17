import { useData } from "../../../shared/ui";

export function useProductsData() {
  const [inventory] = useData("/insumos");
  const [products, reloadProducts] = useData("/productos");
  const [settings] = useData("/ajustes");
  return { inventory, products, settings, reloadProducts };
}

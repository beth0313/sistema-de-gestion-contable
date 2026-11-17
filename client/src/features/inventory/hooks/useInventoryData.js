import { useData } from "../../../shared/ui";

export function useInventoryData() {
  const [items, reloadItems] = useData("/insumos");
  const [settings, reloadSettings] = useData("/ajustes");
  return { items, reloadItems, settings, reloadSettings };
}

import { fmt, hoy, fechaLarga, enlaceArchivo, Crud } from "../../../shared/ui";
import { purchasesService } from "../services/purchasesService";
import { usePurchaseOptions } from "../hooks/usePurchaseOptions";

function PurchasesPage() {
  const { inventory, suppliers } = usePurchaseOptions();
  if (!inventory || !suppliers) return null;
  const options = (items, placeholder) => [
    { v: "", l: placeholder }, ...items.map((item) => ({ v: item.id, l: item.nombre })),
  ];
  return <Crud title="Registrar compra" url="/compras" service={purchasesService}
    aviso="El stock del insumo se descontará de nuevo."
    init={{ fecha: hoy(), proveedor_id: "", insumo_id: "", descripcion: "", presentaciones: 1, total: "", factura: null }}
    hint="Si eliges un insumo, el stock sube automáticamente y se actualiza su costo."
    fields={[{ k: "fecha", l: "Fecha", type: "date" },
      { k: "proveedor_id", l: "Proveedor", options: options(suppliers, "— Sin proveedor —") },
      { k: "insumo_id", l: "Insumo", options: options(inventory, "— Otro (sin inventario) —") },
      { k: "descripcion", l: "Descripción (si es otro)" },
      { k: "presentaciones", l: "Bolsas / botellas / paquetes", type: "number" },
      { k: "total", l: "Costo total", type: "number" }, { k: "factura", l: "Foto de factura o PDF", type: "file" }]}
    cols={[["Fecha", (row) => fechaLarga(row.fecha)], ["Proveedor", (row) => row.proveedor || "—"],
      ["Insumo", (row) => row.insumo || row.descripcion], ["Cant.", (row) => row.presentaciones],
      ["Valor", (row) => fmt(row.total)], ["Factura", (row) => enlaceArchivo(row.factura_nombre, `/compras/${row.id}/factura`)]]} />;
}

export { PurchasesPage };

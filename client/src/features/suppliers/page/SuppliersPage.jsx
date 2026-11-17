import { fmt, Crud } from "../../../shared/ui";
import { suppliersService } from "../services/suppliersService";

function SuppliersPage() {
  return <Crud title="Nuevo proveedor" url="/proveedores" service={suppliersService}
    init={{ nombre: "", telefono: "", vende: "" }}
    fields={[{ k: "nombre", l: "Nombre" }, { k: "telefono", l: "Teléfono" }, { k: "vende", l: "Qué vende" }]}
    cols={[["Nombre", (row) => row.nombre], ["Teléfono", (row) => row.telefono || ""],
      ["Vende", (row) => row.vende || ""], ["Total comprado", (row) => fmt(row.total)]]} />;
}

export { SuppliersPage };

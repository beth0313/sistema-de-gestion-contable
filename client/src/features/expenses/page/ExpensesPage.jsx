import { fmt, hoy, fechaLarga, enlaceArchivo, Crud } from "../../../shared/ui";
import { expensesService } from "../services/expensesService";
import { EXPENSE_TYPES } from "../types";

function ExpensesPage() {
  return <Crud url="/gastos" service={expensesService} title="Registrar gasto"
    init={{ fecha: hoy(), tipo: EXPENSE_TYPES[0], nota: "", valor: "", factura: null }}
    fields={[{ k: "fecha", l: "Fecha", type: "date" },
      { k: "tipo", l: "Tipo", options: EXPENSE_TYPES.map((type) => ({ v: type, l: type })) },
      { k: "nota", l: "Nota (opcional)" }, { k: "valor", l: "Valor", type: "number" },
      { k: "factura", l: "Foto de factura o PDF", type: "file" }]}
    cols={[["Fecha", (row) => fechaLarga(row.fecha)], ["Tipo", (row) => row.tipo],
      ["Nota", (row) => row.nota || ""], ["Valor", (row) => fmt(row.valor)],
      ["Factura", (row) => enlaceArchivo(row.factura_nombre, `/gastos/${row.id}/factura`)]]} />;
}

export { ExpensesPage };

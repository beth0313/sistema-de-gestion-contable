import { useState, useEffect } from "react";
import { inventoryService } from "../services/inventoryService";
import { useInventoryData } from "../hooks/useInventoryData";
import {
  OZ,
  SZ,
  TI,
  GT,
  fmt,
  f1,
  hoy,
  uc,
  costoBase,
  act,
  say,
  ask,
  Confirm,
  stk,
  useData,
  Toast,
  Th,
  St,
  Sel,
  Foto,
  Crud,
  useSearchPage,
  ListControls,
} from "../../../shared/ui";
const EI = {
  nombre: "",
  tipo: "granizado",
  contenido: "",
  costo: "",
  stock: "",
  minimo: "",
  foto: "",
};
function Inventario() {
  const { items: ins, reloadItems: load, settings: aj, reloadSettings: loadA } = useInventoryData();
  const [f, setF] = useState(EI);
  const [formOpen, setFormOpen] = useState(false);
  const list = useSearchPage(ins || []);
  if (!ins || !aj) return null;
  const jm = aj.jeringa_ml,
    set = (k, v) => setF({ ...f, [k]: v }),
    low = (i) => i.stock_minimo > 0 && i.stock <= i.stock_minimo;
  const save = () =>
    act(async () => {
      await inventoryService.create(f);
      setF(EI);
      setFormOpen(false);
      load();
    }, "✓ Insumo agregado");
  const del = async (id) => {
    if (
      !(await ask(
        "¿Eliminar este insumo? No se puede si algún producto lo usa.",
      ))
    )
      return;
    act(async () => {
      await inventoryService.remove(id);
      load();
    }, "✓ Insumo eliminado");
  };
  const row = (i) =>
    i.tipo === "granizado"
      ? [
          `${i.contenido / 1000} L → ${SZ.map((z) => z + " oz: " + Math.floor(i.contenido / (z * OZ))).join(" · ")}`,
          fmt(uc(i) * 1000) + " / L",
          (i.stock / 1000).toFixed(1) + " L",
        ]
      : i.tipo === "licor"
        ? [
            `${i.contenido} ml → ${Math.floor(i.contenido / jm)} jeringas de ${jm} ml`,
            f1(uc(i) * jm) + " / jeringa",
            `${(i.stock / i.contenido).toFixed(1)} botellas · ${Math.floor(i.stock / jm)} jeringas`,
          ]
        : [
            `${i.contenido} und por paquete`,
            f1(uc(i)) + " / und",
            `${Math.floor(i.stock)} und · ${(i.stock / i.contenido).toFixed(1)} paq.`,
          ];
  return (
    <>
      <div className="module-heading"><h2>Inventario</h2><button className="btn" onClick={() => setFormOpen(!formOpen)}>{formOpen ? "Cerrar" : "+ Crear insumo"}</button></div>
      {formOpen && <div className="card">
        <h3>Nuevo insumo</h3>
        <div className="f">
          <label>
            Nombre (granizado: solo el sabor)
            <input
              value={f.nombre}
              onChange={(e) => set("nombre", e.target.value)}
            />
          </label>
          <label>
            Tipo
            <select
              value={f.tipo}
              onChange={(e) => set("tipo", e.target.value)}
            >
              {TI.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label>
            {f.tipo === "granizado"
              ? "Litros por bolsa"
              : f.tipo === "licor"
                ? "ml por botella"
                : "Unidades por paquete"}
            <input
              type="number"
              min="0"
              step="any"
              value={f.contenido}
              onChange={(e) => set("contenido", e.target.value)}
            />
          </label>
          <label>
            Costo por bolsa/botella/paquete
            <input
              type="number"
              min="0"
              value={f.costo}
              onChange={(e) => set("costo", e.target.value)}
            />
          </label>
          <label>
            Stock inicial (bolsas/botellas/paquetes)
            <input
              type="number"
              min="0"
              step="any"
              value={f.stock}
              onChange={(e) => set("stock", e.target.value)}
            />
          </label>
          <label>
            Alertar cuando llegue a (bolsas/botellas/paquetes)
            <input
              type="number"
              min="0"
              step="any"
              value={f.minimo}
              onChange={(e) => set("minimo", e.target.value)}
            />
          </label>
          <Foto value={f.foto} onChange={(v) => set("foto", v)} />
          <button className="btn" onClick={save}>
            Agregar
          </button>
        </div>
      </div>}
      <div className="card f">
        <label>
          Tamaño de la jeringa (ml)
          <input
            type="number"
            min="0.5"
            step="0.5"
            defaultValue={jm}
            onBlur={(e) =>
              act(async () => {
                await inventoryService.updateSettings({ jeringa_ml: +e.target.value });
                loadA();
              }, "✓ Guardado")
            }
          />
        </label>
      </div>
      <div className="card sc">
        <h3>Insumos y rendimiento</h3>
        <ListControls {...list} />
        <table>
          <thead>
            <tr>
              <th />
              <th>Insumo</th>
              <th>Tipo</th>
              <th>Rendimiento</th>
              <th>Costo unitario</th>
              <th>Stock</th>
              <th>Stock mínimo para activar alerta</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.visible.map((i) => {
              const r = row(i);
              return (
                <tr key={i.id}>
                  <td>
                    <Th src={i.foto} e="📦" />
                  </td>
                  <td>{i.nombre}</td>
                  <td>{i.tipo}</td>
                  <td>{r[0]}</td>
                  <td>{r[1]}</td>
                  <td className={low(i) ? "bad" : ""}>
                    {low(i) && "⚠️ "}
                    {r[2]}
                  </td>
                  <td>
                    <input
                      key={i.id + "-" + i.stock_minimo}
                      type="number"
                      min="0"
                      step="any"
                      style={{ width: 80 }}
                      defaultValue={+(i.stock_minimo / i.contenido).toFixed(2)}
                      onBlur={(e) =>
                        act(async () => {
                          await inventoryService.updateMinimum(i.id, +e.target.value);
                          load();
                        }, "✓ Alerta guardada")
                      }
                    />
                  </td>
                  <td>
                    <button className="x" onClick={() => del(i.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!list.total && <p className="mut">No hay insumos que coincidan.</p>}
      </div>
    </>
  );
}

export { Inventario as InventoryPage };

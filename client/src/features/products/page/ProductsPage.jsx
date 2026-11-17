import { useState, useEffect } from "react";
import { productsService } from "../services/productsService";
import { useProductsData } from "../hooks/useProductsData";
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
const EP = {
  nombre: "",
  tamano_oz: 12,
  precio: "",
  vaso_id: "",
  licor_id: "",
  jeringas: 0,
  foto: "",
  dulces: [],
};
function Productos() {
  const { inventory: ins, products: ps, settings: aj, reloadProducts: load } = useProductsData();
  const [f, setF] = useState(EP);
  const [formOpen, setFormOpen] = useState(false);
  const list = useSearchPage(ps || []);
  if (!ins || !ps || !aj) return null;
  const set = (k, v) => setF({ ...f, [k]: v }),
    setD = (i, k, v) =>
      set(
        "dulces",
        f.dulces.map((d, j) => (j === i ? { ...d, [k]: v } : d)),
      );
  const M = Object.fromEntries(ins.map((i) => [i.id, i])),
    of = (t) => ins.filter((i) => t.includes(i.tipo)),
    g = of(["granizado"]);
  const avg = g.length ? g.reduce((t, i) => t + uc(i), 0) / g.length : 0;
  const save = () =>
    act(async () => {
      await productsService.create({
        ...f,
        dulces: f.dulces.filter((d) => d.insumo_id && +d.cantidad > 0),
      });
      setF(EP);
      setFormOpen(false);
      load();
    }, "✓ Producto guardado");
  const del = async (id) => {
    if (
      !(await ask(
        "¿Eliminar este producto? Las ventas ya registradas se conservan.",
      ))
    )
      return;
    act(async () => {
      await productsService.remove(id);
      load();
    }, "✓ Producto eliminado");
  };
  return (
    <>
      <div className="module-heading"><h2>Productos</h2><button className="btn" onClick={() => setFormOpen(!formOpen)}>{formOpen ? "Cerrar" : "+ Crear producto"}</button></div>
      {formOpen && <div className="card">
        <h3>Crear producto (vaso)</h3>
        <p className="mut" style={{ marginTop: 0 }}>
          Define lo que trae el vaso. El granizado se calcula solo según el
          tamaño y el sabor se elige al vender.
        </p>
        <div className="f">
          <label>
            Nombre (opcional)
            <input
              value={f.nombre}
              onChange={(e) => set("nombre", e.target.value)}
            />
          </label>
          <label>
            Tamaño
            <select
              value={f.tamano_oz}
              onChange={(e) => set("tamano_oz", +e.target.value)}
            >
              {SZ.map((z) => (
                <option key={z} value={z}>
                  {z} oz
                </option>
              ))}
            </select>
          </label>
          <label>
            Precio de venta
            <input
              type="number"
              min="0"
              value={f.precio}
              onChange={(e) => set("precio", e.target.value)}
            />
          </label>
          <Sel
            l="Vaso"
            v={f.vaso_id}
            on={(v) => set("vaso_id", v)}
            list={of(["vaso"])}
            ph="— ninguno —"
          />
          <Foto value={f.foto} onChange={(v) => set("foto", v)} />
        </div>
        <h3 style={{ marginTop: 12 }}>Dulces que trae</h3>
        {f.dulces.map((d, i) => (
          <div className="f" key={i} style={{ marginBottom: 6 }}>
            <Sel
              l="Dulce"
              v={d.insumo_id}
              on={(v) => setD(i, "insumo_id", v)}
              list={of(["dulce", "otro"])}
              ph="— elegir —"
            />
            <label>
              Unidades
              <input
                type="number"
                min="1"
                value={d.cantidad}
                onChange={(e) => setD(i, "cantidad", e.target.value)}
              />
            </label>
            <button
              className="x"
              onClick={() =>
                set(
                  "dulces",
                  f.dulces.filter((_, j) => j !== i),
                )
              }
            >
              ✕
            </button>
          </div>
        ))}
        <button
          className="l"
          onClick={() =>
            set("dulces", [...f.dulces, { insumo_id: "", cantidad: 1 }])
          }
        >
          + Agregar dulce
        </button>
        <div className="f" style={{ marginTop: 10 }}>
          <Sel
            l="Licor de la jeringa"
            v={f.licor_id}
            on={(v) => set("licor_id", v)}
            list={of(["licor"])}
            ph="— sin jeringa —"
          />
          <label>
            Jeringas de {aj.jeringa_ml} ml (0 = sin)
            <input
              type="number"
              min="0"
              value={f.jeringas}
              onChange={(e) => set("jeringas", e.target.value)}
            />
          </label>
          <button className="btn" onClick={save}>
            Guardar producto
          </button>
        </div>
      </div>}
      <div className="card"><ListControls {...list} /><div className="pg">
        {list.visible.map((p) => {
          const c = costoBase(p, M, aj.jeringa_ml),
            e = c + avg * p.tamano_oz * OZ,
            mg = p.precio - e;
          return (
            <div className="card pcard" key={p.id}>
              <Th src={p.foto} />
              <b>
                {p.nombre || "Granizado"} · {p.tamano_oz} oz
              </b>
              <div>{fmt(p.precio)}</div>
              <small className="mut">
                Costo sin sabor {fmt(c)}
                <br />
                Con granizado ~{fmt(e)}
              </small>
              <div className={mg >= 0 ? "ok" : "bad"}>Margen {fmt(mg)}</div>
              <small className="mut">
                {p.dulces
                  .map((d) => `${d.cantidad}× ${M[d.insumo_id]?.nombre || "?"}`)
                  .join(", ") || "Sin dulces"}
                {p.jeringas && p.licor_id
                  ? ` · ${p.jeringas} jeringa(s)`
                  : " · sin jeringa"}
              </small>
              <div>
                <button
                  className="l"
                  onClick={() => {
                    setF({
                      ...EP,
                      ...p,
                      nombre: p.nombre || "",
                      vaso_id: p.vaso_id || "",
                      licor_id: p.licor_id || "",
                      foto: p.foto || "",
                      dulces: p.dulces.map((d) => ({ ...d })),
                    });
                    setFormOpen(true);
                    window.scrollTo(0, 0);
                  }}
                >
                  Copiar
                </button>{" "}
                <button className="x" onClick={() => del(p.id)}>
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>{!list.total && <p className="mut">No hay productos que coincidan.</p>}</div>
    </>
  );
}

export { Productos as ProductsPage };

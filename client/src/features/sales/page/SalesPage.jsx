import { useState, useEffect } from "react";
import { salesService } from "../services/salesService";
import { useSalesData } from "../hooks/useSalesData";
import { PaymentMethodPicker } from "../components/PaymentMethodPicker";
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
  fechaLarga,
  useSearchPage,
  ListControls,
} from "../../../shared/ui";
function Ventas() {
  const { products: ps, inventory: ins, settings: aj, sales: vs, reloadInventory: loadI, reloadSales: loadV } = useSalesData();
  const [fecha, setFecha] = useState(hoy()),
    [filtroHistorial, setFiltroHistorial] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const historial = (vs || []).filter((venta) => !filtroHistorial || String(venta.fecha).slice(0, 10) === filtroHistorial);
  const historyList = useSearchPage(historial);
  const [s, setS] = useState({
    pid: 0,
    sid: "",
    otro: "",
    licor: "",
    jer: 0,
    medio_pago: "Efectivo",
    ex: {},
    extra: "",
    qty: 1,
  });
  const pick = (p) =>
    setS((x) => ({
      ...x,
      pid: p.id,
      licor: p.licor_id || "",
      jer: p.jeringas,
      ex: {},
    }));
  useEffect(() => {
    if (ps && ps.length && !s.pid) pick(ps[0]);
  }, [ps]);
  if (!ps || !ins || !aj) return null;
  if (!ps.length)
    return (
      <div className="card">
        Primero crea un producto en la pestaña <b>Productos</b>.
      </div>
    );
  const M = Object.fromEntries(ins.map((i) => [i.id, i])),
    P = ps.find((p) => p.id === s.pid) || ps[0];
  const G = ins.filter((i) => i.tipo === "granizado"),
    Dc = ins.filter((i) => i.tipo === "dulce"),
    L = ins.filter((i) => i.tipo === "licor");
  const sab = s.otro ? null : M[s.sid] || G[0],
    ml = P.tamano_oz * OZ,
    q = s.qty;
  const cu =
      costoBase(P, M, aj.jeringa_ml, s.jer, s.licor, s.ex) +
      (sab ? uc(sab) * ml : 0),
    up = P.precio + (+s.extra || 0);
  const up2 = (patch) => setS({ ...s, ...patch });
  const reg = () =>
    act(async () => {
      await salesService.create({
        fecha,
        producto_id: P.id,
        sabor_id: sab ? sab.id : null,
        sabor_otro: s.otro,
        cantidad: q,
        medio_pago: s.medio_pago,
        jeringas: s.jer,
        licor_id: s.licor || null,
        extras: Object.entries(s.ex)
          .filter(([, n]) => n > 0)
          .map(([insumo_id, cantidad]) => ({ insumo_id, cantidad })),
        cobro_extra: +s.extra || 0,
      });
      setS((x) => ({ ...x, ex: {}, extra: "", qty: 1, otro: "" }));
      loadV();
      loadI();
    }, "✓ Venta registrada");
  const del = async (id) => {
    if (
      !(await ask(
        "¿Eliminar esta venta? El stock de los insumos se devolverá al inventario.",
      ))
    )
      return;
    act(async () => {
      await salesService.remove(id);
      loadV();
      loadI();
    }, "✓ Venta eliminada");
  };
  return (
    <>
      <div className="module-heading"><h2>Nueva venta</h2><button className="btn" onClick={() => setFormOpen(!formOpen)}>{formOpen ? "Cerrar" : "+ Crear venta"}</button></div>
      {formOpen && <div className="card">
        <h3>1. Tamaño del vaso</h3>
        <div className="cards">
          {ps.map((p) => (
            <button
              key={p.id}
              className={"tile" + (p.id === P.id ? " on" : "")}
              onClick={() => pick(p)}
            >
              <Th src={p.foto} />
              <b>{p.tamano_oz} oz</b>
              <br />
              <small>{p.nombre}</small>
              <br />
              {fmt(p.precio)}
            </button>
          ))}
        </div>
        <h3>2. Sabor</h3>
        <div className="cards">
          {G.map((i) => (
            <button
              key={i.id}
              className={
                "tile" + (!s.otro && sab && i.id === sab.id ? " on" : "")
              }
              onClick={() => up2({ sid: i.id, otro: "" })}
            >
              <Th src={i.foto} e="🍧" />
              <b>{i.nombre}</b>
              <br />
              <small className={i.stock < ml ? "bad" : "mut"}>
                {Math.floor(i.stock / ml)} vasos
              </small>
            </button>
          ))}
          {!G.length && (
            <span className="mut">
              Agrega bolsas de granizado en Inventario, o escribe un sabor
              abajo.
            </span>
          )}
        </div>
        <div className="f">
          <label>
            Otro sabor (sin descontar inventario)
            <input
              value={s.otro}
              onChange={(e) => up2({ otro: e.target.value })}
            />
          </label>
        </div>
        <h3 style={{ marginTop: 12 }}>3. Jeringa y dulces extra</h3>
        {!!L.length && (
          <div className="row">
            <select
              style={{ maxWidth: "55%" }}
              value={s.licor}
              onChange={(e) =>
                up2({
                  licor: e.target.value,
                  jer: e.target.value && !s.jer ? 1 : s.jer,
                })
              }
            >
              <option value="">— sin jeringa —</option>
              {L.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre}
                </option>
              ))}
            </select>
            {s.licor && (
              <>
                <St v={s.jer} set={(v) => up2({ jer: v })} />
                <small className="mut">de {aj.jeringa_ml} ml</small>
              </>
            )}
          </div>
        )}
        {Dc.map((i) => (
          <div className="row" key={i.id}>
            <span>
              {i.nombre} <small className="mut">extra</small>
            </span>
            <St
              v={s.ex[i.id] || 0}
              set={(v) => up2({ ex: { ...s.ex, [i.id]: v } })}
            />
          </div>
        ))}
        <div className="f" style={{ marginTop: 10 }}>
          <label>
            Cantidad de vasos
            <span>
              <St v={q} set={(v) => up2({ qty: Math.max(1, v) })} />
            </span>
          </label>
          <label>
            Cobro extra por vaso
            <input
              type="number"
              min="0"
              value={s.extra}
              onChange={(e) => up2({ extra: e.target.value })}
            />
          </label>
          <label>
            Fecha
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value || hoy())}
            />
            <small>{fechaLarga(fecha)}</small>
          </label>
        </div>
        <h3 style={{ marginTop: 12 }}>4. Medio de pago</h3>
        <PaymentMethodPicker value={s.medio_pago} onChange={(medio_pago) => up2({ medio_pago })} />
        <div className="sum">
          Total <b>{fmt(up * q)}</b> · Costo {fmt(cu * q)} · Ganancia{" "}
          <b className={up - cu >= 0 ? "ok" : "bad"}>{fmt((up - cu) * q)}</b>
          {sab && sab.stock < ml * q && (
            <>
              <br />
              <span className="bad">
                El sabor elegido no tiene stock suficiente para esta cantidad.
              </span>
            </>
          )}
        </div>
        <button className="btn big" onClick={reg}>
          Registrar venta
        </button>
      </div>}
      <div className="card sc">
        <h3>Historial de ventas ({historyList.total})</h3>
        <label>Filtrar historial por fecha <input type="date" value={filtroHistorial} onChange={(e) => setFiltroHistorial(e.target.value)} /><small>{filtroHistorial ? fechaLarga(filtroHistorial) : "Todas las fechas"}</small></label>
        <ListControls {...historyList} />
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Medio de pago</th>
              <th>Total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {historyList.visible.map((v) => (
              <tr key={v.id}>
                <td>{fechaLarga(v.fecha)}</td>
                <td>
                  {v.sabor} · {v.tamano_oz} oz
                </td>
                <td>{v.cantidad}</td>
                <td>{v.medio_pago || "Efectivo"}</td>
                <td>{fmt(v.cantidad * v.precio_unit)}</td>
                <td>
                  <button className="x" onClick={() => del(v.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          {!historyList.total && <tr><td colSpan="6">No hay ventas para mostrar.</td></tr>}
            </tbody>
        </table>
      </div>
    </>
  );
}

export { Ventas as SalesPage };

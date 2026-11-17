import { useState, useEffect, useCallback } from "react";
import { api } from "../infrastructure/api";
export const OZ = 29.5735,
  SZ = [8, 12, 16, 20],
  TI = ["granizado", "licor", "dulce", "vaso", "otro"],
  GT = ["Luz", "Agua recargable", "Arriendo máquina", "Otro"];
export const fmt = (n) => "$" + Math.round(n || 0).toLocaleString("es-CO");
export const f1 = (n) =>
  "$" + (+n).toLocaleString("es-CO", { maximumFractionDigits: 1 });
export const hoy = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 6e4)
    .toISOString()
    .slice(0, 10);
export const fechaLarga = (value) => {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .format(new Date(`${String(value).slice(0, 10)}T12:00:00`));
};
export const uc = (i) => i.costo / i.contenido; // costo por ml o por unidad
// costo del vaso sin el sabor: vaso + dulces + jeringa + extras
export const costoBase = (
  p,
  m,
  jm,
  jer = p.jeringas,
  licor = p.licor_id,
  ex = {},
) => {
  let t = 0;
  const a = (id, q) => {
    const i = m[id];
    if (i && q > 0) t += uc(i) * q;
  };
  a(p.vaso_id, 1);
  p.dulces.forEach((d) => a(d.insumo_id, d.cantidad));
  if (licor) a(licor, jer * jm);
  Object.entries(ex).forEach(([id, q]) => a(id, q));
  return t;
};
export const say = (m, bad) =>
  window.dispatchEvent(new CustomEvent("say", { detail: { m, bad } }));
export const act = async (fn, ok) => {
  try {
    await fn();
    if (ok) say(ok);
  } catch (e) {
    say(e.message, true);
  }
};
export function useData(url) {
  const [d, setD] = useState(null);
  const load = useCallback(
    () =>
      api
        .get(url)
        .then(setD)
        .catch((e) => say(e.message, true)),
    [url],
  );
  useEffect(() => {
    load();
  }, [load]);
  return [d, load];
}
export function Toast() {
  const [t, setT] = useState(null);
  useEffect(() => {
    let id;
    const h = (e) => {
      setT(e.detail);
      clearTimeout(id);
      id = setTimeout(() => setT(null), 2600);
    };
    window.addEventListener("say", h);
    return () => window.removeEventListener("say", h);
  }, []);
  return t ? (
    <div className={"toast" + (t.bad ? " err" : "")}>{t.m}</div>
  ) : null;
}
export const Th = ({ src, e = "🥤" }) =>
  src ? (
    <img className="th" src={src} alt="" />
  ) : (
    <div className="th ph">{e}</div>
  );
export const St = ({ v, set }) => (
  <span className="st">
    <button onClick={() => set(Math.max(0, v - 1))}>−</button>
    <b>{v}</b>
    <button onClick={() => set(v + 1)}>+</button>
  </span>
);
export const Sel = ({ l, v, on, list, ph }) => (
  <label>
    {l}
    <select value={v} onChange={(e) => on(e.target.value)}>
      <option value="">{ph}</option>
      {list.map((i) => (
        <option key={i.id} value={i.id}>
          {i.nombre}
        </option>
      ))}
    </select>
  </label>
);
export function Foto({ value, onChange }) {
  const pick = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const im = new Image();
      im.onload = () => {
        const s = Math.min(1, 220 / Math.max(im.width, im.height)),
          c = document.createElement("canvas");
        c.width = im.width * s;
        c.height = im.height * s;
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        onChange(c.toDataURL("image/jpeg", 0.72));
      };
      im.src = r.result;
    };
    r.readAsDataURL(f);
  };
  return (
    <label>
      Foto
      <input type="file" accept="image/*" onChange={pick} />
      {value && <Th src={value} />}
    </label>
  );
}
export function useSearchPage(rows = []) {
  const [search, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const setSearch = (value) => { setSearchValue(value); setPage(1); };
  const filtered = rows.filter((row) => JSON.stringify(row).toLocaleLowerCase("es-CO").includes(search.toLocaleLowerCase("es-CO")));
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages);
  return { search, setSearch, page: current, setPage, pages, total: filtered.length, visible: filtered.slice((current - 1) * 10, current * 10) };
}
export function ListControls({ search, setSearch, page, setPage, pages, total }) {
  return <div className="list-controls"><label className="list-search">Buscar<input type="search" placeholder="Escribe para buscar..." value={search} onChange={(e) => setSearch(e.target.value)} /></label><div className="pager"><small>{total} registros · página {page} de {pages}</small><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button><button type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</button></div></div>;
}
export function Archivo({ value, onChange }) {
  const pick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { say("El archivo debe pesar máximo 5 MB", true); event.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = () => onChange({ nombre: file.name, contenido: reader.result });
    reader.readAsDataURL(file);
  };
  return <label>Foto de factura o PDF<input type="file" accept="image/*,application/pdf" onChange={pick} />{value?.contenido && <small>{value.nombre}</small>}</label>;
}
export const enlaceArchivo = (nombre, url) => nombre ? <button className="file-link" type="button" onClick={async () => { const tab = window.open("about:blank", "_blank"); try { const file = await api.get(url); if (tab) tab.location = file.contenido; } catch (error) { tab?.close(); say(error.message, true); } }}>{nombre}</button> : "—";
// Formulario + tabla genérica
export function Crud({ title, url, service, fields, cols, init, hint, aviso }) {
  const [rows, setRows] = useState(null);
  const load = useCallback(() => (service ? service.list() : api.get(url)).then(setRows).catch((e) => say(e.message, true)), [service, url]);
  useEffect(() => { load(); }, [load]);
  const [f, setF] = useState(init),
    [formOpen, setFormOpen] = useState(false);
  const list = useSearchPage(rows || []);
  const set = (k, v) => setF({ ...f, [k]: v });
  const save = () =>
    act(async () => {
      if (service) await service.create(f); else await api.post(url, f);
      setF(init);
      setFormOpen(false);
      load();
    }, "✓ Guardado");
  const del = async (id) => {
    if (!(await ask("¿Eliminar este registro? " + (aviso || "")))) return;
    act(async () => {
      if (service) await service.remove(id); else await api.del(url + "/" + id);
      load();
    }, "✓ Eliminado");
  };
  return (
    <>
      <div className="module-heading">
        <h2>{title}</h2>
        <button className="btn" type="button" onClick={() => setFormOpen(!formOpen)}>
          {formOpen ? "Cerrar" : "+ Crear registro"}
        </button>
      </div>
      {formOpen && <div className="card">
        <h3>Nuevo registro</h3>
        <div className="f">
          {fields.map((x) => x.type === "file" ? (
            <Archivo key={x.k} value={f[x.k]} onChange={(v) => set(x.k, v)} />
          ) : (
            <label key={x.k}>
              {x.l}
              {x.options ? (
                <select
                  value={f[x.k]}
                  onChange={(e) => set(x.k, e.target.value)}
                >
                  {x.options.map((o) => (
                    <option key={o.v} value={o.v}>
                      {o.l}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={x.type || "text"}
                  min={x.type === "number" ? 0 : undefined}
                  step="any"
                  value={f[x.k]}
                  onChange={(e) => set(x.k, e.target.value)}
                />
              )}
              {x.type === "date" && <small>{fechaLarga(f[x.k])}</small>}
            </label>
          ))}
          <button className="btn" onClick={save}>
            Guardar
          </button>
        </div>
        {hint && <p className="mut">{hint}</p>}
      </div>}
      <div className="card sc">
        <ListControls {...list} />
        <table>
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c[0]}>{c[0]}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {list.visible.map((r) => (
              <tr key={r.id}>
                {cols.map((c) => (
                  <td key={c[0]}>{c[1](r)}</td>
                ))}
                <td>
                  <button className="x" onClick={() => del(r.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && !list.total && <p className="mut">Sin registros que coincidan.</p>}
      </div>
    </>
  );
}

export const stk = (i) =>
  i.tipo === "granizado"
    ? (i.stock / 1000).toFixed(1) + " L"
    : i.tipo === "licor"
      ? (i.stock / i.contenido).toFixed(1) + " botellas"
      : Math.floor(i.stock) + " und";
// Confirmación antes de eliminar: const ok = await ask('¿Seguro?')
export const ask = (msg) =>
  new Promise((res) =>
    window.dispatchEvent(new CustomEvent("ask", { detail: { msg, res } })),
  );
export function Confirm() {
  const [d, setD] = useState(null);
  useEffect(() => {
    const h = (e) => setD(e.detail);
    window.addEventListener("ask", h);
    return () => window.removeEventListener("ask", h);
  }, []);
  if (!d) return null;
  const end = (v) => {
    d.res(v);
    setD(null);
  };
  return (
    <div className="modal">
      <div className="card">
        <p style={{ marginTop: 0 }}>{d.msg}</p>
        <div className="f">
          <button
            className="btn"
            style={{ background: "var(--bad)" }}
            onClick={() => end(true)}
          >
            Sí, eliminar
          </button>
          <button
            className="btn"
            style={{ background: "var(--mut)" }}
            onClick={() => end(false)}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

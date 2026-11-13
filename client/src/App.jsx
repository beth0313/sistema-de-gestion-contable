import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { api } from './api';
import { OZ, SZ, TI, GT, fmt, f1, hoy, uc, costoBase, act, say, ask, Confirm, stk, useData, Toast, Th, St, Sel, Foto, Crud } from './ui';
const COL = ['#06b6d4', '#a855f7', '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#ec4899', '#14b8a6'];

const Torta = ({ title, data }) => <div className="card"><h3>{title}</h3><div className="cv"><ResponsiveContainer><PieChart>
  <Pie data={data} dataKey="value" nameKey="name" outerRadius={85} innerRadius={45}>{data.map((_, i) => <Cell key={i} fill={COL[i % 8]} />)}</Pie>
  <Tooltip formatter={fmt} /><Legend /></PieChart></ResponsiveContainer></div></div>;

function Dashboard() {
  const [mes, setMes] = useState(hoy().slice(0, 7)), [d] = useData('/dashboard?mes=' + mes);
  const [y, m] = mes.split('-').map(Number);
  const K = (l, v, c) => <div className="card kpi"><small>{l}</small><b className={c}>{fmt(v)}</b></div>;
  return <>
    <div className="card f"><label>Mes<input type="month" value={mes} onChange={e => setMes(e.target.value || mes)} /></label></div>
    {d && <>
      <div className="grid">{K(`Ventas (${d.n} granizados)`, d.ventas)}{K('Compras', d.compras)}{K('Gastos (luz, agua, arriendo…)', d.gastos)}
        {K('Utilidad (ventas − compras − gastos)', d.ventas - d.compras - d.gastos, d.ventas - d.compras - d.gastos >= 0 ? 'ok' : 'bad')}{K('Margen de productos (ventas − costo)', d.ventas - d.costo, 'ok')}</div>
      <div className="cg">
        <div className="card"><h3>Ventas por día</h3><div className="cv"><ResponsiveContainer><BarChart data={Array.from({ length: new Date(y, m, 0).getDate() }, (_, i) => ({ d: i + 1, v: d.dia.find(x => x.d === i + 1)?.v || 0 }))}>
          <XAxis dataKey="d" /><YAxis /><Tooltip formatter={fmt} /><Bar dataKey="v" name="Ventas" fill={COL[0]} /></BarChart></ResponsiveContainer></div></div>
        <Torta title="Ventas por sabor" data={d.sabor} /><Torta title="Ventas por tamaño de vaso" data={d.tam} /><Torta title="Egresos por categoría" data={d.eg} />
        <div className="card"><h3>Ventas vs egresos (6 meses)</h3><div className="cv"><ResponsiveContainer><BarChart data={d.seis}>
          <XAxis dataKey="mes" /><YAxis /><Tooltip formatter={fmt} /><Legend /><Bar dataKey="ventas" name="Ventas" fill={COL[4]} /><Bar dataKey="egresos" name="Egresos" fill={COL[3]} /></BarChart></ResponsiveContainer></div></div>
      </div></>}
  </>;
}

function Ventas() {
  const [ps] = useData('/productos'), [ins, loadI] = useData('/insumos'), [aj] = useData('/ajustes');
  const [fecha, setFecha] = useState(hoy()), [vs, loadV] = useData('/ventas?fecha=' + fecha);
  const [s, setS] = useState({ pid: 0, sid: '', otro: '', licor: '', jer: 0, ex: {}, extra: '', qty: 1 });
  const pick = p => setS(x => ({ ...x, pid: p.id, licor: p.licor_id || '', jer: p.jeringas, ex: {} }));
  useEffect(() => { if (ps && ps.length && !s.pid) pick(ps[0]); }, [ps]);
  if (!ps || !ins || !aj) return null;
  if (!ps.length) return <div className="card">Primero crea un producto en la pestaña <b>Productos</b>.</div>;
  const M = Object.fromEntries(ins.map(i => [i.id, i])), P = ps.find(p => p.id === s.pid) || ps[0];
  const G = ins.filter(i => i.tipo === 'granizado'), Dc = ins.filter(i => i.tipo === 'dulce'), L = ins.filter(i => i.tipo === 'licor');
  const sab = s.otro ? null : (M[s.sid] || G[0]), ml = P.tamano_oz * OZ, q = s.qty;
  const cu = costoBase(P, M, aj.jeringa_ml, s.jer, s.licor, s.ex) + (sab ? uc(sab) * ml : 0), up = P.precio + (+s.extra || 0);
  const up2 = patch => setS({ ...s, ...patch });
  const reg = () => act(async () => {
    await api.post('/ventas', { fecha, producto_id: P.id, sabor_id: sab ? sab.id : null, sabor_otro: s.otro, cantidad: q, jeringas: s.jer, licor_id: s.licor || null,
      extras: Object.entries(s.ex).filter(([, n]) => n > 0).map(([insumo_id, cantidad]) => ({ insumo_id, cantidad })), cobro_extra: +s.extra || 0 });
    setS(x => ({ ...x, ex: {}, extra: '', qty: 1, otro: '' })); loadV(); loadI();
  }, '✓ Venta registrada');
  const del = async id => { if (!await ask('¿Eliminar esta venta? El stock de los insumos se devolverá al inventario.')) return; act(async () => { await api.del('/ventas/' + id); loadV(); loadI(); }, '✓ Venta eliminada'); };
  return <>
    <div className="card"><h3>1. Tamaño del vaso</h3>
      <div className="cards">{ps.map(p => <button key={p.id} className={'tile' + (p.id === P.id ? ' on' : '')} onClick={() => pick(p)}><Th src={p.foto} /><b>{p.tamano_oz} oz</b><br /><small>{p.nombre}</small><br />{fmt(p.precio)}</button>)}</div>
      <h3>2. Sabor</h3>
      <div className="cards">{G.map(i => <button key={i.id} className={'tile' + (!s.otro && sab && i.id === sab.id ? ' on' : '')} onClick={() => up2({ sid: i.id, otro: '' })}><Th src={i.foto} e="🍧" /><b>{i.nombre}</b><br /><small className={i.stock < ml ? 'bad' : 'mut'}>{Math.floor(i.stock / ml)} vasos</small></button>)}
        {!G.length && <span className="mut">Agrega bolsas de granizado en Inventario, o escribe un sabor abajo.</span>}</div>
      <div className="f"><label>Otro sabor (sin descontar inventario)<input value={s.otro} onChange={e => up2({ otro: e.target.value })} /></label></div>
      <h3 style={{ marginTop: 12 }}>3. Jeringa y dulces extra</h3>
      {!!L.length && <div className="row"><select style={{ maxWidth: '55%' }} value={s.licor} onChange={e => up2({ licor: e.target.value, jer: e.target.value && !s.jer ? 1 : s.jer })}><option value="">— sin jeringa —</option>{L.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}</select>
        {s.licor && <><St v={s.jer} set={v => up2({ jer: v })} /><small className="mut">de {aj.jeringa_ml} ml</small></>}</div>}
      {Dc.map(i => <div className="row" key={i.id}><span>{i.nombre} <small className="mut">extra</small></span><St v={s.ex[i.id] || 0} set={v => up2({ ex: { ...s.ex, [i.id]: v } })} /></div>)}
      <div className="f" style={{ marginTop: 10 }}><label>Cantidad de vasos<span><St v={q} set={v => up2({ qty: Math.max(1, v) })} /></span></label>
        <label>Cobro extra por vaso<input type="number" min="0" value={s.extra} onChange={e => up2({ extra: e.target.value })} /></label>
        <label>Fecha<input type="date" value={fecha} onChange={e => setFecha(e.target.value || hoy())} /></label></div>
      <div className="sum">Total <b>{fmt(up * q)}</b> · Costo {fmt(cu * q)} · Ganancia <b className={up - cu >= 0 ? 'ok' : 'bad'}>{fmt((up - cu) * q)}</b>
        {sab && sab.stock < ml * q && <><br /><span className="bad">El sabor elegido no tiene stock suficiente para esta cantidad.</span></>}</div>
      <button className="btn big" onClick={reg}>Registrar venta</button></div>
    <div className="card sc"><h3>Ventas del {fecha} — {fmt((vs || []).reduce((t, v) => t + v.cantidad * v.precio_unit, 0))}</h3>
      <table><thead><tr><th>Producto</th><th>Cant.</th><th>Total</th><th /></tr></thead><tbody>{(vs || []).map(v => <tr key={v.id}><td>{v.sabor} · {v.tamano_oz} oz</td><td>{v.cantidad}</td><td>{fmt(v.cantidad * v.precio_unit)}</td><td><button className="x" onClick={() => del(v.id)}>✕</button></td></tr>)}</tbody></table></div>
  </>;
}

const EP = { nombre: '', tamano_oz: 12, precio: '', vaso_id: '', licor_id: '', jeringas: 0, foto: '', dulces: [] };
function Productos() {
  const [ins] = useData('/insumos'), [ps, load] = useData('/productos'), [aj] = useData('/ajustes'), [f, setF] = useState(EP);
  if (!ins || !ps || !aj) return null;
  const set = (k, v) => setF({ ...f, [k]: v }), setD = (i, k, v) => set('dulces', f.dulces.map((d, j) => j === i ? { ...d, [k]: v } : d));
  const M = Object.fromEntries(ins.map(i => [i.id, i])), of = t => ins.filter(i => t.includes(i.tipo)), g = of(['granizado']);
  const avg = g.length ? g.reduce((t, i) => t + uc(i), 0) / g.length : 0;
  const save = () => act(async () => { await api.post('/productos', { ...f, dulces: f.dulces.filter(d => d.insumo_id && +d.cantidad > 0) }); setF(EP); load(); }, '✓ Producto guardado');
  const del = async id => { if (!await ask('¿Eliminar este producto? Las ventas ya registradas se conservan.')) return; act(async () => { await api.del('/productos/' + id); load(); }, '✓ Producto eliminado'); };
  return <>
    <div className="card"><h3>Crear producto (vaso)</h3><p className="mut" style={{ marginTop: 0 }}>Define lo que trae el vaso. El granizado se calcula solo según el tamaño y el sabor se elige al vender.</p>
      <div className="f"><label>Nombre (opcional)<input value={f.nombre} onChange={e => set('nombre', e.target.value)} /></label>
        <label>Tamaño<select value={f.tamano_oz} onChange={e => set('tamano_oz', +e.target.value)}>{SZ.map(z => <option key={z} value={z}>{z} oz</option>)}</select></label>
        <label>Precio de venta<input type="number" min="0" value={f.precio} onChange={e => set('precio', e.target.value)} /></label>
        <Sel l="Vaso" v={f.vaso_id} on={v => set('vaso_id', v)} list={of(['vaso'])} ph="— ninguno —" /><Foto value={f.foto} onChange={v => set('foto', v)} /></div>
      <h3 style={{ marginTop: 12 }}>Dulces que trae</h3>
      {f.dulces.map((d, i) => <div className="f" key={i} style={{ marginBottom: 6 }}><Sel l="Dulce" v={d.insumo_id} on={v => setD(i, 'insumo_id', v)} list={of(['dulce', 'otro'])} ph="— elegir —" />
        <label>Unidades<input type="number" min="1" value={d.cantidad} onChange={e => setD(i, 'cantidad', e.target.value)} /></label><button className="x" onClick={() => set('dulces', f.dulces.filter((_, j) => j !== i))}>✕</button></div>)}
      <button className="l" onClick={() => set('dulces', [...f.dulces, { insumo_id: '', cantidad: 1 }])}>+ Agregar dulce</button>
      <div className="f" style={{ marginTop: 10 }}><Sel l="Licor de la jeringa" v={f.licor_id} on={v => set('licor_id', v)} list={of(['licor'])} ph="— sin jeringa —" />
        <label>Jeringas de {aj.jeringa_ml} ml (0 = sin)<input type="number" min="0" value={f.jeringas} onChange={e => set('jeringas', e.target.value)} /></label><button className="btn" onClick={save}>Guardar producto</button></div></div>
    <div className="pg">{ps.map(p => { const c = costoBase(p, M, aj.jeringa_ml), e = c + avg * p.tamano_oz * OZ, mg = p.precio - e; return <div className="card pcard" key={p.id}>
      <Th src={p.foto} /><b>{p.nombre || 'Granizado'} · {p.tamano_oz} oz</b><div>{fmt(p.precio)}</div>
      <small className="mut">Costo sin sabor {fmt(c)}<br />Con granizado ~{fmt(e)}</small><div className={mg >= 0 ? 'ok' : 'bad'}>Margen {fmt(mg)}</div>
      <small className="mut">{p.dulces.map(d => `${d.cantidad}× ${M[d.insumo_id]?.nombre || '?'}`).join(', ') || 'Sin dulces'}{p.jeringas && p.licor_id ? ` · ${p.jeringas} jeringa(s)` : ' · sin jeringa'}</small>
      <div><button className="l" onClick={() => { setF({ ...EP, ...p, nombre: p.nombre || '', vaso_id: p.vaso_id || '', licor_id: p.licor_id || '', foto: p.foto || '', dulces: p.dulces.map(d => ({ ...d })) }); window.scrollTo(0, 0); }}>Copiar</button> <button className="x" onClick={() => del(p.id)}>✕</button></div></div>; })}</div>
  </>;
}

const EI = { nombre: '', tipo: 'granizado', contenido: '', costo: '', stock: '', minimo: '', foto: '' };
function Inventario() {
  const [ins, load] = useData('/insumos'), [aj, loadA] = useData('/ajustes'), [f, setF] = useState(EI);
  if (!ins || !aj) return null;
  const jm = aj.jeringa_ml, set = (k, v) => setF({ ...f, [k]: v }), low = i => i.stock_minimo > 0 && i.stock <= i.stock_minimo;
  const save = () => act(async () => { await api.post('/insumos', f); setF(EI); load(); }, '✓ Insumo agregado');
  const del = async id => { if (!await ask('¿Eliminar este insumo? No se puede si algún producto lo usa.')) return; act(async () => { await api.del('/insumos/' + id); load(); }, '✓ Insumo eliminado'); };
  const row = i => i.tipo === 'granizado' ? [`${i.contenido / 1000} L → ${SZ.map(z => z + ' oz: ' + Math.floor(i.contenido / (z * OZ))).join(' · ')}`, fmt(uc(i) * 1000) + ' / L', (i.stock / 1000).toFixed(1) + ' L']
    : i.tipo === 'licor' ? [`${i.contenido} ml → ${Math.floor(i.contenido / jm)} jeringas de ${jm} ml`, f1(uc(i) * jm) + ' / jeringa', `${(i.stock / i.contenido).toFixed(1)} botellas · ${Math.floor(i.stock / jm)} jeringas`]
    : [`${i.contenido} und por paquete`, f1(uc(i)) + ' / und', `${Math.floor(i.stock)} und · ${(i.stock / i.contenido).toFixed(1)} paq.`];
  return <>
    <div className="card"><h3>Nuevo insumo</h3><div className="f">
      <label>Nombre (granizado: solo el sabor)<input value={f.nombre} onChange={e => set('nombre', e.target.value)} /></label>
      <label>Tipo<select value={f.tipo} onChange={e => set('tipo', e.target.value)}>{TI.map(t => <option key={t}>{t}</option>)}</select></label>
      <label>{f.tipo === 'granizado' ? 'Litros por bolsa' : f.tipo === 'licor' ? 'ml por botella' : 'Unidades por paquete'}<input type="number" min="0" step="any" value={f.contenido} onChange={e => set('contenido', e.target.value)} /></label>
      <label>Costo por bolsa/botella/paquete<input type="number" min="0" value={f.costo} onChange={e => set('costo', e.target.value)} /></label>
      <label>Stock inicial (bolsas/botellas/paquetes)<input type="number" min="0" step="any" value={f.stock} onChange={e => set('stock', e.target.value)} /></label>
      <label>Avisar si quedan menos de (bolsas/botellas/paquetes)<input type="number" min="0" step="any" value={f.minimo} onChange={e => set('minimo', e.target.value)} /></label>
      <Foto value={f.foto} onChange={v => set('foto', v)} /><button className="btn" onClick={save}>Agregar</button></div></div>
    <div className="card f"><label>Tamaño de la jeringa (ml)<input type="number" min="0.5" step="0.5" defaultValue={jm} onBlur={e => act(async () => { await api.put('/ajustes', { jeringa_ml: +e.target.value }); loadA(); }, '✓ Guardado')} /></label></div>
    <div className="card sc"><h3>Insumos y rendimiento</h3><table><thead><tr><th /><th>Insumo</th><th>Tipo</th><th>Rendimiento</th><th>Costo unitario</th><th>Stock</th><th>Alerta (mín.)</th><th /></tr></thead>
      <tbody>{ins.map(i => { const r = row(i); return <tr key={i.id}><td><Th src={i.foto} e="📦" /></td><td>{i.nombre}</td><td>{i.tipo}</td><td>{r[0]}</td><td>{r[1]}</td><td className={low(i) ? 'bad' : ''}>{low(i) && '⚠️ '}{r[2]}</td><td><input key={i.id + '-' + i.stock_minimo} type="number" min="0" step="any" style={{ width: 80 }} defaultValue={+(i.stock_minimo / i.contenido).toFixed(2)} onBlur={e => act(async () => { await api.patch('/insumos/' + i.id, { minimo: +e.target.value }); load(); }, '✓ Alerta guardada')} /></td><td><button className="x" onClick={() => del(i.id)}>✕</button></td></tr>; })}</tbody></table></div>
  </>;
}

function Compras() {
  const [ins] = useData('/insumos'), [pv] = useData('/proveedores');
  if (!ins || !pv) return null;
  const o = (a, ph) => [{ v: '', l: ph }, ...a.map(x => ({ v: x.id, l: x.nombre }))];
  return <Crud title="Registrar compra" url="/compras" aviso="El stock del insumo se descontará de nuevo." init={{ fecha: hoy(), proveedor_id: '', insumo_id: '', descripcion: '', presentaciones: 1, total: '' }}
    hint="Si eliges un insumo, el stock sube automáticamente y se actualiza su costo."
    fields={[{ k: 'fecha', l: 'Fecha', type: 'date' }, { k: 'proveedor_id', l: 'Proveedor', options: o(pv, '— Sin proveedor —') }, { k: 'insumo_id', l: 'Insumo', options: o(ins, '— Otro (sin inventario) —') },
      { k: 'descripcion', l: 'Descripción (si es otro)' }, { k: 'presentaciones', l: 'Bolsas / botellas / paquetes', type: 'number' }, { k: 'total', l: 'Costo total', type: 'number' }]}
    cols={[['Fecha', r => r.fecha], ['Proveedor', r => r.proveedor || '—'], ['Insumo', r => r.insumo || r.descripcion], ['Cant.', r => r.presentaciones], ['Valor', r => fmt(r.total)]]} />;
}
const Gastos = () => <Crud title="Registrar gasto" url="/gastos" init={{ fecha: hoy(), tipo: GT[0], nota: '', valor: '' }}
  fields={[{ k: 'fecha', l: 'Fecha', type: 'date' }, { k: 'tipo', l: 'Tipo', options: GT.map(t => ({ v: t, l: t })) }, { k: 'nota', l: 'Nota (opcional)' }, { k: 'valor', l: 'Valor', type: 'number' }]}
  cols={[['Fecha', r => r.fecha], ['Tipo', r => r.tipo], ['Nota', r => r.nota || ''], ['Valor', r => fmt(r.valor)]]} />;
const Proveedores = () => <Crud title="Nuevo proveedor" url="/proveedores" init={{ nombre: '', telefono: '', vende: '' }}
  fields={[{ k: 'nombre', l: 'Nombre' }, { k: 'telefono', l: 'Teléfono' }, { k: 'vende', l: 'Qué vende' }]}
  cols={[['Nombre', r => r.nombre], ['Teléfono', r => r.telefono || ''], ['Vende', r => r.vende || ''], ['Total comprado', r => fmt(r.total)]]} />;

const TABS = [['📊 Dashboard', Dashboard], ['🧾 Ventas', Ventas], ['🥤 Productos', Productos], ['📦 Inventario', Inventario], ['🛒 Compras', Compras], ['💡 Gastos', Gastos], ['🚚 Proveedores', Proveedores]];
function Login({ onOk }) {
  const [cfg, setCfg] = useState(null), [f, setF] = useState({ usuario: '', clave: '' });
  useEffect(() => { api.get('/auth/estado').then(d => setCfg(d.configurado)).catch(e => say(e.message, true)); }, []);
  const go = () => act(async () => { const d = await api.post(cfg ? '/auth/login' : '/auth/setup', f); localStorage.setItem('token', d.token); onOk(); });
  if (cfg === null) return <div className="card login"><p>Conectando con el servidor…</p></div>;
  return <div className="card login"><h3>{cfg ? 'Iniciar sesión' : 'Crea el usuario administrador'}</h3>
    <label>Usuario<input value={f.usuario} onChange={e => setF({ ...f, usuario: e.target.value })} /></label>
    <label>Clave{!cfg && ' (mínimo 6 caracteres)'}<input type="password" value={f.clave} onChange={e => setF({ ...f, clave: e.target.value })} onKeyDown={e => e.key === 'Enter' && go()} /></label>
    <button className="btn big" onClick={go}>{cfg ? 'Entrar' : 'Crear y entrar'}</button></div>;
}
export default function App() {
  const [ok, setOk] = useState(!!localStorage.getItem('token')), [t, setT] = useState(0), [al, setAl] = useState([]), C = TABS[t][1];
  useEffect(() => { const h = () => setOk(false); window.addEventListener('logout', h); return () => window.removeEventListener('logout', h); }, []);
  useEffect(() => { // alertas de stock bajo: al cambiar de pestaña y tras cada operación
    if (!ok) return; const r = () => api.get('/alertas').then(setAl).catch(() => {}); r();
    window.addEventListener('say', r); return () => window.removeEventListener('say', r);
  }, [ok, t]);
  const salir = () => { localStorage.removeItem('token'); setOk(false); };
  return <>{!ok ? <><header><h1>Gesti?n de Granizados</h1></header><main><Login onOk={() => setOk(true)} /></main></> :
    <div className="app-shell"><aside className="sidebar">
      <div className="brand"><span className="brand-mark">M</span><div><strong>MOONIX</strong><small>Granizados</small></div></div>
      <span className="nav-caption">MEN? PRINCIPAL</span>
      <nav>{TABS.map(([n], i) => <button key={n} className={i === t ? 'on' : ''} onClick={() => setT(i)}>{n}</button>)}</nav>
      <button className="logout l" onClick={salir}>Cerrar sesi?n</button>
    </aside><section className="workspace"><header className="topbar"><div><small>MOONIX / GESTI?N</small><h1>{TABS[t][0].replace(/^\S+\s*/, '')}</h1></div><span className="user-badge">Administrador</span></header>
      {!!al.length && <div className="alerta">Stock bajo: {al.map(i => i.nombre + ' (' + stk(i) + ')').join(' / ')}</div>}
      <main><C key={t} /></main></section></div>}
    <Toast /><Confirm /></>;
}

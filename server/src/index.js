import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import crypto from 'crypto';
const { Pool, types } = pg;
types.setTypeParser(1700, parseFloat); types.setTypeParser(20, parseInt); types.setTypeParser(1082, v => v);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const app = express(); app.use(cors()); app.use(express.json({ limit: '8mb' }));
const OZ = 29.5735;
class Err extends Error { constructor(s, m) { super(m); this.s = s; } }
const h = fn => (req, res, next) => fn(req, res).catch(next);
const q = (t, p) => pool.query(t, p).then(r => r.rows);
const nn = v => (v ? +v : null);
async function tx(fn) {
  const c = await pool.connect();
  try { await c.query('BEGIN'); const r = await fn(c); await c.query('COMMIT'); return r; }
  catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}

// ---- Migración ligera al iniciar (no hace nada si ya existe)
await pool.query(`CREATE TABLE IF NOT EXISTS usuarios (id serial PRIMARY KEY, usuario text UNIQUE NOT NULL, clave text NOT NULL, creado timestamptz DEFAULT now());
  ALTER TABLE insumos ADD COLUMN IF NOT EXISTS stock_minimo numeric(16,3) NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0);
  ALTER TABLE ventas ADD COLUMN IF NOT EXISTS medio_pago text NOT NULL DEFAULT 'Efectivo';
  ALTER TABLE compras ADD COLUMN IF NOT EXISTS factura text;
  ALTER TABLE compras ADD COLUMN IF NOT EXISTS factura_nombre text;
  ALTER TABLE gastos ADD COLUMN IF NOT EXISTS factura text;
  ALTER TABLE gastos ADD COLUMN IF NOT EXISTS factura_nombre text`);

// ---- Autenticación (scrypt + token firmado con HMAC, sin dependencias extra)
const SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) console.warn('Aviso: define JWT_SECRET en server/.env para que las sesiones sobrevivan a reinicios');
const sign = p => { const d = Buffer.from(JSON.stringify(p)).toString('base64url'); return d + '.' + crypto.createHmac('sha256', SECRET).update(d).digest('base64url'); };
const verify = t => {
  const [d, s] = (t || '').split('.'); if (!d || !s) return null;
  const ok = crypto.createHmac('sha256', SECRET).update(d).digest('base64url');
  if (s.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(s), Buffer.from(ok))) return null;
  try { const p = JSON.parse(Buffer.from(d, 'base64url').toString()); return p.exp > Date.now() ? p : null; } catch { return null; }
};
const hash = (clave, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(clave, salt, 64).toString('hex');
const check = (clave, h) => { const [salt, k] = h.split(':'); return crypto.timingSafeEqual(Buffer.from(k), Buffer.from(hash(clave, salt).split(':')[1])); };
const token = u => sign({ u, exp: Date.now() + 7 * 864e5 });
const fails = new Map();
const limit = req => {
  const n = fails.get(req.ip) || { c: 0, t: Date.now() };
  if (Date.now() - n.t > 9e5) { n.c = 0; n.t = Date.now(); }
  fails.set(req.ip, n); if (n.c >= 10) throw new Err(429, 'Demasiados intentos. Espera 15 minutos.'); return n;
};
app.get('/api/auth/estado', h(async (_, res) => res.json({ configurado: (await q('SELECT 1 FROM usuarios LIMIT 1')).length > 0 })));
app.post('/api/auth/setup', h(async (req, res) => {
  const { usuario, clave } = req.body;
  if (!usuario || !clave || clave.length < 6) throw new Err(400, 'Usuario y clave (mínimo 6 caracteres) son obligatorios');
  const r = await q('INSERT INTO usuarios(usuario,clave) SELECT $1,$2 WHERE NOT EXISTS (SELECT 1 FROM usuarios) RETURNING usuario', [usuario.trim(), hash(clave)]);
  if (!r.length) throw new Err(403, 'Ya existe un administrador');
  res.json({ token: token(usuario.trim()) });
}));
app.post('/api/auth/login', h(async (req, res) => {
  const n = limit(req), { usuario, clave } = req.body;
  const u = (await q('SELECT * FROM usuarios WHERE usuario=$1', [(usuario || '').trim()]))[0];
  if (!u || !clave || !check(clave, u.clave)) { n.c++; throw new Err(401, 'Usuario o clave incorrectos'); }
  n.c = 0; res.json({ token: token(u.usuario) });
}));
// Todo lo que sigue exige sesión iniciada
app.use('/api', (req, res, next) => {
  if (!verify((req.headers.authorization || '').replace('Bearer ', ''))) return res.status(401).json({ error: 'Sesión expirada' });
  next();
});

// ---- Ajustes
app.get('/api/ajustes', h(async (_, res) => res.json({ jeringa_ml: (await q("SELECT valor FROM ajustes WHERE clave='jeringa_ml'"))[0].valor })));
app.put('/api/ajustes', h(async (req, res) => {
  const v = +req.body.jeringa_ml; if (!(v > 0)) throw new Err(400, 'Tamaño de jeringa inválido');
  await q("UPDATE ajustes SET valor=$1 WHERE clave='jeringa_ml'", [v]); res.json({ jeringa_ml: v });
}));

// ---- Insumos (granizado: el contenido llega en litros y se guarda en ml)
app.get('/api/insumos', h(async (_, res) => res.json(await q('SELECT * FROM insumos ORDER BY tipo, nombre'))));
app.post('/api/insumos', h(async (req, res) => {
  const b = req.body; let c = +b.contenido;
  if (!b.nombre || !(c > 0)) throw new Err(400, 'Nombre y contenido son obligatorios');
  if (b.tipo === 'granizado') c *= 1000;
  const [r] = await q('INSERT INTO insumos(nombre,tipo,contenido,costo,stock,foto,stock_minimo) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
    [b.nombre, b.tipo, c, +b.costo || 0, (+b.stock || 0) * c, b.foto || null, (+b.minimo || 0) * c]);
  res.status(201).json(r);
}));

// minimo llega en bolsas/botellas/paquetes; se guarda en ml o unidades
app.patch('/api/insumos/:id', h(async (req, res) => {
  const [r] = await q('UPDATE insumos SET stock_minimo = GREATEST(0, $1::numeric) * contenido WHERE id=$2 RETURNING *', [+req.body.minimo || 0, +req.params.id]);
  if (!r) throw new Err(404, 'El insumo no existe'); res.json(r);
}));
app.get('/api/alertas', h(async (_, res) => res.json(await q('SELECT id,nombre,tipo,stock,contenido,stock_minimo FROM insumos WHERE stock_minimo > 0 AND stock <= stock_minimo ORDER BY nombre'))));

// ---- Proveedores / Gastos
app.get('/api/proveedores', h(async (_, res) => res.json(await q('SELECT p.*, COALESCE(SUM(c.total),0) total FROM proveedores p LEFT JOIN compras c ON c.proveedor_id=p.id GROUP BY p.id ORDER BY p.nombre'))));
app.post('/api/proveedores', h(async (req, res) => {
  const b = req.body; if (!b.nombre) throw new Err(400, 'Falta el nombre');
  res.status(201).json((await q('INSERT INTO proveedores(nombre,telefono,vende) VALUES($1,$2,$3) RETURNING *', [b.nombre, b.telefono || null, b.vende || null]))[0]);
}));
app.get('/api/gastos', h(async (_, res) => res.json(await q('SELECT id,fecha,tipo,nota,valor,factura_nombre FROM gastos ORDER BY fecha DESC, id DESC LIMIT 200'))));
app.post('/api/gastos', h(async (req, res) => {
  const b = req.body; if (!(+b.valor > 0)) throw new Err(400, 'Falta el valor');
  const archivo = b.factura || {};
  res.status(201).json((await q('INSERT INTO gastos(fecha,tipo,nota,valor,factura,factura_nombre) VALUES(COALESCE($1::date,CURRENT_DATE),$2,$3,$4,$5,$6) RETURNING id,fecha,tipo,nota,valor,factura_nombre', [b.fecha || null, b.tipo, b.nota || null, +b.valor, archivo.contenido || null, archivo.nombre || null]))[0]);
}));
app.get('/api/gastos/:id/factura', h(async (req, res) => {
  const [r] = await q('SELECT factura contenido FROM gastos WHERE id=$1', [+req.params.id]);
  if (!r?.contenido) throw new Err(404, 'No hay una factura adjunta');
  res.json({ contenido: r.contenido });
}));
for (const t of ['insumos', 'proveedores', 'productos', 'gastos'])
  app.delete(`/api/${t}/:id`, h(async (req, res) => { await q(`DELETE FROM ${t} WHERE id=$1`, [+req.params.id]); res.sendStatus(204); }));

// ---- Productos (el vaso: tamaño + dulces + jeringa)
app.get('/api/productos', h(async (_, res) => res.json(await q(`
  SELECT p.*, COALESCE(json_agg(json_build_object('insumo_id',d.insumo_id,'cantidad',d.cantidad)) FILTER (WHERE d.insumo_id IS NOT NULL),'[]') dulces
  FROM productos p LEFT JOIN producto_dulces d ON d.producto_id=p.id GROUP BY p.id ORDER BY p.tamano_oz, p.id`))));
app.post('/api/productos', h(async (req, res) => {
  const b = req.body;
  if (b.precio === '' || !(+b.precio >= 0)) throw new Err(400, 'Falta el precio');
  if (+b.jeringas > 0 && !b.licor_id) throw new Err(400, 'Elige el licor de la jeringa');
  res.status(201).json(await tx(async c => {
    const p = (await c.query('INSERT INTO productos(nombre,tamano_oz,precio,vaso_id,licor_id,jeringas,foto) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [b.nombre || null, +b.tamano_oz, +b.precio, nn(b.vaso_id), nn(b.licor_id), +b.jeringas || 0, b.foto || null])).rows[0];
    for (const d of b.dulces || [])
      await c.query('INSERT INTO producto_dulces VALUES($1,$2,$3) ON CONFLICT (producto_id,insumo_id) DO UPDATE SET cantidad=producto_dulces.cantidad+EXCLUDED.cantidad', [p.id, +d.insumo_id, +d.cantidad]);
    return p;
  }));
}));

// ---- Ventas: calcula costo y consumo en el servidor, todo en una transacción
async function calc(c, b) {
  const p = (await c.query('SELECT * FROM productos WHERE id=$1', [+b.producto_id])).rows[0];
  if (!p) throw new Err(404, 'El producto no existe');
  const d = (await c.query('SELECT insumo_id, cantidad FROM producto_dulces WHERE producto_id=$1', [p.id])).rows;
  const jm = (await c.query("SELECT valor FROM ajustes WHERE clave='jeringa_ml'")).rows[0].valor;
  const use = new Map(), add = (id, a) => { if (id && a > 0) use.set(id, (use.get(id) || 0) + a); };
  add(p.vaso_id, 1); d.forEach(x => add(x.insumo_id, x.cantidad));
  (b.extras || []).forEach(x => add(+x.insumo_id, +x.cantidad));
  if (nn(b.licor_id) && +b.jeringas > 0) add(+b.licor_id, +b.jeringas * jm);
  if (nn(b.sabor_id)) add(+b.sabor_id, p.tamano_oz * OZ);
  const m = new Map((await c.query('SELECT * FROM insumos WHERE id = ANY($1) FOR UPDATE', [[...use.keys()]])).rows.map(i => [i.id, i]));
  let costo = 0;
  for (const [id, a] of use) { const i = m.get(id); if (!i) throw new Err(400, 'Insumo inválido'); costo += a * i.costo / i.contenido; }
  return { p, use, m, costo };
}
app.get('/api/ventas', h(async (req, res) => res.json(await q('SELECT * FROM ventas WHERE ($1::date IS NULL OR fecha=$1::date) ORDER BY id DESC LIMIT 300', [req.query.fecha || null]))));
app.post('/api/ventas', h(async (req, res) => {
  const b = req.body, n = Math.max(1, parseInt(b.cantidad) || 1);
  const mediosPago = ['Efectivo', 'Transferencia', 'Tarjeta'];
  if (!mediosPago.includes(b.medio_pago)) throw new Err(400, 'Selecciona un medio de pago válido');
  res.status(201).json(await tx(async c => {
    const k = await calc(c, b);
    const sabor = nn(b.sabor_id) ? k.m.get(+b.sabor_id).nombre : (b.sabor_otro || '').trim();
    if (!sabor) throw new Err(400, 'Elige un sabor');
    for (const [id, a] of k.use) { const i = k.m.get(id); if (i.stock < a * n) throw new Err(409, `Stock insuficiente de ${i.nombre}`); }
    const v = (await c.query('INSERT INTO ventas(fecha,producto_id,sabor,tamano_oz,cantidad,precio_unit,costo_unit,medio_pago) VALUES(COALESCE($1::date,CURRENT_DATE),$2,$3,$4,$5,$6,$7,$8) RETURNING *',
      [b.fecha || null, k.p.id, sabor, k.p.tamano_oz, n, k.p.precio + (+b.cobro_extra || 0), k.costo, b.medio_pago])).rows[0];
    for (const [id, a] of k.use) {
      await c.query('UPDATE insumos SET stock=stock-$1 WHERE id=$2', [a * n, id]);
      await c.query('INSERT INTO venta_consumos VALUES($1,$2,$3)', [v.id, id, a * n]);
    }
    return v;
  }));
}));
app.delete('/api/ventas/:id', h(async (req, res) => {
  await tx(async c => {
    await c.query('UPDATE insumos i SET stock=i.stock+vc.cantidad FROM venta_consumos vc WHERE vc.venta_id=$1 AND vc.insumo_id=i.id', [+req.params.id]);
    await c.query('DELETE FROM ventas WHERE id=$1', [+req.params.id]);
  });
  res.sendStatus(204);
}));

// ---- Compras: suben el stock y actualizan el costo del insumo
app.get('/api/compras', h(async (_, res) => res.json(await q('SELECT c.id,c.fecha,c.proveedor_id,c.insumo_id,c.descripcion,c.presentaciones,c.total,c.agregado,c.factura_nombre,i.nombre insumo,p.nombre proveedor FROM compras c LEFT JOIN insumos i ON i.id=c.insumo_id LEFT JOIN proveedores p ON p.id=c.proveedor_id ORDER BY c.fecha DESC, c.id DESC LIMIT 200'))));
app.post('/api/compras', h(async (req, res) => {
  const b = req.body, pk = +b.presentaciones || 1, total = +b.total;
  if (!(total >= 0) || b.total === '' || (!b.insumo_id && !b.descripcion)) throw new Err(400, 'Falta el valor o la descripción');
  res.status(201).json(await tx(async c => {
    let add = 0;
    if (b.insumo_id) {
      const i = (await c.query('SELECT * FROM insumos WHERE id=$1 FOR UPDATE', [+b.insumo_id])).rows[0];
      if (!i) throw new Err(404, 'El insumo no existe');
      add = pk * i.contenido;
      await c.query('UPDATE insumos SET stock=stock+$1, costo=$2 WHERE id=$3', [add, total / pk, i.id]);
    }
    const archivo = b.factura || {};
    return (await c.query('INSERT INTO compras(fecha,proveedor_id,insumo_id,descripcion,presentaciones,total,agregado,factura,factura_nombre) VALUES(COALESCE($1::date,CURRENT_DATE),$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id,fecha,proveedor_id,insumo_id,descripcion,presentaciones,total,agregado,factura_nombre',
      [b.fecha || null, nn(b.proveedor_id), nn(b.insumo_id), b.descripcion || null, pk, total, add, archivo.contenido || null, archivo.nombre || null])).rows[0];
  }));
}));
app.get('/api/compras/:id/factura', h(async (req, res) => {
  const [r] = await q('SELECT factura contenido FROM compras WHERE id=$1', [+req.params.id]);
  if (!r?.contenido) throw new Err(404, 'No hay una factura adjunta');
  res.json({ contenido: r.contenido });
}));
app.delete('/api/compras/:id', h(async (req, res) => {
  await tx(async c => {
    const r = (await c.query('DELETE FROM compras WHERE id=$1 RETURNING insumo_id, agregado', [+req.params.id])).rows[0];
    if (r && r.insumo_id) await c.query('UPDATE insumos SET stock=stock-$1 WHERE id=$2', [r.agregado, r.insumo_id]);
  });
  res.sendStatus(204);
}));

// ---- Dashboard
app.get('/api/dashboard', h(async (req, res) => {
  const mes = /^\d{4}-\d{2}$/.test(req.query.mes) ? req.query.mes : new Date().toISOString().slice(0, 7);
  const w = "to_char(fecha,'YYYY-MM')=$1", p = [mes];
  const [[v], [c], [g], dia, sabor, tam, eg, seis] = await Promise.all([
    q(`SELECT COALESCE(SUM(cantidad*precio_unit),0) ventas, COALESCE(SUM(cantidad*costo_unit),0) costo, COALESCE(SUM(cantidad),0) n FROM ventas WHERE ${w}`, p),
    q(`SELECT COALESCE(SUM(total),0) t FROM compras WHERE ${w}`, p),
    q(`SELECT COALESCE(SUM(valor),0) t FROM gastos WHERE ${w}`, p),
    q(`SELECT EXTRACT(day FROM fecha)::int d, SUM(cantidad*precio_unit) v FROM ventas WHERE ${w} GROUP BY 1 ORDER BY 1`, p),
    q(`SELECT sabor name, SUM(cantidad*precio_unit) value FROM ventas WHERE ${w} GROUP BY 1 ORDER BY 2 DESC`, p),
    q(`SELECT tamano_oz||' oz' name, SUM(cantidad*precio_unit) value FROM ventas WHERE ${w} GROUP BY tamano_oz ORDER BY tamano_oz`, p),
    q(`SELECT tipo name, SUM(valor) value FROM gastos WHERE ${w} GROUP BY 1`, p),
    q(`SELECT to_char(m,'YYYY-MM') mes,
         (SELECT COALESCE(SUM(cantidad*precio_unit),0) FROM ventas WHERE date_trunc('month',fecha)=m) ventas,
         (SELECT COALESCE(SUM(total),0) FROM compras WHERE date_trunc('month',fecha)=m) + (SELECT COALESCE(SUM(valor),0) FROM gastos WHERE date_trunc('month',fecha)=m) egresos
       FROM generate_series(date_trunc('month',$1::date) - interval '5 months', date_trunc('month',$1::date), interval '1 month') m ORDER BY m`, [mes + '-01']),
  ]);
  if (c.t > 0) eg.push({ name: 'Insumos', value: c.t });
  res.json({ ventas: v.ventas, costo: v.costo, n: v.n, compras: c.t, gastos: g.t, dia, sabor, tam, eg, seis });
}));

app.use((e, req, res, _next) => {
  const s = e.s || (e.code === '23514' || e.code === '23503' ? 409 : 500);
  const m = e.s ? e.message : e.code === '23514' ? 'La operación dejaría el stock o un valor en negativo' : e.code === '23503' ? 'No se puede eliminar: está en uso' : 'Error del servidor';
  if (s === 500) console.error(e);
  res.status(s).json({ error: m });
});
app.listen(process.env.PORT || 3001, () => console.log('API lista en puerto', process.env.PORT || 3001));

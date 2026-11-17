import { useEffect, useState } from 'react';
import { api } from './infrastructure/api';
import { Confirm, Toast, stk } from './shared/ui';
import { DashboardPage as Dashboard } from './features/dashboard/page/DashboardPage';
import { SalesPage as Ventas } from './features/sales/page/SalesPage';
import { ProductsPage as Productos } from './features/products/page/ProductsPage';
import { InventoryPage as Inventario } from './features/inventory/page/InventoryPage';
import { PurchasesPage as Compras } from './features/purchases/page/PurchasesPage';
import { ExpensesPage as Gastos } from './features/expenses/page/ExpensesPage';
import { SuppliersPage as Proveedores } from './features/suppliers/page/SuppliersPage';
import { LoginPage as Login } from './features/auth/page/LoginPage';

const TABS = [['?? Dashboard', Dashboard], ['?? Ventas', Ventas], ['?? Productos', Productos], ['?? Inventario', Inventario], ['?? Compras', Compras], ['?? Gastos', Gastos], ['?? Proveedores', Proveedores]];
function App() {
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

export default App;

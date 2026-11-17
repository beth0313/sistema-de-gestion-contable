import { useState } from 'react';
import { act } from '../../../shared/ui';
import { authService } from '../services/authService';
import { useAuthSetup } from '../hooks/useAuthSetup';
function Login({ onOk }) {
  const cfg = useAuthSetup(), [f, setF] = useState({ usuario: '', clave: '' });
  const go = () => act(async () => { const d = cfg ? await authService.signIn(f) : await authService.setup(f); localStorage.setItem('token', d.token); onOk(); });
  if (cfg === null) return <div className="card login"><p>Conectando con el servidor…</p></div>;
  return <div className="card login"><h3>{cfg ? 'Iniciar sesión' : 'Crea el usuario administrador'}</h3>
    <label>Usuario<input value={f.usuario} onChange={e => setF({ ...f, usuario: e.target.value })} /></label>
    <label>Clave{!cfg && ' (mínimo 6 caracteres)'}<input type="password" value={f.clave} onChange={e => setF({ ...f, clave: e.target.value })} onKeyDown={e => e.key === 'Enter' && go()} /></label>
    <button className="btn big" onClick={go}>{cfg ? 'Entrar' : 'Crear y entrar'}</button></div>;
}

export { Login as LoginPage };

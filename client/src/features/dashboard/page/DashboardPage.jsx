import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fmt, hoy } from "../../../shared/ui";
import { useDashboardData } from "../hooks/useDashboardData";
import { PieChartCard } from "../components/PieChartCard";
const COL = [
  "#06b6d4",
  "#a855f7",
  "#f59e0b",
  "#ef4444",
  "#22c55e",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
];

function Dashboard() {
  const [mes, setMes] = useState(hoy().slice(0, 7)),
    d = useDashboardData(mes);
  const [y, m] = mes.split("-").map(Number);
  const K = (l, v, c) => (
    <div className="card kpi">
      <small>{l}</small>
      <b className={c}>{fmt(v)}</b>
    </div>
  );
  return (
    <>
      <div className="card f">
        <label>
          Mes
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value || mes)}
          />
        </label>
      </div>
      {d && (
        <>
          <div className="grid">
            {K(`Ventas (${d.n} granizados)`, d.ventas)}
            {K("Compras", d.compras)}
            {K("Gastos (luz, agua, arriendo…)", d.gastos)}
            {K(
              "Utilidad (ventas − compras − gastos)",
              d.ventas - d.compras - d.gastos,
              d.ventas - d.compras - d.gastos >= 0 ? "ok" : "bad",
            )}
            {K(
              "Margen de productos (ventas − costo)",
              d.ventas - d.costo,
              "ok",
            )}
          </div>
          <div className="cg">
            <div className="card">
              <h3>Ventas por día</h3>
              <div className="cv">
                <ResponsiveContainer>
                  <BarChart
                    data={Array.from(
                      { length: new Date(y, m, 0).getDate() },
                      (_, i) => ({
                        d: i + 1,
                        v: d.dia.find((x) => x.d === i + 1)?.v || 0,
                      }),
                    )}
                  >
                    <XAxis dataKey="d" />
                    <YAxis />
                    <Tooltip formatter={fmt} />
                    <Bar dataKey="v" name="Ventas" fill={COL[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <PieChartCard title="Ventas por sabor" data={d.sabor} />
            <PieChartCard title="Ventas por tamaño de vaso" data={d.tam} />
            <PieChartCard title="Egresos por categoría" data={d.eg} />
            <div className="card">
              <h3>Ventas vs egresos (6 meses)</h3>
              <div className="cv">
                <ResponsiveContainer>
                  <BarChart data={d.seis}>
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip formatter={fmt} />
                    <Legend />
                    <Bar dataKey="ventas" name="Ventas" fill={COL[4]} />
                    <Bar dataKey="egresos" name="Egresos" fill={COL[3]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export { Dashboard as DashboardPage };

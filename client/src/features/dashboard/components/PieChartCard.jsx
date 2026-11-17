import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { fmt } from "../../../shared/ui";

const COLORS = ["#06b6d4", "#a855f7", "#f59e0b", "#ef4444", "#22c55e", "#3b82f6", "#ec4899", "#14b8a8"];

export function PieChartCard({ title, data }) {
  return <div className="card"><h3>{title}</h3><div className="cv"><ResponsiveContainer>
    <PieChart><Pie data={data} dataKey="value" nameKey="name" outerRadius={85} innerRadius={45}>
      {data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
    </Pie><Tooltip formatter={fmt} /><Legend /></PieChart>
  </ResponsiveContainer></div></div>;
}

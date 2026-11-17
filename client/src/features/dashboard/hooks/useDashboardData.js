import { useEffect, useState } from "react";
import { dashboardService } from "../services/dashboardService";
import { say } from "../../../shared/ui";

export function useDashboardData(month) {
  const [data, setData] = useState(null);
  useEffect(() => {
    dashboardService.getByMonth(month).then(setData).catch((error) => say(error.message, true));
  }, [month]);
  return data;
}

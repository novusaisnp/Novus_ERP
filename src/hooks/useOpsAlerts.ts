// P6.2 — Hook para alertas operacionais.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ackOpsAlert,
  countOpenOpsAlerts,
  listOpsAlerts,
  type OpsAlertRow,
} from "@/services/opsAlertsService";

const KEY_LIST = ["ops-alerts", "list"] as const;
const KEY_COUNT = ["ops-alerts", "count-open"] as const;

export function useOpsAlerts(onlyOpen = false) {
  return useQuery<OpsAlertRow[]>({
    queryKey: [...KEY_LIST, onlyOpen],
    queryFn: () => listOpsAlerts({ onlyOpen, limit: 100 }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useOpenOpsAlertCount() {
  return useQuery<number>({
    queryKey: KEY_COUNT,
    queryFn: () => countOpenOpsAlerts(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useAckOpsAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ackOpsAlert(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY_LIST });
      qc.invalidateQueries({ queryKey: KEY_COUNT });
    },
  });
}

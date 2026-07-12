import { useCallback, useEffect, useState } from "react";
import { reportSchedulesService } from "@/services/reportSchedulesService";
import type {
  ReportSchedule,
  ReportScheduleInput,
  ReportScheduleRun,
  ReportScheduleScope,
} from "@/types/reportSchedule";

// Hook autônomo (sem React Query) para minimizar impacto no bundle nas páginas P1-P3.
// Refetch explícito após mutações.
export function useReportSchedules(scope: ReportScheduleScope) {
  const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await reportSchedulesService.listSchedules(scope);
      setSchedules(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao listar agendamentos.");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const create = useCallback(
    async (payload: ReportScheduleInput) => {
      const created = await reportSchedulesService.createSchedule(payload);
      await refetch();
      return created;
    },
    [refetch],
  );

  const update = useCallback(
    async (id: string, patch: Partial<ReportScheduleInput>) => {
      const updated = await reportSchedulesService.updateSchedule(id, patch);
      await refetch();
      return updated;
    },
    [refetch],
  );

  const toggle = useCallback(
    async (id: string, enabled: boolean) => {
      const updated = await reportSchedulesService.toggleSchedule(id, enabled);
      await refetch();
      return updated;
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      await reportSchedulesService.deleteSchedule(id);
      await refetch();
    },
    [refetch],
  );

  const listRuns = useCallback(
    (id: string, limit = 20): Promise<ReportScheduleRun[]> => reportSchedulesService.listRuns(id, limit),
    [],
  );

  return { schedules, loading, error, refetch, create, update, toggle, remove, listRuns };
}

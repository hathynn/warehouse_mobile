import { useCallback, useState } from "react";
import useApiService from "./useApi";
import { StaffTasksPerDate } from "@/types/staffWork.type";


const useStaffTaskService = () => {
  const { callApi, loading } = useApiService();

  const [taskOfStaffPerDate, setTaskOfStaffPerDate] =
    useState<StaffTasksPerDate | null>(null);

  /**
   * GET /account/task-of-staff-per-date/{staffId}?date=2025-08-27
   */
  const fetchTaskOfStaffPerDate = useCallback(
    async (staffId: number | string, date: string) => {
      if (!staffId || !date) return null;

      try {
        const response = await callApi(
          "get",
          `/account/task-of-staff-per-date/${staffId}`,
          undefined,
          { params: { date } }, 
          `Lấy task của staffId=${staffId} ngày ${date}`
        );

        const content = (response?.content || null) as StaffTasksPerDate | null;
        setTaskOfStaffPerDate(content);
        return content;
      } catch (error) {
        console.log(
          `Lỗi khi lấy task staffId=${staffId} theo ngày ${date}:`,
          error
        );
        return null;
      }
    },
    [callApi]
  );


  const fetchTaskOfStaffToday = useCallback(
    async (staffId: number | string) => {
      const today = new Date();
      const iso = today.toISOString().slice(0, 10); // yyyy-MM-dd
      return fetchTaskOfStaffPerDate(staffId, iso);
    },
    [fetchTaskOfStaffPerDate]
  );

  return {
    loading,
    taskOfStaffPerDate,
    fetchTaskOfStaffPerDate,
    fetchTaskOfStaffToday,
  };
};

export default useStaffTaskService;

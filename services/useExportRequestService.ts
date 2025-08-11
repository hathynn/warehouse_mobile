import { useState, useCallback } from "react";
import { ExportRequestStatus, ExportRequestType } from "../types/exportRequest.type";
import useApiService from "./useApi";


const useExportRequest = () => {
  const { loading, callApi, setIsLoading } = useApiService();
  const [exportRequests, setExportRequests] = useState<ExportRequestType[]>([]);
  const [exportRequest, setExportRequest] = useState<ExportRequestType | null>(
    null
  );

  // Lấy danh sách export request theo staffId, có hỗ trợ phân trang
  const fetchExportRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await callApi("get", `/export-request`, {});
      setExportRequests(response.content);
      return response.content;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách export request:", error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [callApi, setIsLoading]);

  // Lấy danh sách export request theo staffId (có phân trang)
  const fetchExportRequestsByStaffId = useCallback(
    async (staffId: number, page = 1, limit = 100) => {
      setIsLoading(true);
      try {
        const response = await callApi(
          "get",
          `/export-request/staff/${staffId}`,

          {
            params: {
              page,
              limit,
            },
          }
        );
        // console.log("Full response:", response);
        const content = response?.content || [];
        setExportRequests(content);
        return content;
      } catch (error) {
        console.error("Lỗi khi lấy export request theo staffId:", error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // Filter export requests theo role của user
const filterExportRequestsByRole = useCallback(
  (requests: ExportRequestType[], userId: number) => {
    if (!requests || !userId) return [];

    return requests.filter((request) => {
      const isKeeper = request.assignedWareHouseKeeperId === userId;
      const isCounter = request.countingStaffId === userId;

      if (!isKeeper && !isCounter) return false;

      const allowed = new Set<ExportRequestStatus>();
      if (isKeeper) {
        ["WAITING_EXPORT", "COMPLETED"].forEach((s) => allowed.add(s as ExportRequestStatus));
      }
      if (isCounter) {
        ["IN_PROGRESS", "COUNTED", "COUNT_CONFIRMED", "CONFIRMED"].forEach((s) =>
          allowed.add(s as ExportRequestStatus)
        );
      }
      return allowed.has(request.status);
    });
  },
  []
);


  const updateExportRequestStatus = useCallback(
    async (exportRequestId: string, status: string) => {
      console.log("ID API:", exportRequestId);
      if (!exportRequestId || !status) return false;
      setIsLoading(true);
      try {
        const response = await callApi(
          "post",
          `/export-request/update-status/${exportRequestId}?status=${status}`,

          // {
          //   params: { status },
          // }
        );
        // console.log("1", response);
        return response;
      } catch (error) {
        console.error("❌ Lỗi khi cập nhật trạng thái export request:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // Lấy chi tiết Export Request theo ID
  const fetchExportRequestById = useCallback(
    async (id: string) => {
      if (!id) return;
      setIsLoading(true);
      try {
        const response = await callApi("get", `/export-request/${id}`);
        setExportRequest(response.content);
      } catch (error) {
        console.error("Lỗi khi lấy export request:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // Cập nhật export request
  const updateExportRequest = useCallback(
    async (id: string, updatedData: Partial<ExportRequestType>) => {
      setIsLoading(true);
      try {
        console.log("Hello");
        const response = await callApi(
          "post",
          `/export-request/update-status/${id}`,
          updatedData
        );
        return response;
      } catch (error) {
        console.error("Lỗi khi cập nhật export request:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  return {
    loading,
    exportRequests,
    exportRequest,
    fetchExportRequests,
    fetchExportRequestById,
    updateExportRequest,
    fetchExportRequestsByStaffId,
    updateExportRequestStatus,
    filterExportRequestsByRole,
  };
};

export default useExportRequest;

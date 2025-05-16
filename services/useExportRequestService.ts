import { useState, useCallback } from "react";
import { ExportRequestType } from "../types/exportRequest.type";
import useApiService from "./useApi";

const BASE_URL =
  "https://warehouse-backend-jlcj5.ondigitalocean.app/export-request";

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
      const response = await callApi("get", `${BASE_URL}`, {});
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
          `${BASE_URL}/staff/${staffId}`, undefined,
          {
            params: {
              page,
              limit,
            },
          }
        );
        console.log("Full response:", response);
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
  
const updateExportRequestStatus = useCallback(
  async (exportRequestId: number, status: string) => {
    if (!exportRequestId || !status) return false;
    setIsLoading(true);
    try {
      const response = await callApi(
        "post",
        `${BASE_URL}/update-status/${exportRequestId}`,
        undefined,
        {
          params: { status },
        }
      );
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
    async (id: number) => {
      if (!id) return;
      setIsLoading(true);
      try {
        const response = await callApi("get", `${BASE_URL}/${id}`);
        setExportRequest(response.content); // ✅ PHẢI có dòng này
      } catch (error) {
        console.error("Lỗi khi lấy export request:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // Tạo mới export request
  const createExportRequest = useCallback(
    async (newRequest: Omit<ExportRequestType, "exportRequestId">) => {
      setIsLoading(true);
      try {
        const response = await callApi("post", BASE_URL, newRequest);
        return response;
      } catch (error) {
        console.error("Lỗi khi tạo export request:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // Cập nhật export request
  const updateExportRequest = useCallback(
    async (id: number, updatedData: Partial<ExportRequestType>) => {
      setIsLoading(true);
      try {
        console.log("Hello")
        const response = await callApi("put", `${BASE_URL}/${id}`, updatedData);
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

  // Xóa export request
  const deleteExportRequest = useCallback(
    async (id: number) => {
      setIsLoading(true);
      try {
        await callApi("delete", `${BASE_URL}/${id}`);
        return true;
      } catch (error) {
        console.error("Lỗi khi xóa export request:", error);
        return false;
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
    createExportRequest,
    updateExportRequest,
    deleteExportRequest,
    fetchExportRequestsByStaffId,
    updateExportRequestStatus
  };
};

export default useExportRequest;

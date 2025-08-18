// src/services/useStockCheck.ts
import { useState, useCallback } from "react";
import { StockCheckType, StockCheckStatus } from "../types/stockCheck.type";
import useApiService from "./useApi";

const useStockCheck = () => {
  const { loading, callApi, setIsLoading } = useApiService();
  const [stockChecks, setStockChecks] = useState<StockCheckType[]>([]);

  const fetchStockChecksByStaff = useCallback(
    async (staffId: number, page = 1, limit = 999) => {
      setIsLoading(true);
      try {
        const response = await callApi("get", `/stock-check/staff/${staffId}`, {
          params: { page, limit },
        });
        setStockChecks(response.content as StockCheckType[]);
        return response.content as StockCheckType[];
      } catch (error) {
        console.log("Lỗi khi lấy danh sách stock check theo staff:", error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  const fetchStockCheckById = useCallback(
    async (stockCheckId: string) => {
      if (!stockCheckId) return null;
      setIsLoading(true);
      try {
        const response = await callApi("get", `/stock-check/${stockCheckId}`);
        return response.content || response;
      } catch (error) {
        console.log("Lỗi khi lấy thông tin stock check:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  const updateStockCheckStatus = useCallback(
    async (stockCheckId: string, status: StockCheckStatus) => {
      if (!stockCheckId || !status) return false;

      setIsLoading(true);
      try {
        const response = await callApi(
          "post",
          `/stock-check/update-status/${stockCheckId}`,
          null,
          {
            params: {
              status,
            },
          }
        );

        setStockChecks((prev) =>
          prev.map((s) =>
            s.id === stockCheckId ? { ...s, status: status } : s
          )
        );

        return response;
      } catch (error) {
        console.log("Lỗi khi cập nhật trạng thái stock check:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // NEW: Confirm counted -> PUT /stock-check/confirm-counted/{stockCheckId}
  const confirmCounted = useCallback(
    async (stockCheckId: string) => {
      if (!stockCheckId) return false;
      setIsLoading(true);
      try {
        const response = await callApi(
          "put",
          `/stock-check/confirm-counted/${stockCheckId}`
        );
        return response; // tùy backend trả gì: message/status/content
      } catch (error) {
        console.log("Lỗi khi confirm counted stock check:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  return {
    loading,
    stockChecks,
    fetchStockChecksByStaff,
    fetchStockCheckById,
    updateStockCheckStatus,
    confirmCounted,
  };
};

export default useStockCheck;

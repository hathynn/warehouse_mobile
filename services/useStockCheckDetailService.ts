import { useState, useCallback } from "react"; 
import useApiService from "./useApi";
import { StockCheckDetailType } from "../types/stockCheckDetail.type";

export interface TrackInventoryItemPayload {
  stockCheckDetailId: number;
  inventoryItemId: string;
}

const useStockCheckDetail = () => {
  const { loading, callApi, setIsLoading } = useApiService();

  const [stockCheckDetails, setStockCheckDetails] = useState<StockCheckDetailType[]>([]);

  // Fetch details
  const fetchStockCheckDetails = useCallback(
    async (stockCheckId: string) => {
      if (!stockCheckId) return [];

      setIsLoading(true);
      try {
        const response = await callApi(
          "get",
          `/stock-check-detail/${stockCheckId}`
        );
        const data = (response?.content ?? response) as StockCheckDetailType[];
        setStockCheckDetails(data);
        return data;
      } catch (error) {
        console.error("Lỗi khi lấy stock check details:", error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // Track item
  const trackInventoryItem = useCallback(
    async (payload: TrackInventoryItemPayload) => {
      if (!payload?.stockCheckDetailId || !payload?.inventoryItemId) {
        throw new Error("Thiếu stockCheckDetailId hoặc inventoryItemId");
      }

      setIsLoading(true);
      try {
        const response = await callApi(
          "put",
          `/stock-check-detail/tracking`,
          payload
        );
        const updated = (response?.content ?? response) as StockCheckDetailType | undefined;
        if (updated?.id) {
          setStockCheckDetails((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d))
          );
        }

        return response;
      } catch (error) {
        console.error("Lỗi khi tracking stock check detail:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  const resetTracking = useCallback(
    async (payload: TrackInventoryItemPayload) => {
      if (!payload?.stockCheckDetailId || !payload?.inventoryItemId) {
        throw new Error("Thiếu stockCheckDetailId hoặc inventoryItemId");
      }

      setIsLoading(true);
      try {
        const response = await callApi(
          "put",
          `/stock-check-detail/reset-tracking`,
          payload
        );
        const updated = (response?.content ?? response) as StockCheckDetailType | undefined;
        if (updated?.id) {
          setStockCheckDetails((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d))
          );
        }

        return response;
      } catch (error) {
        console.error("Lỗi khi reset tracking stock check detail:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  return {
    loading,
    stockCheckDetails,
    fetchStockCheckDetails,
    trackInventoryItem,
    resetTracking, 
  };
};

export default useStockCheckDetail;

import { useState, useCallback } from "react"; 
import useApiService from "./useApi";
import { StockCheckDetailType } from "../types/stockCheckDetail.type";

export interface TrackInventoryItemPayload {
  stockCheckDetailId: number;
  inventoryItemId: string;
  actualMeasurementValue?: number;
  status?: "AVAILABLE" | "NEED_LIQUID";
  note?: string;
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
        console.log("Lỗi khi lấy stock check details:", error);
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

      console.log("🚀 [API] PUT /stock-check-detail/tracking - Request:", JSON.stringify(payload, null, 2));
      
      setIsLoading(true);
      try {
        const response = await callApi(
          "put",
          `/stock-check-detail/tracking`,
          payload
        );
        
        console.log("✅ [API] PUT /stock-check-detail/tracking - Response:", JSON.stringify(response, null, 2));
        
        const updated = (response?.content ?? response) as StockCheckDetailType | undefined;
        if (updated?.id) {
          console.log("🔄 [API] Updating stockCheckDetails with:", JSON.stringify(updated, null, 2));
          setStockCheckDetails((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d))
          );
        }

        return response;
      } catch (error) {
        console.log("❌ [API] PUT /stock-check-detail/tracking - Error:", error);
        console.log("❌ [API] Error details:", JSON.stringify(error, null, 2));
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
        console.log("Lỗi khi reset tracking stock check detail:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // Get single stock check detail
  const getStockCheckDetailById = useCallback(
    async (stockCheckDetailId: number) => {
      if (!stockCheckDetailId) return null;

      try {
        const response = await callApi(
          "get",
          `/stock-check-detail/detail/${stockCheckDetailId}`
        );
        return (response?.content ?? response) as StockCheckDetailType;
      } catch (error) {
        console.log("Lỗi khi lấy stock check detail:", error);
        return null;
      }
    },
    [callApi]
  );

  return {
    loading,
    stockCheckDetails,
    fetchStockCheckDetails,
    getStockCheckDetailById,
    trackInventoryItem,
    resetTracking, 
  };
};

export default useStockCheckDetail;

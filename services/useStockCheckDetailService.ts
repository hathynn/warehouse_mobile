import { useState, useCallback } from "react";
import useApiService from "./useApi";
import { StockCheckDetailType } from "../types/stockCheckDetail.type";


export interface TrackInventoryItemPayload {
  stockCheckDetailId: number; // theo swagger là number (long)
  inventoryItemId: string;
}

const useStockCheckDetail = () => {
  const { loading, callApi, setIsLoading } = useApiService();

  const [stockCheckDetails, setStockCheckDetails] = useState<StockCheckDetailType[]>([]);


  const fetchStockCheckDetails = useCallback(
    async (stockCheckId: string) => {
      if (!stockCheckId) return [];

      setIsLoading(true);
      try {
        const response = await callApi(
          "get",
          `/stock-check-detail/${stockCheckId}`
        );
        // Tùy backend trả về; giả sử data nằm ở response.content
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

        // Nếu API trả về detail đã cập nhật, có thể đồng bộ lại state cục bộ:
        const updated = (response?.content ?? response) as StockCheckDetailType | undefined;
        if (updated?.id) {
          setStockCheckDetails((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d))
          );
        }

        return response;
      } catch (error) {
        console.error("Lỗi khi cập nhật tracking stock check detail:", error);
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
  };
};

export default useStockCheckDetail;

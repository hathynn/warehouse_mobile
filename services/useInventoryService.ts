import { useState, useCallback } from "react";
import useApiService from "./useApi";

const BASE_URL = "https://warehouse-backend-jlcj5.ondigitalocean.app";

const useInventoryService = () => {
  const { callApi, setIsLoading, loading } = useApiService();

  const fetchInventoryItemsByImportOrderDetailId = useCallback(
    async (importOrderDetailId: string, page = 1, limit = 100) => {
      if (!importOrderDetailId) return [];
      setIsLoading(true);
      try {
        const res = await callApi(
          "get",
          `${BASE_URL}/inventory-item/import-order-detail/${importOrderDetailId}`,
          undefined, // không có body cho GET
          { params: { page, limit } } // → đây mới là config được truyền xuống axios
        );

        console.log("📦 API trả về:", res.metaDataDTO);

        return res.content || [];
      } catch (err) {
        console.error("Lỗi khi gọi inventory items:", err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  return { loading, fetchInventoryItemsByImportOrderDetailId };
};

export default useInventoryService;

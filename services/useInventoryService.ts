import { useState, useCallback } from "react";
import useApiService from "./useApi";
import { InventoryItem } from "@/types/inventoryItem.type";

const useInventoryService = () => {
  const { callApi, setIsLoading, loading } = useApiService();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const fetchInventoryItemsByImportOrderDetailId = useCallback(
    async (importOrderDetailId: number, page = 1, limit = 999) => {
      if (!importOrderDetailId) return [];

      try {
        const response = await callApi(
          "get",
          `/inventory-item/import-order-detail/${importOrderDetailId}`,
          undefined, // data = undefined cho GET request
          { params: { page, limit } }, // params qua options
          `✅ Lấy inventory items cho import order detail ${importOrderDetailId}`
        );

        setInventoryItems(response.content || []);
        return response.content || [];
      } catch (error) {
        console.error("❌ Lỗi khi lấy inventory items:", error);
        return [];
      }
    },
    [callApi]
  );

  const fetchInventoryItemsByExportRequestDetailId = useCallback(
    async (exportRequestDetailId: number, page = 1, limit = 999) => {
      if (!exportRequestDetailId) return [];

      try {
        const response = await callApi(
          "get",
          `/inventory-item/export-request-detail/${exportRequestDetailId}`,
          undefined, // data = undefined cho GET request
          { params: { page, limit } }, // params qua options
          `✅ Lấy inventory items cho export request detail ${exportRequestDetailId}`
        );

        setInventoryItems(response.content || []);
        return response.content || [];
      } catch (error) {
        console.error("❌ Lỗi khi lấy export inventory items:", error);
        return [];
      }
    },
    [callApi]
  );

  const autoChangeInventoryItem = useCallback(
    async (inventoryItemId: string) => {
      if (!inventoryItemId) return;

      try {
        const response = await callApi(
          "put",
          `/inventory-item/auto-change/${inventoryItemId}`,
          {}, // empty body cho PUT request
          undefined, // no additional options
          `✅ Auto-change inventory item ${inventoryItemId}`
        );

        return response;
      } catch (error) {
        console.error("❌ Lỗi khi gọi auto-change:", error);
        throw error;
      }
    },
    [callApi]
  );

  const fetchInventoryItemById = useCallback(
  async (inventoryItemId: string) => {
    if (!inventoryItemId) return null;

    try {
      const response = await callApi(
        "get",
        `/inventory-item/${inventoryItemId}`,
        undefined, 
        undefined, 
        `Lấy inventory item theo ID ${inventoryItemId}`
      );

      return response.content; 
    } catch (error) {
      console.error("❌ Lỗi khi lấy inventory item theo ID:", error);
      return null;
    }
  },
  [callApi]
);

  return {
    loading,
    inventoryItems,
    fetchInventoryItemsByImportOrderDetailId,
    fetchInventoryItemsByExportRequestDetailId,
    autoChangeInventoryItem,
    fetchInventoryItemById,
  };
};

export default useInventoryService;
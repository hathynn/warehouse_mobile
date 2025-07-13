import { useState, useCallback } from "react";
import useApiService from "./useApi";

import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { InventoryItem } from "@/types/inventoryItem.type";

const useInventoryService = () => {
  const { callApi, setIsLoading, loading } = useApiService();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const fetchInventoryItemsByImportOrderDetailId = useCallback(
    async (importOrderDetailId: number, page = 1, limit = 999) => {
      if (!importOrderDetailId) return [];

      const token = await AsyncStorage.getItem("access_token");
      setIsLoading(true);

      try {
        const response = await axios.get(
          `https://warehouse-backend-jlcj5.ondigitalocean.app/inventory-item/import-order-detail/${importOrderDetailId}`,
          {
            params: { page, limit },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setInventoryItems(response.data.content || []);
        return response.data.content || [];
      } catch (error) {
        console.error("Lỗi khi lấy inventory items:", error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading]
  );

  const fetchInventoryItemsByExportRequestDetailId = useCallback(
    async (exportRequestDetailId: number, page = 1, limit = 999) => {
      if (!exportRequestDetailId) return [];

      const token = await AsyncStorage.getItem("access_token");
      setIsLoading(true);

      try {
        const response = await axios.get(
          `https://warehouse-backend-jlcj5.ondigitalocean.app/inventory-item/export-request-detail/${exportRequestDetailId}`,
          {
            params: { page, limit },
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setInventoryItems(response.data.content || []);
        return response.data.content || [];
      } catch (error) {
        console.error("Lỗi khi lấy export inventory items:", error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading]
  );

  const autoChangeInventoryItem = useCallback(
  async (inventoryItemId: string) => {
    if (!inventoryItemId) return;

    const token = await AsyncStorage.getItem("access_token");
    setIsLoading(true);

    try {
      const response = await axios.put(
        `https://warehouse-backend-jlcj5.ondigitalocean.app/inventory-item/auto-change/${inventoryItemId}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error("❌ Lỗi khi gọi auto-change:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  },
  [setIsLoading]
);


  return {
    loading,
    fetchInventoryItemsByImportOrderDetailId,
    fetchInventoryItemsByExportRequestDetailId,
    autoChangeInventoryItem
  };
};

export default useInventoryService;

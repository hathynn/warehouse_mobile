import { useState, useCallback } from "react";
import useApiService from "./useApi";
import { InventoryItemType } from "@/types/inventoryItem.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const INVENTORY_URL =
  "https://warehouse-backend-jlcj5.ondigitalocean.app/inventory-item/import-order-detail";

const useInventoryService = () => {
  const { callApi, setIsLoading, loading } = useApiService();
  const [inventoryItems, setInventoryItems] = useState<InventoryItemType[]>([]);

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

  return { loading, fetchInventoryItemsByImportOrderDetailId };
};

export default useInventoryService;

import { useState, useCallback } from "react";
import axios from "axios";
import { ImportOrderDetailType } from "@/types/importOrderDetail.type";

import useApiService from "./useApi";
import { InventoryItem } from "@/types/inventoryItem.type";

const INVENTORY_URL = "https://warehouse-backend-jlcj5.ondigitalocean.app/inventory-item/import-order-detail";

const useImportOrderDetail = () => {
  const { callApi, setIsLoading } = useApiService();

  const [loading, setLoading] = useState(false);
  const [importOrderDetails, setImportOrderDetails] = useState<ImportOrderDetailType[]>([]);
  const [importOrderDetail, setImportOrderDetail] = useState<ImportOrderDetailType | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);


  const fetchInventoryItemsByImportOrderDetailId = useCallback(
    async (importOrderDetailId: number, page = 1, limit = 999) => {
      if (!importOrderDetailId) return [];

      setIsLoading(true);
      try {
        const response = await callApi(
          "get",
          `${INVENTORY_URL}/${importOrderDetailId}`,
          { params: { page, limit } }
        );
        setInventoryItems(response.content || []);
        return response.content || [];
      } catch (error) {
        console.error("Lỗi khi lấy inventory items:", error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // ✅ Lấy danh sách detail theo orderId
  const fetchImportOrderDetails = useCallback(
    async (importOrderId: string, page = 1, size = 999) => {
      if (!importOrderId) return [];

      setLoading(true);
      try {
        const response = await callApi("get", `/import-order-detail/page/${importOrderId}`, {
          params: { page, size },
        });

        const data = response.content;

        if (Array.isArray(data)) {
          setImportOrderDetails(data);
          return data;
        } else if (data && typeof data === "object") {
          setImportOrderDetails([data]);
          return [data];
        } else {
          console.warn("API trả về dữ liệu không hợp lệ:", data);
          return [];
        }
      } catch (error) {
        console.error("Lỗi khi lấy danh sách import order details:", error);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [callApi]
  );

  // ✅ Lấy chi tiết 1 dòng
  const fetchImportOrderDetailById = useCallback(
    async (id: string) => {
      if (!id) return null;
  
      setLoading(true);
      try {
        const response = await callApi("get", `/import-order-detail/${id}`);
        setImportOrderDetail(response.content);
        return response.content;
      } catch (error) {
        console.error("Lỗi khi lấy chi tiết import order detail:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [callApi]
  );
  

  const updateImportOrderDetail = useCallback(
    async (id: number, updatedData: Partial<ImportOrderDetailType>) => {
      setLoading(true);
      try {
        const response = await callApi("put", `/import-order-detail/${id}`, updatedData);
        return response;
      } catch (error) {
        console.error("Lỗi khi cập nhật import order detail:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [callApi]
  );



  const updateImportOrderDetailsByOrderId = useCallback(
    async (
      importOrderId: string,
      updateItems: {
        itemId: string;
        actualQuantity: number;
      }[]
    ) => {
      setLoading(true);
      try {
        const response = await callApi(
          "put",
          `/import-order-detail/${importOrderId}`,
          updateItems
        );
        return response;
      } catch (error) {
        console.error("Lỗi khi cập nhật số lượng thực tế:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [callApi]
  );

const updateImportOrderDetailMeasurement = useCallback(
  async (
    importOrderDetailId: number,
    data: {
      inventoryItemId: string;
      actualMeasurement: number;
      itemId?: string;
      actualQuantity?: number;
    }
  ) => {
    if (!importOrderDetailId || !data.inventoryItemId) {
      console.error("Missing required fields for measurement update:", {
        importOrderDetailId,
        inventoryItemId: data.inventoryItemId
      });
      return null;
    }

    setLoading(true);
    try {
      console.log("→ [API] PUT /import-order-detail/measurement/" + importOrderDetailId, data);
      const response = await callApi(
        "put",
        `/import-order-detail/measurement/${importOrderDetailId}`,
        data
      );
      console.log("← [API SUCCESS] Measurement update response:", response);
      return response;
    } catch (error) {
      console.error("← [API ERROR]", error?.response?.status, error?.message);
      console.error("Lỗi khi cập nhật actual measurement:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  },
  [callApi]
);

  return {
    loading,
    inventoryItems,
    importOrderDetails,
    importOrderDetail,
    fetchImportOrderDetails,
    fetchImportOrderDetailById,
    fetchInventoryItemsByImportOrderDetailId,
    updateImportOrderDetail,
    updateImportOrderDetailsByOrderId,
    updateImportOrderDetailMeasurement
  };
};

export default useImportOrderDetail;

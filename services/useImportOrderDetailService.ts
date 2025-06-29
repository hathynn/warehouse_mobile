import { useState, useCallback } from "react";
import axios from "axios";
import { ImportOrderDetailType } from "@/types/importOrderDetail.type";
import { InventoryItemType } from "@/types/inventoryItem.types";
import useApiService from "./useApi";

const INVENTORY_URL = "https://warehouse-backend-jlcj5.ondigitalocean.app/inventory-item/import-order-detail";

const useImportOrderDetail = () => {
  const { callApi, setIsLoading } = useApiService();

  const [loading, setLoading] = useState(false);
  const [importOrderDetails, setImportOrderDetails] = useState<ImportOrderDetailType[]>([]);
  const [importOrderDetail, setImportOrderDetail] = useState<ImportOrderDetailType | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemType[]>([]);


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
  };
};

export default useImportOrderDetail;

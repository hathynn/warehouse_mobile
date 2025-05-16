import { useState, useCallback } from "react";
import axios from "axios";
import { ImportOrderDetailType } from "@/types/importOrderDetail.type";
import { InventoryItemType } from "@/types/inventoryItem.types";
import useApiService from "./useApi";

const BASE_URL = "https://warehouse-backend-jlcj5.ondigitalocean.app/import-order-detail";
const INVENTORY_URL = "https://warehouse-backend-jlcj5.ondigitalocean.app/inventory-item/import-order-detail";

const useImportOrderDetail = () => {
  const { callApi, setIsLoading } = useApiService();

  const [loading, setLoading] = useState(false);
  const [importOrderDetails, setImportOrderDetails] = useState<ImportOrderDetailType[]>([]);
  const [importOrderDetail, setImportOrderDetail] = useState<ImportOrderDetailType | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItemType[]>([]);

  // ✅ NEW: fetch inventory items by importOrderDetailId
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
    async (importOrderId: number, page = 1, size = 999) => {
      if (!importOrderId) return [];

      setLoading(true);
      try {
        const response = await callApi("get", `${BASE_URL}/page/${importOrderId}`, {
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
    async (id: number) => {
      if (!id) return null;
  
      setLoading(true);
      try {
        const response = await callApi("get", `${BASE_URL}/${id}`);
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
  
  const createImportOrderDetail = useCallback(
    async (newDetail: Omit<ImportOrderDetailType, "importOrderDetailId">) => {
      setLoading(true);
      try {
        const response = await axios.post(BASE_URL, newDetail);
        return response.data;
      } catch (error) {
        console.error("Lỗi khi tạo import order detail:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateImportOrderDetail = useCallback(
    async (id: number, updatedData: Partial<ImportOrderDetailType>) => {
      setLoading(true);
      try {
        const response = await callApi("put", `${BASE_URL}/${id}`, updatedData);
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

  const deleteImportOrderDetail = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/${id}`);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa import order detail:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateImportOrderDetailsByOrderId = useCallback(
    async (
      importOrderId: number,
      updateItems: {
        itemId: number;
        actualQuantity: number;
      }[]
    ) => {
      setLoading(true);
      try {
        const response = await callApi(
          "put",
          `${BASE_URL}/${importOrderId}`,
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
    createImportOrderDetail,
    updateImportOrderDetail,
    deleteImportOrderDetail,
    updateImportOrderDetailsByOrderId,
  };
};

export default useImportOrderDetail;

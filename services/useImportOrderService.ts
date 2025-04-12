import { useState, useCallback } from "react";
import { ImportOrderType } from "../types/importOrder.type";
import useApiService from "./useApi";

const BASE_URL =
  "https://warehouse-backend-jlcj5.ondigitalocean.app/import-order";

const useImportOrder = () => {
  const { loading, callApi, setIsLoading } = useApiService();
  const [importOrders, setImportOrders] = useState<ImportOrderType[]>([]);
  const [importOrder, setImportOrder] = useState<ImportOrderType | null>(null);

  const fetchImportOrders = useCallback(
    async (staffId: number, page = 1, limit = 10) => {
      setIsLoading(true);
      try {
        const response = await callApi("get", `${BASE_URL}/staff/${staffId}`, {
          params: {
            page,
            limit,
          },
        });
        setImportOrders(response.content);
        return response.content;
      } catch (error) {
        console.error("Lỗi khi lấy danh sách import order:", error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // Fetch chi tiết import order theo ID
  const fetchImportOrderById = useCallback(
    async (id: number) => {
      if (!id) return null;

      setIsLoading(true);
      try {
        const response = await callApi("get", `${BASE_URL}/${id}`);
        setImportOrder(response);
        return response;
      } catch (error) {
        console.error("Lỗi khi lấy chi tiết import order:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // Tạo mới import order
  const createImportOrder = useCallback(
    async (newOrder: Omit<ImportOrderType, "importOrderId">) => {
      setIsLoading(true);
      try {
        const response = await callApi("post", BASE_URL, newOrder);
        return response;
      } catch (error) {
        console.error("Lỗi khi tạo import order:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // Cập nhật import order
  const updateImportOrder = useCallback(
    async (id: number, updatedData: Partial<ImportOrderType>) => {
      setIsLoading(true);
      try {
        const response = await callApi("put", `${BASE_URL}/${id}`, updatedData);
        return response;
      } catch (error) {
        console.error("Lỗi khi cập nhật import order:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  // Xóa import order
  const deleteImportOrder = useCallback(
    async (id: number) => {
      setIsLoading(true);
      try {
        await callApi("delete", `${BASE_URL}/${id}`);
        return true;
      } catch (error) {
        console.error("Lỗi khi xóa import order:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  return {
    loading,
    importOrders,
    importOrder,
    fetchImportOrders,
    fetchImportOrderById,
    createImportOrder,
    updateImportOrder,
    deleteImportOrder,
  };
};

export default useImportOrder;

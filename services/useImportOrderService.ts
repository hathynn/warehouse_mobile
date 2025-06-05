import { useState, useCallback } from "react";
import { ImportOrderType } from "../types/importOrder.type";
import useApiService from "./useApi";


const useImportOrder = () => {
  const { loading, callApi, setIsLoading } = useApiService();
  const [importOrders, setImportOrders] = useState<ImportOrderType[]>([]);
  const [importOrder, setImportOrder] = useState<ImportOrderType | null>(null);

  const fetchImportOrders = useCallback(
    async (staffId: number, page = 1, limit = 10) => {
      setIsLoading(true);
      try {
        const response = await callApi("get", `/import-order/staff/${staffId}`, {
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
    async (id: string) => {
      if (!id) return null;

      setIsLoading(true);
      try {
        const response = await callApi("get", `/import-order/${id}`);
        setImportOrder(response.content);
        return response.content;
      } catch (error) {
        console.error("Lỗi khi lấy chi tiết import order:", error);
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
        const response = await callApi("put", `/import-order/${id}`, updatedData);
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

 

  return {
    loading,
    importOrders,
    importOrder,
    fetchImportOrders,
    fetchImportOrderById,
 
    updateImportOrder,
   
  };
};

export default useImportOrder;

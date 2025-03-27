import { useState, useCallback } from "react";
import axios from "axios";
import { ImportOrderType } from "../types/importOrder.type";

const BASE_URL = "https://warehouse-backend-q6ibz.ondigitalocean.app/import-order";

const useImportOrder = () => {
  const [loading, setLoading] = useState(false);
  const [importOrders, setImportOrders] = useState<ImportOrderType[]>([]);
  const [importOrder, setImportOrder] = useState<ImportOrderType | null>(null);

  // Lấy danh sách import order theo importRequestId
  const fetchImportOrders = useCallback(async (importRequestId: number, page = 1, limit = 10) => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/page/${page}`, {
        params: {
          importRequestId,
          page,
          limit,
        },
      });
      setImportOrders(response.data.content);
      return response.data.content;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách import order:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch chi tiết import order theo ID
  const fetchImportOrderById = useCallback(async (id: number) => {
    if (!id) return null;

    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/${id}`);
      setImportOrder(response.data);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết import order:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Tạo mới import order
  const createImportOrder = useCallback(async (newOrder: Omit<ImportOrderType, "importOrderId">) => {
    setLoading(true);
    try {
      const response = await axios.post(BASE_URL, newOrder);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi tạo import order:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cập nhật import order
  const updateImportOrder = useCallback(async (id: number, updatedData: Partial<ImportOrderType>) => {
    setLoading(true);
    try {
      const response = await axios.put(`${BASE_URL}/${id}`, updatedData);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi cập nhật import order:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Xóa import order
  const deleteImportOrder = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/${id}`);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa import order:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

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

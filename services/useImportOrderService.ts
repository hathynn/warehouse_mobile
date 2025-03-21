import { useState, useCallback } from "react";
import axios from "axios";
import { ImportOrderType } from "../types/importOrder.type";

const BASE_URL = "https://67dbbf111fd9e43fe475b291.mockapi.io/import-order";

const useImportOrder = () => {
  const [loading, setLoading] = useState(false);
  const [importOrders, setImportOrders] = useState<ImportOrderType[]>([]);
  const [importOrder, setImportOrder] = useState<ImportOrderType | null>(null);


  const fetchImportOrders = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(BASE_URL);
      setImportOrders(response.data);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách import order:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch chi tiết import order theo ID
  const fetchImportOrderById = useCallback(async (id: string) => {
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
  const createImportOrder = useCallback(async (newOrder: Omit<ImportOrderType, "id">) => {
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
  const updateImportOrder = useCallback(async (id: string, updatedData: Partial<ImportOrderType>) => {
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
  const deleteImportOrder = useCallback(async (id: string) => {
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
    deleteImportOrder
  };
};

export default useImportOrder;

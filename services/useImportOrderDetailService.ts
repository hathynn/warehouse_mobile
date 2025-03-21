import { useState, useCallback } from "react";
import axios from "axios";
import { ImportOrderDetailType } from "../types/importOrderDetail.type";

const BASE_URL = "https://67dca0a5e00db03c406886db.mockapi.io/import-order-detail"; // thay URL theo mockapi của bạn

const useImportOrderDetail = () => {
  const [loading, setLoading] = useState(false);
  const [importOrderDetails, setImportOrderDetails] = useState<ImportOrderDetailType[]>([]);
  const [importOrderDetail, setImportOrderDetail] = useState<ImportOrderDetailType | null>(null);

  // Fetch danh sách import order details
  const fetchImportOrderDetails = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(BASE_URL);
      setImportOrderDetails(response.data);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách import order details:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch chi tiết import order detail theo ID
  const fetchImportOrderDetailById = useCallback(async (id: string) => {
    if (!id) return null;

    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/${id}`);
      setImportOrderDetail(response.data);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết import order detail:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Tạo mới import order detail
  const createImportOrderDetail = useCallback(async (newDetail: Omit<ImportOrderDetailType, "id">) => {
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
  }, []);

  // Cập nhật import order detail
  const updateImportOrderDetail = useCallback(async (id: string, updatedData: Partial<ImportOrderDetailType>) => {
    setLoading(true);
    try {
      const response = await axios.put(`${BASE_URL}/${id}`, updatedData);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi cập nhật import order detail:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Xóa import order detail
  const deleteImportOrderDetail = useCallback(async (id: string) => {
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

  return {
    loading,
    importOrderDetails,
    importOrderDetail,
    fetchImportOrderDetails,
    fetchImportOrderDetailById,
    createImportOrderDetail,
    updateImportOrderDetail,
    deleteImportOrderDetail
  };
};

export default useImportOrderDetail;

import { useState, useCallback } from "react";
import axios from "axios";
import { ImportOrderDetailType } from "../types/importOrderDetail.type";

const BASE_URL = "https://warehouse-backend-q6ibz.ondigitalocean.app/import-order-detail"; 

const useImportOrderDetail = () => {
  const [loading, setLoading] = useState(false);
  const [importOrderDetails, setImportOrderDetails] = useState<ImportOrderDetailType[]>([]);
  const [importOrderDetail, setImportOrderDetail] = useState<ImportOrderDetailType | null>(null);

  // Fetch danh sách import order details theo importOrderId
  const fetchImportOrderDetails = useCallback(async (importOrderId: number) => {
    if (!importOrderId) return [];
  
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/${importOrderId}`);
  
      // console.log("📥 API Response:", response.data); // Debug full response
  
      const data = response.data.content;
      
      // Đảm bảo trả về một mảng để tránh lỗi
      if (Array.isArray(data)) {
        setImportOrderDetails(data);
        return data;
      } else if (data && typeof data === "object") {
        // Nếu API trả về object đơn lẻ, chuyển thành mảng
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
  }, []);
  

  // Fetch chi tiết import order detail theo ID
  const fetchImportOrderDetailById = useCallback(async (id: number) => {
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
  const createImportOrderDetail = useCallback(async (newDetail: Omit<ImportOrderDetailType, "importOrderDetailId">) => {
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
  const updateImportOrderDetail = useCallback(async (id: number, updatedData: Partial<ImportOrderDetailType>) => {
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

  return {
    loading,
    importOrderDetails,
    importOrderDetail,
    fetchImportOrderDetails,
    fetchImportOrderDetailById,
    createImportOrderDetail,
    updateImportOrderDetail,
    deleteImportOrderDetail,
  };
};

export default useImportOrderDetail;

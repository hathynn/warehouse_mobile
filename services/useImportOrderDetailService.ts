import { useState, useCallback } from "react";
import axios from "axios";
import { ImportOrderDetailType } from "../types/importOrderDetail.type";
import useApiService from "./useApi";
import { Beaker } from "@tamagui/lucide-icons";

const BASE_URL =
  "https://warehouse-backend-jlcj5.ondigitalocean.app/import-order-detail";

const useImportOrderDetail = () => {
  const { callApi } = useApiService();

  const [loading, setLoading] = useState(false);
  const [importOrderDetails, setImportOrderDetails] = useState<
    ImportOrderDetailType[]
  >([]);
  const [importOrderDetail, setImportOrderDetail] =
    useState<ImportOrderDetailType | null>(null);

  // Fetch danh sách import order details theo importOrderId
  const fetchImportOrderDetails = useCallback(
    async (importOrderId: number, page = 1, size = 10) => {
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
    []
  );

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

  // Cập nhật import order detail
  const updateImportOrderDetail = useCallback(
    async (id: number, updatedData: Partial<ImportOrderDetailType>) => {
      setLoading(true);
      try {
        const response = await callApi("put",`/${id}`, updatedData);
        return response;
      } catch (error) {
        console.error("Lỗi khi cập nhật import order detail:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

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
        const response = await callApi("put", `/import-order-detail/${importOrderId}`,
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
    []
  );

  return {
    loading,
    importOrderDetails,
    importOrderDetail,
    fetchImportOrderDetails,
    fetchImportOrderDetailById,
    createImportOrderDetail,
    updateImportOrderDetail,
    deleteImportOrderDetail,
    updateImportOrderDetailsByOrderId,
  };
};

export default useImportOrderDetail;

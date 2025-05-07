import { useState, useCallback } from "react";
import { ExportRequestDetailType } from "../types/exportRequestDetail.type";
import useApiService from "./useApi";

const BASE_URL =
  "https://warehouse-backend-jlcj5.ondigitalocean.app/export-request-detail";

const useExportRequestDetail = () => {
  const { loading, callApi, setIsLoading } = useApiService();
  const [exportRequestDetails, setExportRequestDetails] = useState<
    ExportRequestDetailType[]
  >([]);


  const fetchExportRequestDetails = async (
    exportRequestId: number,
    page = 1,
    limit = 10
  ): Promise<ExportRequestDetailType[]> => {
    try {
      const response = await callApi(
        "get",
        `/export-request-detail/${exportRequestId}`,
        {
          params: { page, limit },
        }
      );
      return response.content; // 👈 trả về mảng dữ liệu
    } catch (error) {
      console.error("❌ Lỗi khi lấy chi tiết đơn xuất:", error);
      return [];
    }
  };

  const updateActualQuantity = async (
    exportRequestDetailId: number,
    actualQuantity: number
  ): Promise<boolean> => {
    try {
      const payload = {
        exportRequestDetailId,
        actualQuantity,
      };
  
      await callApi("put", `${BASE_URL}/actual-quantity`, payload);
      return true;
    } catch (error) {
      console.error("❌ Lỗi khi cập nhật actualQuantity:", error);
      return false;
    }
  };
  
  const confirmCountedExportRequest = async (
    exportRequestId: number
  ): Promise<boolean> => {
    try {
      await callApi("post", `/export-request/confirm-counted/${exportRequestId}`);
      return true;
    } catch (error) {
      console.error("❌ Lỗi khi xác nhận kiểm đếm:", error);
      return false;
    }
  };
  

  return {
    loading,
    exportRequestDetails,
    fetchExportRequestDetails,
    updateActualQuantity,
    confirmCountedExportRequest,
  };
};

export default useExportRequestDetail;

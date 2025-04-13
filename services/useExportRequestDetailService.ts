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

  // Lấy danh sách Export Request Detail theo exportRequestId, có phân trang
  // const fetchExportRequestDetails = useCallback(
  //   async (exportRequestId: number, page = 1, limit = 10) => {
  //     if (!exportRequestId) return;
  //     setIsLoading(true);
  //     try {
  //       const response = await callApi(
  //         "get",
  //         `${BASE_URL}/${exportRequestId}`,
  //         {
  //           params: { page, limit },
  //         }
  //       );
  //       // Tuỳ backend trả về: response.content hoặc response.data,...
  //       // Ở đây giả định response.content là mảng các detail
  //       setExportRequestDetails(response.content ?? []);
  //     } catch (error) {
  //       console.error("Lỗi khi lấy danh sách export request detail:", error);
  //     } finally {
  //       setIsLoading(false);
  //     }
  //   },
  //   [callApi, setIsLoading]
  // );

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

  return {
    loading,
    exportRequestDetails,
    fetchExportRequestDetails,
  };
};

export default useExportRequestDetail;

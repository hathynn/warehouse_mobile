import { useState, useCallback } from "react";
import { ImportRequestType } from "../types/importRequest.type";
import useApiService from "./useApi";


const useImportRequest = () => {
  const { loading, callApi, setIsLoading } = useApiService();
  const [importRequests, setImportRequests] = useState<ImportRequestType[]>([]);
  const [importRequest, setImportRequest] = useState<ImportRequestType | null>(null);

  // Fetch danh sách import requests
  const fetchImportRequests = useCallback(
    async (page = 1, limit = 10) => {
      setIsLoading(true);
      try {
        const response = await callApi("get", `/import-request/page?page=${page}&limit=${limit}`);
        return response.content;
      } catch (error) {
        console.log("Lỗi khi lấy danh sách yêu cầu nhập hàng:", error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );
  
  

  // Fetch chi tiết import request theo ID
  const fetchImportRequestById = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
      const response = await callApi("get", `/import-request/${id}`);
      setImportRequest(response);
      return response;
    } catch (error) {
      console.log("Lỗi khi lấy chi tiết yêu cầu nhập hàng:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [callApi, setIsLoading]);

  

  return {
    loading,
    importRequests,
    importRequest,
    fetchImportRequests,
    fetchImportRequestById,
  };
};

export default useImportRequest;

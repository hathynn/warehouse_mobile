import { useState, useCallback } from "react";
import { ImportRequestType } from "../types/importRequest.type";
import useApiService from "./useApi";

const BASE_URL = "/import-request"; // vì baseURL đã nằm trong axios instance

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
        console.error("Lỗi khi lấy danh sách yêu cầu nhập hàng:", error);
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
      const response = await callApi("get", `${BASE_URL}/${id}`);
      setImportRequest(response);
      return response;
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết yêu cầu nhập hàng:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [callApi, setIsLoading]);

  // Tạo mới import request
  const createImportRequest = useCallback(async (newRequest: Omit<ImportRequestType, "importRequestId">) => {
    setIsLoading(true);
    try {
      const response = await callApi("post", BASE_URL, newRequest);
      return response;
    } catch (error) {
      console.error("Lỗi khi tạo yêu cầu nhập hàng:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [callApi, setIsLoading]);

  // Cập nhật import request
  const updateImportRequest = useCallback(async (id: number, updatedData: Partial<ImportRequestType>) => {
    setIsLoading(true);
    try {
      const response = await callApi("put", `${BASE_URL}/${id}`, updatedData);
      return response;
    } catch (error) {
      console.error("Lỗi khi cập nhật yêu cầu nhập hàng:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [callApi, setIsLoading]);

  // Xóa import request
  const deleteImportRequest = useCallback(async (id: number) => {
    setIsLoading(true);
    try {
      await callApi("delete", `${BASE_URL}/${id}`);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa yêu cầu nhập hàng:", error);
      return false;
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
    createImportRequest,
    updateImportRequest,
    deleteImportRequest,
  };
};

export default useImportRequest;

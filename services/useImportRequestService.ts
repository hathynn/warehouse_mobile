import { useState, useCallback } from "react";
import axios from "axios";
import { ImportRequestType } from "../types/importRequest.type";

const BASE_URL = "http://192.168.1.4:8080/import-request";

const useImportRequest = () => {
  const [loading, setLoading] = useState(false);
  const [importRequests, setImportRequests] = useState<ImportRequestType[]>([]);
  const [importRequest, setImportRequest] = useState<ImportRequestType | null>(null);

  // Fetch danh sách import requests
  const fetchImportRequests = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(BASE_URL);
      setImportRequests(response.data.content);
      return response.data.content;
    } catch (error) {
      console.error("Lỗi khi lấy danh sách yêu cầu nhập hàng:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch chi tiết import request theo ID
  const fetchImportRequestById = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/${id}`);
      setImportRequest(response.data);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết yêu cầu nhập hàng:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Tạo mới import request
  const createImportRequest = useCallback(async (newRequest: Omit<ImportRequestType, "importRequestId">) => {
    setLoading(true);
    try {
      const response = await axios.post(BASE_URL, newRequest);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi tạo yêu cầu nhập hàng:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cập nhật import request
  const updateImportRequest = useCallback(async (id: number, updatedData: Partial<ImportRequestType>) => {
    setLoading(true);
    try {
      const response = await axios.put(`${BASE_URL}/${id}`, updatedData);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi cập nhật yêu cầu nhập hàng:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Xóa import request
  const deleteImportRequest = useCallback(async (id: number) => {
    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/${id}`);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa yêu cầu nhập hàng:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

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

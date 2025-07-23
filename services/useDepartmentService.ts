// hooks/useDepartment.ts
import { useState, useCallback } from "react";
import useApiService from "./useApi";
import { DepartmentDetail, DepartmentType } from "@/types/department.type";

const useDepartment = () => {
  const { callApi, loading } = useApiService();
  const [departments, setDepartments] = useState<DepartmentType[]>([]);
  const [department, setDepartment] = useState<DepartmentDetail | null>(null);

  // Lấy danh sách phòng ban có phân trang
  const fetchDepartments = useCallback(
    async (page = 1, limit = 100) => {
      try {
        const response = await callApi(
          "get",
          "/department",
          undefined, 
          { params: { page, limit } }, // options
          `Lấy danh sách phòng ban (page: ${page}, limit: ${limit})`
        );
        const content = response?.content || [];
        setDepartments(content);
        return content;
      } catch (error) {
        console.error("Lỗi khi lấy danh sách phòng ban:", error);
        return [];
      }
    },
    [callApi]
  );

  // Lấy chi tiết phòng ban theo ID
  const fetchDepartmentById = useCallback(
    async (id: number | string) => {
      if (!id) return null;
      try {
        const response = await callApi(
          "get",
          `/department/${id}`,
          undefined,
          undefined,
          `Lấy chi tiết phòng ban ID: ${id}`
        );
        setDepartment(response.content);
        return response.content;
      } catch (error) {
        console.error(`Lỗi khi lấy phòng ban ID ${id}:`, error);
        return null;
      }
    },
    [callApi]
  );

  return {
    loading,
    departments,
    department,
    fetchDepartments,
    fetchDepartmentById,
  };
};

export default useDepartment;

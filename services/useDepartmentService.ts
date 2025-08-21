// hooks/useDepartment.ts
import { useState, useCallback } from "react";
import useApiService from "./useApi";
import { DepartmentDetail, DepartmentType } from "@/types/department.type";
import { AccountContent } from "@/types/account.type";

const useDepartment = () => {
  const { callApi, loading } = useApiService();
  const [departments, setDepartments] = useState<DepartmentType[]>([]);
  const [department, setDepartment] = useState<DepartmentDetail | null>(null);
  const [accountsByDepartment, setAccountsByDepartment] = useState<AccountContent[]>([]);

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
        console.log("Lỗi khi lấy danh sách phòng ban:", error);
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
        console.log(`Lỗi khi lấy phòng ban ID ${id}:`, error);
        return null;
      }
    },
    [callApi]
  );


  const fetchAccountsByDepartment = useCallback(
    async (departmentId: number | string) => {
      if (!departmentId) return [];
      try {
        const response = await callApi(
          "get",
          `/account/by-department/${departmentId}`,
          undefined,
          undefined,
          `Lấy danh sách account theo phòng ban ID: ${departmentId}`
        );
        const content = response?.content || [];
        setAccountsByDepartment(content);
        return content;
      } catch (error) {
        console.log(`Lỗi khi lấy account theo department ID ${departmentId}:`, error);
        return [];
      }
    },
    [callApi]
  );

  return {
    loading,
    departments,
    department,
    accountsByDepartment,
    fetchDepartments,
    fetchDepartmentById,
    fetchAccountsByDepartment, 
  };
};

export default useDepartment;

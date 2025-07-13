import { useState, useCallback } from "react";
import useApiService from "./useApi";
import { ItemType } from "@/types/item.type"; 
const useItemService = () => {
  const { loading, callApi, setIsLoading } = useApiService();
  const [item, setItem] = useState<ItemType | null>(null);

  const getItemDetailById = useCallback(
    async (itemId: string) => {
      if (!itemId) return null;

      setIsLoading(true);
      try {
        const response = await callApi("get", `/item/${itemId}`);
        setItem(response.content);
        return response.content;
      } catch (error) {
        console.error("Lỗi khi lấy chi tiết item:", error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [callApi, setIsLoading]
  );

  return {
    loading,
    item,
    getItemDetailById,
  };
};

export default useItemService;

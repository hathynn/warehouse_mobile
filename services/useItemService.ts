import { useState, useCallback } from "react";
import axios from "axios";
import { ItemType } from "@/types/item.type";

const BASE_URL = "http://192.168.1.4:8080/items";


const useItemService = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ItemType[]>([]);
  const [item, setItem] = useState<ItemType | null>(null);

  // Fetch danh sách items
// Fetch danh sách items
const fetchItems = async (page = 1, limit = 10) => {
  setLoading(true);
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        page,
        limit,
      },
    });
    const data = response.data?.content || [];
    setItems(data);
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    } else {
      console.error("Lỗi không xác định:", error);
    }
    
    return [];
  } finally {
    setLoading(false);
  }
};


  // Fetch item theo id
  const fetchItemById = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}/${id}`);
      setItem(response.data);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi lấy item:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Tạo mới item
  const createItem = useCallback(async (newItem: Omit<ItemType, "id">) => {
    setLoading(true);
    try {
      const response = await axios.post(BASE_URL, newItem);
      return response.data;
    } catch (error) {
      console.error("Lỗi khi tạo item:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Cập nhật item
  const updateItem = useCallback(
    async (id: string, updatedData: Partial<ItemType>) => {
      setLoading(true);
      try {
        const response = await axios.put(`${BASE_URL}/${id}`, updatedData);
        return response.data;
      } catch (error) {
        console.error("Lỗi khi cập nhật item:", error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Xóa item
  const deleteItem = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await axios.delete(`${BASE_URL}/${id}`);
      return true;
    } catch (error) {
      console.error("Lỗi khi xóa item:", error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    items,
    item,
    fetchItems,
    fetchItemById,
    createItem,
    updateItem,
    deleteItem,
  };
};

export default useItemService;

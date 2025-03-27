import { useState, useCallback } from "react";
import axios from "axios";
import { ItemType } from "@/types/item.type";

const BASE_URL = "https://warehouse-backend-q6ibz.ondigitalocean.app/items";

const useItemService = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ItemType[]>([]);
  const [item, setItem] = useState<ItemType | null>(null);

  // Fetch danh sách items
  const fetchItems = async (page = 1, limit = 10) => {
    try {
      const response = await axios.get(BASE_URL);
      return response.data.content || []; // Nếu response.data là undefined, trả về []
    } catch (error) {
      console.error("Lỗi khi lấy danh sách sản phẩm:", error);
      return []; // Trả về mảng rỗng nếu có lỗi
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

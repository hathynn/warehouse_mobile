import { useState, useCallback } from "react";
import useApiService from "./useApi";
import { InventoryItem } from "@/types/inventoryItem.type";
import { InventoryItemDetail } from "@/types/inventoryItemDetail.type";

const useInventoryService = () => {
  const { callApi, setIsLoading, loading } = useApiService();
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  const fetchInventoryItemsByImportOrderDetailId = useCallback(
    async (importOrderDetailId: number, page = 1, limit = 999) => {
      if (!importOrderDetailId) return [];

      try {
        const response = await callApi(
          "get",
          `/inventory-item/import-order-detail/${importOrderDetailId}`,
          undefined, // data = undefined cho GET request
          { params: { page, limit } }, // params qua options
          // `✅ Lấy inventory items cho import order detail ${importOrderDetailId}`
        );


        setInventoryItems(response.content || []);
        // console.log("Invnetory:", response);


        setInventoryItems(response.content || []);
        return response.content || [];
      } catch (error) {
        console.log("❌ Lỗi khi lấy inventory items:", error);
        return [];
      }
    },
    [callApi]
  );

  const fetchInventoryItemsByExportRequestDetailId = useCallback(
    async (exportRequestDetailId: number, page = 1, limit = 999) => {
      if (!exportRequestDetailId) return [];

      try {
        const response = await callApi(
          "get",
          `/inventory-item/export-request-detail/${exportRequestDetailId}`,
          undefined, // data = undefined cho GET request
          { params: { page, limit } }, // params qua options
          `✅ Lấy inventory items cho export request detail ${exportRequestDetailId}`
        );

        setInventoryItems(response.content || []);
        return response.content || [];
      } catch (error) {
        console.log("❌ Lỗi khi lấy export inventory items:", error);
        return [];
      }
    },
    [callApi]
  );

  const autoChangeInventoryItem = useCallback(
    async (inventoryItemId: string, note?: string) => {
      if (!inventoryItemId) return;

      try {
        const requestBody = {
          inventoryItemId,
          ...(note && { note })
        };

        console.log("🔍 Auto-change request details:", {
          inventoryItemId,
          note,
          requestBody: JSON.stringify(requestBody, null, 2),
          url: `/inventory-item/auto-change`,
          method: "PUT"
        });

        const response = await callApi(
          "put",
          `/inventory-item/auto-change`,
          requestBody,
          undefined, // no additional options
          `✅ Auto-change inventory item ${inventoryItemId}${note ? ` với lý do: ${note}` : ''}`
        );

        console.log("✅ Auto-change response:", JSON.stringify(response, null, 2));
        return response;
      } catch (error: any) {
        console.log("❌ Lỗi khi gọi auto-change:", error);
        console.log("❌ Auto-change error details:", {
          status: error?.response?.status,
          statusText: error?.response?.statusText,
          data: error?.response?.data,
          message: error?.message,
          url: `/inventory-item/auto-change`,
          requestBody: {
            inventoryItemId,
            ...(note && { note })
          }
        });
        throw error;
      }
    },
    [callApi]
  );

  //   const changeInventoryItemForExportDetail = useCallback(
  //   async (oldInventoryItemId: string, newInventoryItemId: string) => {
  //     if (!oldInventoryItemId || !newInventoryItemId) return null;

  //     try {
  //       const response = await callApi(
  //         "post",
  //         "/inventory-item/change-inventory-item-export-detail",
  //         {
  //           oldInventoryItemId,
  //           newInventoryItemId,
  //         },
  //         undefined,
  //         `✅ Đổi inventory item từ ${oldInventoryItemId} sang ${newInventoryItemId}`
  //       );

  //       return response;
  //     } catch (error) {
  //       console.log("❌ Lỗi khi đổi inventory item export detail:", error);
  //       return null;
  //     }
  //   },
  //   [callApi]
  // );

  // Change manual 1 - 1 for SELLING
  const changeInventoryItemForExportDetail = useCallback(
    async (
      oldInventoryItemId: string,
      newInventoryItemId: string,
      note?: string
    ) => {
      if (!oldInventoryItemId || !newInventoryItemId) return null;

      try {
        const requestBody = {
          oldInventoryItemIds: [oldInventoryItemId],
          newInventoryItemIds: [newInventoryItemId],
          note: note ?? "",
        };
        
        console.log("🔍 Manual change request body:", JSON.stringify(requestBody, null, 2));
        
        const response = await callApi(
          "post",
          "/inventory-item/change-inventory-item-export-detail",
          requestBody,
          undefined,
          `✅ Manual change với lý do: ${oldInventoryItemId} -> ${newInventoryItemId}`
        );

        return response;
      } catch (error: any) {
        console.log("❌ Lỗi khi đổi inventory item selling export detail:", error);
        console.log("❌ Error response:", error?.response?.data);
        console.log("❌ Error status:", error?.response?.status);
        console.log("❌ Error message:", error?.message);
        throw error; // để component cha xử lý
      }
    },
    [callApi]
  );


  // Change manual 1 - n or n - 1 for INTERNAL
  const changeInventoryItemsForExportDetail = useCallback(
    async (
      oldInventoryItemIds: string[],
      newInventoryItemIds: string[],
      note?: string
    ) => {
      if (!oldInventoryItemIds?.length || !newInventoryItemIds?.length) return null;



      try {
        const response = await callApi(
          "post",
          "/inventory-item/change-inventory-item-export-detail",
          {
            oldInventoryItemIds,
            newInventoryItemIds,
            note: note ?? ""
          },
          undefined,
          `✅ Manual change (batch): ${oldInventoryItemIds.length} item(s)`
        );

        return response;
      } catch (error) {
        console.log("Lỗi khi đổi inventory item internal export:", error);
        throw error;
      }
    },
    [callApi]
  );

  const fetchInventoryItemById = useCallback(
    async (inventoryItemId: string) => {
      if (!inventoryItemId) return null;

      try {
        const response = await callApi(
          "get",
          `/inventory-item/${inventoryItemId}`,
          undefined,
          undefined
        );

        return response.content;
      } catch (error: any) {
        console.log("Lỗi khi lấy inventory item theo ID:", error);
        
        // Log more details about the error for debugging
        if (error?.response?.status) {
          console.log(`❌ API Error ${error.response.status}: ${error.response.data?.message || 'Unknown error'}`);
        }
        
        return null;
      }
    },
    [callApi]
  );

  const updateInventoryItem = useCallback(
    async (inventoryItemData: InventoryItem) => {
      if (!inventoryItemData || !inventoryItemData.id) return null;

      try {
        const response = await callApi(
          "put",
          `/inventory-item`,
          inventoryItemData,
          undefined,
          `Cập nhật inventory item ${inventoryItemData.id}`
        );

        return response;
      } catch (error) {
        console.log("❌ Lỗi khi cập nhật inventory item:", error);
        throw error;
      }
    },
    [callApi]
  );

  const fetchInventoryItemByItemId = useCallback(
    async (
      itemId: string,
      page?: number,
      limit: number = 999
    ): Promise<InventoryItemDetail[]> => {
      if (!itemId) return [];

      try {
        const params = new URLSearchParams();
        if (page !== undefined) params.append('page', page.toString());
        params.append('limit', limit.toString());

        const queryString = params.toString();
        const url = `/inventory-item/item/${itemId}?${queryString}`;

        const response = await callApi(
          "get",
          url,
          undefined,
          undefined,
          `✅ Lấy inventory items theo itemId: ${itemId}`
        );

        // API should return an array of inventory items for the given itemId
        return response?.content || response || [];
      } catch (error) {
        console.log("❌ Lỗi khi lấy inventory items theo itemId:", error);
        return [];
      }
    },
    [callApi]
  );

  return {
    loading,
    inventoryItems,
    fetchInventoryItemsByImportOrderDetailId,
    fetchInventoryItemsByExportRequestDetailId,
    autoChangeInventoryItem,
    changeInventoryItemForExportDetail,
    changeInventoryItemsForExportDetail,
    fetchInventoryItemById,
    updateInventoryItem,
    fetchInventoryItemByItemId
  };
};

export default useInventoryService;

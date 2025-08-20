import { ExportRequestDetailType } from "@/types/exportRequestDetail.type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ScanMapping {
  inventoryItemId: string;
  exportRequestDetailId: string;
}

interface ExportRequestDetailState {
  details: ExportRequestDetailType[];
  scanMappings: ScanMapping[];
  pendingModalNavigation: {
    exportRequestId: string;
    itemCode: string;
  } | null;
}

const initialState: ExportRequestDetailState = {
  details: [],
  scanMappings: [],
  pendingModalNavigation: null,
};

const exportRequestDetailSlice = createSlice({
  name: "exportRequestDetail",
  initialState,
  reducers: {
    setExportRequestDetail: (
      state,
      action: PayloadAction<ExportRequestDetailType[]>
    ) => {
      state.details = action.payload;
    },

    updateActualQuantity: (
      state,
      action: PayloadAction<{ detailId: string; inventoryItemId: string }>
    ) => {
      const { detailId, inventoryItemId } = action.payload;
      const item = state.details.find((item) => item.id === detailId);
      if (item) {
        item.actualQuantity += 1;
        item.inventoryItemIds.push(inventoryItemId);
      }
    },

    setScanMappings: (state, action: PayloadAction<ScanMapping[]>) => {
      state.scanMappings = action.payload;
    },

    // Thêm action mới để cập nhật inventoryItemId
    updateInventoryItemId: (
      state,
      action: PayloadAction<{
        exportRequestDetailId: string;
        oldInventoryItemId: string;
        newInventoryItemId: string;
      }>
    ) => {
      const { exportRequestDetailId, oldInventoryItemId, newInventoryItemId } = action.payload;
      
      // Cập nhật trong details
      const detail = state.details.find((item) => item.id === exportRequestDetailId);
      if (detail && detail.inventoryItemIds) {
        const index = detail.inventoryItemIds.indexOf(oldInventoryItemId);
        if (index !== -1) {
          detail.inventoryItemIds[index] = newInventoryItemId;
        }
      }

      // Cập nhật trong scanMappings
      const mappingIndex = state.scanMappings.findIndex(
        (mapping) => 
          mapping.exportRequestDetailId.toString() === exportRequestDetailId.toString() && 
          mapping.inventoryItemId === oldInventoryItemId.trim().toLowerCase()
      );
      
      console.log(`🔍 Redux - mappingIndex found: ${mappingIndex}`);
      console.log(`🔍 Redux - Looking for: exportRequestDetailId=${exportRequestDetailId}, oldInventoryItemId=${oldInventoryItemId.trim().toLowerCase()}`);
      
      if (mappingIndex !== -1) {
        console.log(`🔄 Redux - Updating mapping at index ${mappingIndex}: ${oldInventoryItemId} → ${newInventoryItemId}`);
        state.scanMappings[mappingIndex].inventoryItemId = newInventoryItemId.trim().toLowerCase();
        console.log(`✅ Redux - Updated successfully to: ${state.scanMappings[mappingIndex].inventoryItemId}`);
      } else {
        console.log(`❌ Redux - Mapping not found for update`);
      }
    },

    setPendingModalNavigation: (
      state,
      action: PayloadAction<{
        exportRequestId: string;
        itemCode: string;
      } | null>
    ) => {
      state.pendingModalNavigation = action.payload;
    },

    clearPendingModalNavigation: (state) => {
      state.pendingModalNavigation = null;
    },
  },
});

export const { 
  setExportRequestDetail, 
  updateActualQuantity, 
  setScanMappings,
  updateInventoryItemId,
  setPendingModalNavigation,
  clearPendingModalNavigation
} = exportRequestDetailSlice.actions;

export default exportRequestDetailSlice.reducer;
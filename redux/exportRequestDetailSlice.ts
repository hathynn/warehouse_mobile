import { ExportRequestDetailType } from "@/types/exportRequestDetail.type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ScanMapping {
  inventoryItemId: string;
  exportRequestDetailId: string;
}

interface ExportRequestDetailState {
  details: ExportRequestDetailType[];
  scanMappings: ScanMapping[];
}

const initialState: ExportRequestDetailState = {
  details: [],
  scanMappings: [],
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
  },
});

export const { setExportRequestDetail, updateActualQuantity, setScanMappings } =
  exportRequestDetailSlice.actions;
export default exportRequestDetailSlice.reducer;

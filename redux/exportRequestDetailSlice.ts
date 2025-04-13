// exportRequestDetailSlice.ts
import { ExportRequestDetailType } from "@/types/exportRequestDetail.type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ExportRequestDetailState {
  details: ExportRequestDetailType[];
}

const initialState: ExportRequestDetailState = {
  details: [],
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
  },
});

export const { setExportRequestDetail, updateActualQuantity } =
  exportRequestDetailSlice.actions;
export default exportRequestDetailSlice.reducer;

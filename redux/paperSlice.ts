import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface PaperState {
    importRequestId: number | null;
    importOrderId: number | null;
    exportRequestId: number | null;
    signProviderUrl: string | null; // Lưu Base64 string
    signWarehouseUrl: string | null; // Lưu Base64 string
    description: string;
  }
  
const initialState: PaperState = {
  importRequestId: null,
  importOrderId: null,
  exportRequestId: null,
  signProviderUrl: null,
  signWarehouseUrl: null,
  description: "",
};

const paperSlice = createSlice({
  name: "paper",
  initialState,
  reducers: {
    setPaperData: (state, action: PayloadAction<Partial<PaperState>>) => {
      return { ...state, ...action.payload };
    },
    resetPaperData: () => initialState,
  },
});

export const { setPaperData, resetPaperData } = paperSlice.actions;
export default paperSlice.reducer;

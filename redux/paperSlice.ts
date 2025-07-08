import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface PaperState {
    importRequestId?: number | null;
    importOrderId: string | null;
    exportRequestId: string | null;
    signProviderUrl: string | null; // Lưu Base64 string
    signReceiverUrl: string | null; // Lưu Base64 string
    signProviderName: string | null;
    signReceiverName: string | null;
    description: string;
  }
  
const initialState: PaperState = {
  importRequestId: null,
  importOrderId: null,
  exportRequestId: null,
  signProviderUrl: null,
  signReceiverUrl: null,
  signProviderName: null,
  signReceiverName:null,
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

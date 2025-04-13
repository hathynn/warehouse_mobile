// exportRequestDetailSlice.ts
import { ExportRequestDetailType } from "@/types/exportRequestDetail.type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ExportRequestDetailState {
  // Chúng ta có thể lưu dữ liệu export request detail dưới dạng mảng
  details: ExportRequestDetailType[];
}

const initialState: ExportRequestDetailState = {
  details: [],
};

const exportRequestDetailSlice = createSlice({
  name: "exportRequestDetail",
  initialState,
  reducers: {
    // Action để lưu toàn bộ danh sách exportRequestDetail
    setExportRequestDetail: (
      state,
      action: PayloadAction<ExportRequestDetailType[]>
    ) => {
      state.details = action.payload;
    },
    // Nếu cần, bạn có thể tạo thêm các reducer để thêm, cập nhật, xoá từng đối tượng detail
  },
});

export const { setExportRequestDetail } = exportRequestDetailSlice.actions;
export default exportRequestDetailSlice.reducer;

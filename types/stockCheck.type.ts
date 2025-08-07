export interface StockCheckType {
  id: string;
  stockCheckReason: string;
  status: StockCheckStatus | null;
  type: StockCheckCategory | null;
  startDate: string;
  expectedCompletedDate: string;
  countingDate: string;
  countingTime: string;
  note: string;
  assignedWareHouseKeeperId: number;
  stockCheckRequestDetailIds: number[];
  paperId: number | null;
  createdDate: string;
  lastModifiedDate: string;
  createdBy: string;
  lastModifiedBy: string;
}

export enum StockCheckStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COUNTED = "COUNTED",
  CONFIRM_COUNTED = "CONFIRM_COUNTED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED"
}


export enum StockCheckCategory {
  SPOT_CHECK = "SPOT_CHECK",
  PERIODIC = "PERIODIC"
}

export interface ImportOrderType {
  importOrderId: number;
  importRequestId: number;
  dateReceived: string;
  timeReceived: string;
  note: string;
  status: ImportOrderStatus | null;
  importOrderDetailIds: number[];
  createdBy: string;
  updatedBy: string | null;
  createdDate: string;
  updatedDate: string | null;
  paperIds: number[] | null;
  assignedWareHouseKeeperId: number;
}

export enum ImportOrderStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  COUNTED = "COUNTED",
  CONFIRMED="CONFIRMED"
}

export interface ExportRequestDetailType {
  id: number;
  measurementValue: number | null;
  actualQuantity: number;
  quantity: number;
  status: ExportRequestDetailStatus | null;
  exportRequestId: number;
  itemId: number;
  inventoryItemIds: number[];
}

export enum ExportRequestDetailStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export interface ExportRequestDetailType {
  id: string;
  measurementValue: number | null;
  actualQuantity: number;
  actualMeasurementValue: number | 0;
  quantity: number;
  status: ExportRequestDetailStatus | null;
  exportRequestId: number;
  itemId: string;
  inventoryItemIds: string[];
}

export enum ExportRequestDetailStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

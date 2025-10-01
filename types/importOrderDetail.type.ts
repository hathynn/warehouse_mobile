// types/importOrderDetail.type.ts
export interface ImportOrderDetailType {
  importOrderDetailId: string;
  importOrderId: string;
  itemId: string;
  itemName: string;
  expectQuantity: number;
  actualQuantity: number;
  status: ImportOrderDetailStatus;
  providerCode: string;
}

export enum ImportOrderDetailStatus {
  LACK = "LACK",
  LESS = "LESS",
  MATCH = "MATCH",
}

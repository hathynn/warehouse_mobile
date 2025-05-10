// types/importOrderDetail.type.ts
export interface ImportOrderDetailType {
  importOrderDetailId: number;
  importOrderId: number;
  itemId: number;
  itemName: string;
  expectQuantity: number;
  actualQuantity: number;
  status: ImportOrderDetailStatus;
}

export enum ImportOrderDetailStatus {
  LACK = "LACK",
  LESS = "LESS",
  MATCH = "MATCH",
}


export interface StockCheckDetailType {
  id: number;
  measurementValue: number;         
  quantity: number;                  
  actualQuantity: number;           
  actualMeasurementValue: number;    
  status: StockCheckDetailStatus | null;
  stockCheckRequestId: string;       
  itemId: string;                   
  inventoryItemIds: string[];       
  checkedInventoryItemIds: string[]; 
}

export enum StockCheckDetailStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED",
  COUNT_AGAIN_REQUESTED = "COUNT_AGAIN_REQUESTED",
}

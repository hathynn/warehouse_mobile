import { InventoryItemStatus } from "./inventoryItem.type";

// types/inventoryItemDetail.type.ts
export interface InventoryItemDetail {
  id: string;
  reasonForDisposal: string | null;
  measurementValue: number;
  status: InventoryItemStatus; 
  expiredDate: string; // ISO date string
  importedDate: string; // ISO date string
  updatedDate: string; // ISO date string
  parentId: string | null;
  childrenIds: string[];
  itemId: string;
  itemName: string;
  itemCode: string | null;
  exportRequestDetailId: number | null;
  importOrderDetailId: number | null;
  storedLocationId: number | null;
  storedLocationName: string | null;
  isTrackingForExport: boolean;
}


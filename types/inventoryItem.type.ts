export interface InventoryItem {
  id: number;
  reasonForDisposal: string | null;
  measurementValue: number;
  status: string | null;
  expiredDate: string; // ISO date string
  importedDate: string; // ISO date string
  updatedDate: string; // ISO date string
  parentId: number | null;
  childrenIds: number[];
  itemId: number;
  itemName: string;
  itemCode: string | null;
  exportRequestDetailId: number | null;
  importOrderDetailId: number;
  storedLocationId: number | null;
  storedLocationName: string | null;
}

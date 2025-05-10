// types/inventoryItem.type.ts
export interface InventoryItemType {
    id: number;
    reasonForDisposal: string | null;
    measurementValue: number;
    status: "AVAILABLE" | "DAMAGED" | "EXPIRED" | string;
    expiredDate: string;
    importedDate: string;
    updatedDate: string;
    parentId: number | null;
    childrenIds: number[];
    itemId: number;
    itemName: string;
    itemCode: string | null;
    exportRequestDetailIds: number[];
    importOrderDetailId: number;
    storedLocationId: number;
    storedLocationName: string;
  }
  
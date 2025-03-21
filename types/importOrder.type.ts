export interface ImportOrderType {
    id: string;
    import_request_id: string;
    warehouse_keeper_assigned: string;
    created_by: string;
    updated_by: string;
    created_date: Date;
    updated_date: Date;
    status: ImportOrderStatus;
    time_arrived: string; 
    date_arrived: Date;
  }
  
  export enum ImportOrderStatus {
    PENDING = "Pending",
    APPROVED = "Approved",
    COMPLETED = "Completed"
  }
  
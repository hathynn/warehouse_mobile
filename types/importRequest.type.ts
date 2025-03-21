export interface ImportRequestType {
    id: string
    provider_id: number
    import_reason: string
    created_by: string
    updated_by: string
    created_date: Date
    updated_date: Date
    status: ImportRequestStatus
    type: ImportRequestTypeEnum
    export_request_id?: string | null
  }
  
  export enum ImportRequestStatus {
    PENDING = "Pending",
    APPROVED = "Approved",
    COMPLETED = "Completed"
  }
  
  export enum ImportRequestTypeEnum {
    ORDER = "ORDER",
    RETURN = "RETURN"
  }
  
export interface MetaDataDTO {
    hasNext: boolean;
    hasPrevious: boolean;
    limit: number;
    total: number;
    page: number;
}

export interface ResponseDTO<T> {
    content: T;
    details: string[];
    statusCode: number;
    metaDataDTO?: MetaDataDTO;
}

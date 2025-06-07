import useApiService from "./useApi";
import { ResponseDTO } from "@/types/api.type";

// Interface to match NotificationResponse.java
export interface NotificationResponse {
  id: number;
  receiverId: number;
  objectId: number;
  eventType: string;
  content: string;
  createdDate: string;
  isViewed: boolean;
  isClicked: boolean;
}

// Interface to match NotificationRequest.java
export interface NotificationRequest {
  receiverId: number;
  objectId: number;
  content: string;
}

const useNotificationService = () => {
  const { callApi, loading } = useApiService();

  // Get all notifications for a specific account
  const getAllNotifications = async (
    accountId: number
  ): Promise<ResponseDTO<NotificationResponse[]>> => {
    try {
      const response = await callApi(
        "get",
        `/notification?accountId=${accountId}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Delete a notification by ID
  const deleteNotification = async (
    notificationId: number
  ): Promise<ResponseDTO<NotificationResponse>> => {
    try {
      const response = await callApi("delete", `/notification/${notificationId}`);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Mark all notifications as viewed for a specific account
  const viewAllNotifications = async (
    accountId: number
  ): Promise<ResponseDTO<NotificationResponse[]>> => {
    try {
      const response = await callApi(
        "put",
        `/notification/view-all?accountId=${accountId}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Mark a notification as clicked
  const clickNotification = async (
    notificationId: number
  ): Promise<ResponseDTO<NotificationResponse>> => {
    try {
      const response = await callApi(
        "put",
        `/notification/click?id=${notificationId}`
      );
      return response;
    } catch (error) {
      throw error;
    }
  };

  return {
    loading,
    getAllNotifications,
    deleteNotification,
    viewAllNotifications,
    clickNotification,
  };
};

export default useNotificationService;

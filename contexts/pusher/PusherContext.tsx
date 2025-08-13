
import {
  createContext,
  useContext  
} from "react";


import { NotificationResponse } from "@/services/useNotificationService";

export interface NotificationEvent {
  type: string;
  data: NotificationResponse;
  timestamp: number;
}

export interface PusherContextType {
  latestNotification: NotificationEvent | null;
  isConnected: boolean;
  connectionError: string | null;
}

export const PusherContext = createContext<PusherContextType | undefined>(undefined);

export const usePusherContext = () => {
  const context = useContext(PusherContext);
  if (context === undefined) {
    throw new Error("usePusherContext must be used within a PusherProvider");
  }
  return context;
};

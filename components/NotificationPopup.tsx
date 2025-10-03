import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PusherContext } from "@/contexts/pusher/PusherContext";

const { width } = Dimensions.get("window");

interface NotificationItem {
  id: string;
  content: string;
  timestamp: number;
  type: string;
}

const NotificationPopup: React.FC = () => {
  const { latestNotification } = useContext(PusherContext);
  const [currentNotification, setCurrentNotification] = useState<NotificationItem | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const getNotificationTypeFromEvent = (eventType: string): string => {
    // Handle dynamic events with IDs
    if (eventType.startsWith("import-order-ready-to-store-")) {
      return "pending";
    }

    switch (eventType) {
      case "import-order-created":
        return "import";
      case "import-order-assigned":
        return "assigned";
      case "import-order-counted":
        return "success";
      case "import-order-confirmed":
        return "success";
      case "import-order-cancelled":
        return "cancelled";
      case "import-order-extended":
        return "extended";
      case "import-order-completed":
        return "success";
      default:
        return "default";
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "import":
        return { name: "cube-outline", color: "#1677ff" };
      case "assigned":
        return { name: "person-outline", color: "#9C27B0" };
      case "success":
        return { name: "checkmark-circle-outline", color: "#4CAF50" };
      case "cancelled":
        return { name: "close-circle-outline", color: "#F44336" };
      case "extended":
        return { name: "time-outline", color: "#FF9800" };
      case "system":
        return { name: "settings-outline", color: "#FF9800" };
      case "pending":
        return { name: "time-outline", color: "#213448" };
      case "report":
        return { name: "document-text-outline", color: "#9C27B0" };
      default:
        return { name: "notifications-outline", color: "#666" };
    }
  };

  const showNotification = (notification: NotificationItem) => {
    setCurrentNotification(notification);
    setIsVisible(true);

    // Animation to slide down and fade in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide after 4 seconds
    setTimeout(() => {
      hideNotification();
    }, 4000);
  };

  const hideNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
      setCurrentNotification(null);
    });
  };

  useEffect(() => {
    if (latestNotification) {
      const notificationType = getNotificationTypeFromEvent(latestNotification.type);
      const notification: NotificationItem = {
        id: `${latestNotification.timestamp}`,
        content: latestNotification.data?.content || "Bạn có thông báo mới",
        timestamp: latestNotification.timestamp,
        type: notificationType,
      };
      showNotification(notification);
    }
  }, [latestNotification]);

  if (!isVisible || !currentNotification) {
    return null;
  }

  const icon = getNotificationIcon(currentNotification.type);
  const iconName = icon.name as keyof typeof Ionicons.glyphMap;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 10,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.notificationCard}
        onPress={hideNotification}
        activeOpacity={0.9}
      >
        <View style={styles.content}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${icon.color}15` },
            ]}
          >
            <Ionicons name={iconName} size={20} color={icon.color} />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.notificationText} numberOfLines={2}>
              {currentNotification.content}
            </Text>
            <Text style={styles.timeText}>Vừa xong</Text>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={hideNotification}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={18} color="#666" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  notificationCard: {
    backgroundColor: "white",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#1677ff",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  timeText: {
    fontSize: 12,
    color: "#666",
  },
  closeButton: {
    padding: 4,
  },
});

export default NotificationPopup; 
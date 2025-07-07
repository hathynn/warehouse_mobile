import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import useNotificationService from "@/services/useNotificationService";
import NotificationTabIcon from "@/components/NotificationTabIcon";

export default function TabsLayout() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { viewAllNotifications } = useNotificationService();

  const handleNotificationTabPress = async () => {
    if (user?.id) {
      try {
        await viewAllNotifications(Number(user.id));
      } catch (error) {
        console.error('Failed to mark all notifications as viewed:', error);
      }
    }
  };

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          title: "Nhập kho",
          tabBarIcon: ({ color, size }) => <Ionicons name="download" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="export"
        options={{
          title: "Xuất kho",
          tabBarIcon: ({ color, size }) => <Ionicons name="cloud-upload" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notification"
        options={{
          title: "Thông báo",
          tabBarIcon: ({ color, size, focused }) => (
            <NotificationTabIcon color={color} size={size} focused={focused} />
          ),
        }}
        listeners={{
          tabPress: handleNotificationTabPress,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Tài khoản",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

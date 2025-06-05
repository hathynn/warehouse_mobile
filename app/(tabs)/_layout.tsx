import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
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
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color} size={size} />,
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

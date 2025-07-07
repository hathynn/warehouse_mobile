import React from "react";
import { View, Text } from "react-native";

interface Props {
  status: string;
  flow: "import" | "export"; 
}

const getStatusStyle = (status: string, flow: "import" | "export") => {
  switch (status) {
    // 📦 IMPORT STATUS
    case "IN_PROGRESS":
      return { backgroundColor: "#1677ff", textColor: "#fff", label: "Cần kiểm đếm" };

    case "COUNTED":
      return flow === "import"
        ? { backgroundColor: "#213448", textColor: "#fff", label: "Đã kiểm đếm" }
        : { backgroundColor: "#03A9F4", textColor: "#fff", label: "Đã đóng gói" };

    case "READY_TO_STORE":
      return { backgroundColor: "#213448", textColor: "#fff", label: "Chờ nhập kho" };

    case "STORED":
      return { backgroundColor: "#52c41a", textColor: "#fff", label: "Đã nhập kho" };

    case "COMPLETED":
      return { backgroundColor: "#52c41a", textColor: "#fff", label: "Hoàn tất" };

    // 🚚 EXPORT STATUS
    case "COUNT_CONFIRMED":
      return { backgroundColor: "#1890ff", textColor: "#fff", label: "Đã xác nhận kiểm đếm" };

    case "CONFIRMED":
      return { backgroundColor: "#722ed1", textColor: "#fff", label: "Đã xác nhận" };

    case "WAITING_EXPORT":
      return { backgroundColor: "#faad14", textColor: "#fff", label: "Chờ xuất kho" };

    case "CANCELLED":
      return { backgroundColor: "#FFEBEE", textColor: "#F44336", label: "Đã huỷ" };

    default:
      return { backgroundColor: "#d9d9d9", textColor: "#000", label: "Không rõ" };
  }
};

const StatusBadge: React.FC<Props> = ({ status, flow }) => {
  const { backgroundColor, textColor, label } = getStatusStyle(status, flow);

  return (
    <View
      style={{
        backgroundColor,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
      }}
    >
      <Text style={{ color: textColor, fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
};

export default StatusBadge;

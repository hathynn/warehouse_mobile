import React from "react";
import { View, Text } from "react-native";
import { ImportOrderStatus } from "@/types/importOrder.type";

const getStatusStyle = (status: ImportOrderStatus) => {
  switch (status) {
    case ImportOrderStatus.IN_PROGRESS:
      return { backgroundColor: "#faad14", textColor: "#fff", label: "Đang xử lý" };
    case ImportOrderStatus.COMPLETED:
      return { backgroundColor: "#52c41a", textColor: "#fff", label: "Hoàn tất" };
    case ImportOrderStatus.CANCELLED:
      return { backgroundColor: "#ff4d4f", textColor: "#fff", label: "Đã huỷ" };
    default:
      return { backgroundColor: "#d9d9d9", textColor: "#000", label: "Không rõ" };
  }
};

interface Props {
  status: ImportOrderStatus;
}

const StatusBadge: React.FC<Props> = ({ status }) => {
  const { backgroundColor, textColor, label } = getStatusStyle(status);

  return (
    <View
    style={{
        backgroundColor,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
      
      }}
    >
      <Text style={{ color: textColor, fontWeight: "bold", fontSize: 12 }}>
        {label}
      </Text>
    </View>
  );
};

export default StatusBadge;

import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import useImportOrder from "@/services/useImportOrderService";
import { Button } from "tamagui";
import { useDispatch } from "react-redux";
import { setPaperData } from "@/redux/paperSlice";

export default function ReceiptDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();

  const { loading, fetchImportOrders } = useImportOrder();
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeTab, setActiveTab] = useState<"With Button" | "Without Button">(
    "With Button"
  );

  useEffect(() => {
    if (id) {
      fetchImportOrders(parseInt(id)).then((orders) => {
        const filtered = orders.filter(
          (order: any) => order.importRequestId === parseInt(id)
        );
        setFilteredOrders(filtered);
      });
    }
  }, [id]);

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="p-2 flex-1">
        <View className="px-5">
          {/* Header */}
          <View className="bg-black px-4 py-4 flex-row justify-between items-center rounded-2xl">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            {filteredOrders.length > 0 && (
              <Text className="text-white font-bold text-lg">
                Phiếu nhập số <Text className="text-blue-200">#{id}</Text>
              </Text>
            )}
          </View>

          {/* Tabs */}
          <View className="flex-row my-3 bg-gray-200 rounded-lg p-1">
            {["With Button", "Without Button"].map((tab) => (
              <TouchableOpacity
                key={tab}
                className={`flex-1 py-2 rounded-lg ${
                  activeTab === tab ? "bg-white" : "bg-gray-200"
                }`}
                onPress={() =>
                  setActiveTab(tab as "With Button" | "Without Button")
                }
              >
                <Text
                  className={`text-center font-semibold ${
                    activeTab === tab ? "text-black" : "text-gray-500"
                  }`}
                >
                  {tab === "With Button" ? "Tạo chứng từ" : "Xem phiếu nhập"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Danh sách phiếu nhập */}
          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : filteredOrders.length === 0 ? (
            <Text className="mt-5 text-center text-gray-500">
              Không có đơn nhập phù hợp.
            </Text>
          ) : (
            filteredOrders.map((order: any) => (
              <View
                key={order.importOrderId}
                className="mb-4 bg-white rounded-lg p-4"
              >
                {activeTab === "With Button" ? (
                  <>
                    <Text className="text-lg font-bold mb-2">
                      Thông tin phiếu nhập
                    </Text>
                    <View className="border-t border-gray-300 pt-2">
                      <InfoRow
                        title="Mã đơn nhập"
                        value={order.importOrderId}
                      />
                      <InfoRow
                        title="Trạng thái"
                        value={order.status || "Không có trạng thái"}
                      />
                      <InfoRow
                        title="Ngày tạo"
                        value={new Date(order.createdDate).toLocaleString(
                          "vi-VN",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }
                        )}
                      />
                    </View>

                    <Button
                      marginTop="20"
                      onPress={() => {
                        dispatch(
                          setPaperData({ importOrderId: order.importOrderId })
                        );
                        router.push(
                          `/import/create-import/${order.importOrderId}`
                        );
                      }}
                    >
                      Tạo chứng từ
                    </Button>
                  </>
                ) : (
                  <>
                    <Text className="text-lg font-bold mb-2">
                      Thông tin chi tiết
                    </Text>
                    <View className="border-t border-gray-300 pt-2">
                      <InfoRow
                        title="Mã đơn nhập"
                        value={order.importOrderId}
                      />
                      <InfoRow
                        title="Mã phiếu nhập"
                        value={order.importRequestId}
                      />
                      <InfoRow title="Ngày nhận" value={order.dateReceived} />
                      <InfoRow title="Giờ nhận" value={order.timeReceived} />
                      <InfoRow
                        title="Ghi chú"
                        value={order.note || "Không có ghi chú"}
                      />
                      <InfoRow
                        title="Trạng thái"
                        value={order.status || "Chưa cập nhật"}
                      />
                      <InfoRow title="Người tạo" value={order.createdBy} />
                      <InfoRow
                        title="Người cập nhật"
                        value={order.updatedBy || "Chưa cập nhật"}
                      />
                      <InfoRow
                        title="Danh sách chi tiết đơn nhập"
                        value={order.importOrderDetailIds.join(", ")}
                      />

                      <InfoRow
                        title="Thủ kho phụ trách"
                        value={order.assignedWareHouseKeeperId}
                      />
                      <InfoRow
                        title="Danh sách chứng từ"
                        value={
                          order.paperIds
                            ? order.paperIds.join(", ")
                            : "Không có chứng từ"
                        }
                      />
                    </View>
                  </>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Component hiển thị thông tin dạng cột trái - phải
const InfoRow = ({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) => (
  <View className="flex-row justify-between py-1  border-gray-200">
    <Text className="text-gray-600 w-1/2">{title}</Text>
    <Text className="text-black w-1/2 text-right">{value}</Text>
  </View>
);

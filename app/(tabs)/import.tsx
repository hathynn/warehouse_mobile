import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Modal,
} from "react-native";
import { ReactNode, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import useImportOrder from "@/services/useImportOrderService";
import { Button, Input, Select, XStack } from "tamagui";
import { useDispatch, useSelector } from "react-redux";
import { setPaperData } from "@/redux/paperSlice";
import useImportOrderDetail from "@/services/useImportOrderDetailService";
import { setProducts } from "@/redux/productSlice";
import { RootState } from "@/redux/store";
import usePaperService from "@/services/usePaperService";
import { ImportOrderStatus } from "@/types/importOrder.type";
import StatusBadge from "@/components/StatusBadge";

export default function ReceiptDetail() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] =
    useState<ImportOrderStatus | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);

  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();

  const { loading, fetchImportOrders } = useImportOrder();
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [activeTab, setActiveTab] = useState<"With Button" | "Without Button">(
    "With Button"
  );
  const [papers, setPapers] = useState<any[]>([]); // danh sách chứng từ đã fetch
  const { getPaperById } = usePaperService();
  const { fetchImportOrderDetails } = useImportOrderDetail();

  const statusOptions = [
    { label: "Đang xử lý", value: ImportOrderStatus.IN_PROGRESS },
    { label: "Hoàn tất", value: ImportOrderStatus.COMPLETED },
  ];

  useEffect(() => {
    const fetchOrders = async () => {
      if (!userId) return;

      try {
        const orders = await fetchImportOrders(parseInt(userId)); // now it's staffId
        setFilteredOrders(orders);

        const paperIds = orders
          .map((order: any) => order.paperIds)
          .filter(Boolean);
        if (paperIds.length === 0) return;

        const fetchedPapers = await Promise.all(paperIds.map(getPaperById));
        setPapers(fetchedPapers);
      } catch (err) {
        console.error("Lỗi khi lấy đơn nhập:", err);
      }
    };

    fetchOrders();
  }, [userId]);

  const filteredData = filteredOrders.filter((order: any) => {
    if (order.status === ImportOrderStatus.CANCELLED) return false;
  
    const matchSearch = order.importOrderId
      ?.toString()
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
  
    const matchStatus = selectedStatus ? order.status === selectedStatus : true;
  
    return matchSearch && matchStatus;
  });
  

  const products = useSelector((state: RootState) => state.product.products);

  useEffect(() => {
    console.log("Redux products:", products);
  }, [products]);

  // useEffect(() => {
  //   if (!id) return;
  //   fetchImportOrders(parseInt(id)).then(setFilteredOrders);
  //   console.log("ID:", id);
  // }, [id]);

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="p-2 flex-1">
        <View className="px-5">
          {/* Header */}
          <View className="bg-[#1677ff] px-4 py-4 flex-row justify-between items-center rounded-2xl">
            <Text className="text-white font-bold text-lg">
              Danh sách đơn nhập
            </Text>
          </View>

          {/* Tabs */}
          <View className="flex-row my-2 bg-gray-200 rounded-lg p-1">
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

          <XStack alignItems="center" space="$2" marginBottom="$2">
            {/* Ô tìm kiếm */}
            <XStack
              alignItems="center"
              flex={1}
              borderRadius="$4"
              paddingHorizontal="$3"
              backgroundColor="white"
            >
              <Ionicons name="search" size={18} color="#999" />
              <Input
                flex={1}
                placeholder="Tìm theo mã đơn nhập"
                value={searchQuery}
                onChangeText={setSearchQuery}
                borderWidth={0}
                paddingHorizontal="$3"
                backgroundColor="white"
              />
            </XStack>

            {/* Nút phễu lọc trạng thái */}
            <TouchableOpacity
              onPress={() => setFilterVisible(true)}
              style={{
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="filter" size={20} />
            </TouchableOpacity>
          </XStack>

          {/* Danh sách phiếu nhập */}
          {loading ? (
            <ActivityIndicator size="large" color="#0000ff" />
          ) : filteredData.length === 0 ? (
            <Text className="mt-5 text-center text-gray-500">
              Không có đơn nhập phù hợp.
            </Text>
          ) : (
            filteredData.map((order: any) => (
              <View
                key={order.importOrderId}
                className="mb-4 bg-white rounded-lg p-4"
              >
                {activeTab === "With Button" ? (
                  <>
                    <Text className="text-lg font-bold mb-2">
                      Đơn nhập số {order.importOrderId}
                    </Text>
                    <View className="border-t border-gray-300 pt-2">
                      <InfoRow
                        title="Mã đơn nhập"
                        value={order.importOrderId}
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
                       <InfoRow
                        title="Trạng thái"
                        value={<StatusBadge status={order.status} />}
                      />
                    </View>

                    {order.paperIds ? (
                      <Button
                        marginTop="10"
                        onPress={() => {
                          // Nếu đã có paperIds thì không cần dispatch nữa
                          router.push(`/import/paper-detail/${order.paperIds}`);
                        }}
                      >
                        Xem chứng từ
                      </Button>
                    ) : (
                      <Button
                        marginTop="10"
                        onPress={async () => {
                          try {
                            const response = await fetchImportOrderDetails(
                              order.importOrderId
                            );

                            const products = response?.map((item: any) => ({
                              id: item.itemId,
                              name: item.itemName,
                              expect: item.expectQuantity,
                              actual: item.actualQuantity || 0,
                              importOrderId: order.importOrderId,
                            }));

                            dispatch(setProducts(products));
                            dispatch(
                              setPaperData({
                                importOrderId: order.importOrderId,
                              })
                            );

                            router.push("/import/scan-qr");
                          } catch (error) {
                            console.error("Lỗi khi tạo chứng từ:", error);
                          }
                        }}
                      >
                        Kiểm đếm đơn nhập
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Text className="text-lg font-bold mb-2">
                      Thông tin đơn nhập {order.importOrderId}
                    </Text>
                    <View className="border-t  border-b border-gray-300 pt-2 pb-2">
                      <InfoRow
                        title="Mã đơn nhập"
                        value={order.importOrderId}
                      />
                      <InfoRow
                        title="Mã phiếu nhập"
                        value={order.importRequestId}
                      />
                      <InfoRow
                        title="Ngày tạo đơn"
                        value={order.dateReceived}
                      />
                      <InfoRow title="Giờ tạo đơn" value={order.timeReceived} />
                      <InfoRow
                        title="Ghi chú"
                        value={order.note || "Không có ghi chú"}
                      />
                      <InfoRow
                        title="Trạng thái"
                        value={<StatusBadge status={order.status} />}
                      />
                      {/* <InfoRow title="Người tạo" value={order.createdBy} /> */}
                      {/* <InfoRow
                        title="Người cập nhật"
                        value={order.updatedBy || "Chưa cập nhật"}
                      /> */}
                      {/* <InfoRow
                        title="Danh sách chi tiết đơn nhập"
                        value={order.importOrderDetailIds.join(", ")}
                      /> */}

                      <InfoRow
                        title="Thủ kho phụ trách"
                        value={order.assignedWareHouseKeeperId}
                      />
                      {/* <InfoRow
                        title="Danh sách chứng từ"
                        value={
                          order.paperIds
                            ? order.paperIds.join(", ")
                            : "Không có chứng từ"
                        }
                      /> */}
                    </View>
                    <View className="mt-2">
                      <Text className="text-gray-600 pt-2 pb-2 font-semibold mb-1">
                        Thông tin chứng từ:
                      </Text>

                      {order.paperIds ? ( // Nếu có paperId
                        (() => {
                          const paper = papers.find(
                            (p) => p?.id === order.paperIds
                          );
                          return paper ? (
                            <View>
                              {/* <Text className="text-black font-semibold mb-1">
                                #{paper.id}:{" "}
                                {paper.description || "Không có mô tả"}
                              </Text> */}
                              <InfoRow title="Mã chứng từ" value={paper.id} />
                              <InfoRow
                                title="Lý do nhập"
                                value={paper.description || "Không có mô tả"}
                              />
                              <Button
                                marginTop="10"
                                onPress={() => {
                                  // Nếu đã có paperIds thì không cần dispatch nữa
                                  router.push(
                                    `/import/paper-detail/${order.paperIds}`
                                  );
                                }}
                              >
                                Chi tiết chứng từ
                              </Button>
                              {/* <Text className="text-gray-500 text-sm mb-1">
                                Người tạo: {paper.createdBy || "Không rõ"}
                              </Text> */}
                              {/* <Text className="text-gray-500 text-sm mb-2">
                                Ngày tạo:{" "}
                                {new Date(order.createdDate).toLocaleString(
                                  "vi-VN",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  }
                                )}
                              </Text> */}
                            </View>
                          ) : (
                            <Text className="text-gray-500">
                              Không tìm thấy chứng từ #{order.paperIds}
                            </Text>
                          );
                        })()
                      ) : (
                        <Text className="text-gray-500">Không có chứng từ</Text>
                      )}
                    </View>
                  </>
                )}
              </View>
            ))
          )}
        </View>
        <Modal visible={filterVisible} transparent animationType="slide">
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              backgroundColor: "#00000099",
            }}
          >
            <View
              style={{
                margin: 20,
                backgroundColor: "white",
                borderRadius: 10,
                padding: 20,
              }}
            >
              <Text
                style={{ fontWeight: "bold", fontSize: 16, marginBottom: 10 }}
              >
                Lọc theo trạng thái đơn nhập
              </Text>
              {statusOptions.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  onPress={() => {
                    setSelectedStatus(status.value as ImportOrderStatus);
                    setFilterVisible(false);
                  }}
                  style={{
                    paddingVertical: 8,
                    borderBottomWidth: 1,
                    borderColor: "#eee",
                  }}
                >
                  <Text>{status.label}</Text>
                </TouchableOpacity>
              ))}
              <Button
                marginTop="$3"
                theme="active"
                onPress={() => {
                  setSelectedStatus(null); // Bỏ lọc
                  setFilterVisible(false);
                }}
              >
                Bỏ lọc
              </Button>
            </View>
          </View>
        </Modal>
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
  value: ReactNode;
}) => (
  <View className="flex-row justify-between items-center py-1 border-gray-200">
    <Text className="text-gray-600 w-1/2">{title}</Text>
    <View className="w-1/2 items-end">
      {typeof value === 'string' || typeof value === 'number' ? (
        <Text className="text-black text-right">{value}</Text>
      ) : (
        value
      )}
    </View>
  </View>
);


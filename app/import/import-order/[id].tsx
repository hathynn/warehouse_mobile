import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from "react-native";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import useImportOrder from "@/services/useImportOrderService";
import { Button } from "tamagui";
import { useDispatch, useSelector } from "react-redux";
import { setPaperData } from "@/redux/paperSlice";
import usePaperService from "@/services/usePaperService";
import useImportOrderDetail from "@/services/useImportOrderDetailService";
import { setProducts } from "@/redux/productSlice";
import { RootState } from "@/redux/store";
import useItemService from "@/services/useItemService";

export default function ReceiptDetail() {
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
  const { getItemDetailById } = useItemService();
  useEffect(() => {
    if (!id) return;

    fetchImportOrders(parseInt(id)).then(async (orders) => {
      setFilteredOrders(orders);

      // Lấy danh sách paperIds (mỗi đơn nhập chỉ có 1 paperId)
      const paperIds = orders
        .map((order: any) => order.paperIds)
        .filter(Boolean);

      if (paperIds.length === 0) return;

      // Fetch thông tin của từng paperId
      const fetchedPapers = await Promise.all(paperIds.map(getPaperById));

      setPapers(fetchedPapers);
    });
  }, [id]);

  const products = useSelector((state: RootState) => state.product.products);

  useEffect(() => {
    console.log("Redux products:", products);
  }, [products]);

  useEffect(() => {
    if (!id) return;
    fetchImportOrders(parseInt(id)).then(setFilteredOrders);
    console.log("ID:", id);
  }, [id]);

  return (
    <SafeAreaView className="flex-1">
      <ScrollView className="p-2 flex-1">
        <View className="px-5">
          {/* Header */}
          <View className="bg-[#1677ff] px-4 py-4 flex-row justify-between items-center rounded-2xl">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            {filteredOrders.length > 0 && (
              <Text className="text-white font-bold text-lg">
                Phiếu nhập số <Text className="text-blue-200">{id}</Text>
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
                      Đơn nhập số {order.importOrderId}
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

                            // Lấy thông tin providerCode từ API item cho từng product
                            const productsWithProviderCode = await Promise.all(
                              response?.map(async (item: any) => {
                                let providerCode: string[] = [];
                                try {
                                  const itemDetail = await getItemDetailById(item.itemId);
                                  providerCode = itemDetail?.providerCode || [];
                                  console.log(`🔍 Import-order - Item ${item.itemId} providerCode:`, providerCode);
                                } catch (error) {
                                  console.log(`❌ Import-order - Error fetching item detail for ${item.itemId}:`, error);
                                }

                                return {
                                  id: item.itemId,
                                  name: item.itemName,
                                  expect: item.expectQuantity,
                                  actual: item.actualQuantity || 0,
                                  importOrderId: order.importOrderId,
                                  providerCode: providerCode,
                                };
                              }) || []
                            );

                            dispatch(setProducts(productsWithProviderCode));
                            dispatch(
                              setPaperData({
                                importOrderId: order.importOrderId,
                              })
                            );

                            router.push("/import/scan-qr");
                          } catch (error) {
                            console.log("Lỗi khi tạo chứng từ:", error);
                          }
                        }}
                      >
                        Tạo chứng từ
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
                        value={order.status || "Chưa cập nhật"}
                      />
                      <InfoRow title="Người tạo" value={order.createdBy} />
                      <InfoRow
                        title="Người cập nhật"
                        value={order.updatedBy || "Chưa cập nhật"}
                      />
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

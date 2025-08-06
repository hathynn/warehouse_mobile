import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useStockCheck from "@/services/useStockCheckService";
import useStockCheckDetail from "@/services/useStockCheckDetailService";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";
import usePaperService from "@/services/usePaperService";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { StockCheckStatus } from "@/types/stockCheck.type";
import {
  StockCheckDetailStatus,
  StockCheckDetailType,
} from "@/types/stockCheckDetail.type";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StyledButton from "@/components/ui/StyledButton";
import StatusBadge from "@/components/StatusBadge";
import { InventoryItem } from "@/types/inventoryItem.type";
import InventoryModal from "@/components/InventoryModal";

interface RouteParams {
  id: string;
}

const StockCheckDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { id } = route.params as RouteParams;
  const dispatch = useDispatch();

  const stockCheckTypeMap = {
    SPOT_CHECK: "Kiểm tra đột xuất",
    PERIODIC: "Kiểm kê định kỳ",
  };

  const { fetchInventoryItemById, loading: inventoryLoading } =
    useInventoryService();

  const { getItemDetailById } = useItemService();
  const { getPaperById } = usePaperService();

  // Paper state
  const [paper, setPaper] = useState<any>(null);
  const [paperLoading, setPaperLoading] = useState(false);

  // Modal states
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<
    InventoryItem[]
  >([]);
  const [selectedItemCode, setSelectedItemCode] = useState("");
  const [selectedStockCheckDetailId, setSelectedStockCheckDetailId] = useState<
    number | null
  >(null);
  const [searchText, setSearchText] = useState("");
  const [itemUnitType, setItemUnitType] = useState<string>("");
  const [checkedInventoryItemIds, setCheckedInventoryItemIds] = useState<
    string[]
  >([]);

  // Track loading state
  const [trackLoading, setTrackLoading] = useState<string | null>(null);

  const {
    loading: loadingStockCheck,
    fetchStockCheckById,
    updateStockCheckStatus,
    confirmCounted,
  } = useStockCheck();

  const {
    loading: loadingDetails,
    stockCheckDetails,
    fetchStockCheckDetails,
    trackInventoryItem,
  } = useStockCheckDetail();

  const [stockCheck, setStockCheck] = useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        // Fetch stock check info
        fetchStockCheckById(id).then(setStockCheck);

        // Fetch stock check details
        fetchStockCheckDetails(id);
      }
    }, [id])
  );

  // Fetch paper data when stockCheck has paperId and status is COMPLETED
  useEffect(() => {
    if (
      stockCheck?.paperId &&
      stockCheck?.status === StockCheckStatus.COMPLETED
    ) {
      console.log("🔍 Fetching paper with ID:", stockCheck.paperId);
      setPaperLoading(true);
      getPaperById(stockCheck.paperId)
        .then((data: any) => {
          console.log("✅ Paper data received:", data);
          setPaper(data);
        })
        .catch((error) => {
          console.error("❌ Lỗi lấy chứng từ:", error);
          setPaper(null);
        })
        .finally(() => setPaperLoading(false));
    }
  }, [stockCheck?.paperId, stockCheck?.status]);

  if (loadingStockCheck || loadingDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1677ff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const handleStartStockCheck = async () => {
    try {
      // Gọi confirm counted thay vì update status
      const result = await confirmCounted(id);
      if (result) {
        console.log("Đã xác nhận kiểm đếm thành công");
        // Refresh data
        fetchStockCheckById(id).then(setStockCheck);
      }
    } catch (error) {
      console.error("Lỗi khi xác nhận kiểm đếm:", error);
      Alert.alert("Lỗi", "Không thể xác nhận kiểm đếm. Vui lòng thử lại!");
    }
  };

  const handleCompleteStockCheck = async () => {
    try {
      const statusUpdate = await updateStockCheckStatus(
        id,
        StockCheckStatus.COMPLETED
      );
      if (statusUpdate) {
        console.log("✅ Đã hoàn tất kiểm kho");
        router.push("/(tabs)/stock-check");
      }
    } catch (error) {
      console.error("❌ Lỗi khi hoàn tất kiểm kho:", error);
      Alert.alert("Lỗi", "Không thể hoàn tất kiểm kho. Vui lòng thử lại!");
    }
  };

  // Function to refresh inventory items
  const refreshInventoryItems = async () => {
    if (!selectedStockCheckDetailId) return;

    try {
      console.log(
        `🔄 Refreshing inventory items for stockCheckDetailId: ${selectedStockCheckDetailId}`
      );

      // Tìm detail tương ứng và sử dụng inventoryItemIds
      const currentDetail = stockCheckDetails.find(
        (d) => d.id === selectedStockCheckDetailId
      );
      if (!currentDetail || !currentDetail.inventoryItemIds) {
        console.warn("⚠️ Không tìm thấy detail hoặc inventoryItemIds");
        return;
      }

      // Fetch chi tiết từng inventory item
      const inventoryItems = await Promise.all(
        currentDetail.inventoryItemIds.map(async (inventoryItemId: string) => {
          try {
            const inventoryItem = await fetchInventoryItemById(inventoryItemId);
            return inventoryItem;
          } catch (error) {
            console.error(
              `❌ Error fetching inventory item ${inventoryItemId}:`,
              error
            );
            return null;
          }
        })
      );

      const validInventoryItems = inventoryItems.filter(
        (item) => item !== null
      );
      setSelectedInventoryItems(validInventoryItems);
      console.log(`✅ Refreshed ${validInventoryItems.length} inventory items`);
    } catch (error) {
      console.error("❌ Error refreshing inventory items:", error);
    }
  };

  // Handle track inventory item
  const handleTrackInventoryItem = async (inventoryItemId: string) => {
    if (!selectedStockCheckDetailId) return;

    try {
      setTrackLoading(inventoryItemId);

      Alert.alert(
        "Xác nhận tracking",
        `Bạn có chắc chắn muốn track inventory item: ${inventoryItemId}?`,
        [
          {
            text: "Hủy",
            style: "cancel",
            onPress: () => setTrackLoading(null),
          },
          {
            text: "Đồng ý",
            onPress: async () => {
              try {
                console.log(`🔄 Tracking inventory item: ${inventoryItemId}`);

                await trackInventoryItem({
                  stockCheckDetailId: selectedStockCheckDetailId,
                  inventoryItemId: inventoryItemId,
                });

                console.log("✅ Track thành công");

                // Refresh data
                await fetchStockCheckDetails(id);
                await refreshInventoryItems();

                Alert.alert(
                  "Thành công",
                  "Đã track inventory item thành công!"
                );
              } catch (error) {
                console.error("❌ Error tracking:", error);
                Alert.alert(
                  "Lỗi",
                  "Không thể track inventory item. Vui lòng thử lại!"
                );
              } finally {
                setTrackLoading(null);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("❌ Error in handleTrackInventoryItem:", error);
      setTrackLoading(null);
    }
  };

  // Handle row press to fetch inventory items and item details
  const handleRowPress = async (detail: any) => {
    if (!detail.id) {
      console.error("❌ Stock check detail ID not found");
      return;
    }

    setSelectedItemCode(detail.itemId || "");
    setSelectedStockCheckDetailId(detail.id);
    setCheckedInventoryItemIds(detail.checkedInventoryItemIds || []);
    setInventoryModalVisible(true);
    setSearchText("");
    setItemUnitType("");

    try {
      // Sử dụng inventoryItemIds từ response API thay vì gọi API khác
      const inventoryItemIds = detail.inventoryItemIds || [];
      console.log(
        `📦 Using inventory items from API: ${inventoryItemIds.length} items`
      );

      // Fetch chi tiết từng inventory item
      const inventoryItems = await Promise.all(
        inventoryItemIds.map(async (inventoryItemId: string) => {
          try {
            const inventoryItem = await fetchInventoryItemById(inventoryItemId);
            return inventoryItem;
          } catch (error) {
            console.error(
              `❌ Error fetching inventory item ${inventoryItemId}:`,
              error
            );
            return null;
          }
        })
      );

      const validInventoryItems = inventoryItems.filter(
        (item) => item !== null
      );
      setSelectedInventoryItems(validInventoryItems);
      console.log(`✅ Loaded ${validInventoryItems.length} inventory items`);

      // Fetch item details for unit type
      if (detail.itemId) {
        console.log(`🔍 Fetching item details for itemId: ${detail.itemId}`);
        const itemDetails = await getItemDetailById(detail.itemId);
        if (itemDetails && itemDetails.measurementUnit) {
          setItemUnitType(itemDetails.measurementUnit);
        } else {
          setItemUnitType("đơn vị");
          console.warn("⚠️ Không tìm thấy unitType cho item");
        }
      }
    } catch (error) {
      console.error("❌ Error fetching data:", error);
      setSelectedInventoryItems([]);
      setItemUnitType("đơn vị");
    }
  };

  const handleCloseModal = () => {
    setInventoryModalVisible(false);
    setSelectedInventoryItems([]);
    setSearchText("");
    setItemUnitType("");
    setCheckedInventoryItemIds([]);
  };

  const renderSignatureSection = () => {
    if (
      stockCheck?.status !== StockCheckStatus.COMPLETED ||
      !stockCheck?.paperId
    )
      return null;

    return (
      <View style={styles.signatureContainer}>
        <View style={styles.signatureRowWrapper}>
          <View style={styles.signatureItemHorizontal}>
            <Text style={styles.signatureLabelHorizontal}>Người kiểm đếm</Text>
            <Text style={styles.signatureNameHorizontal}>
              {paper?.signProviderName || "Chưa rõ"}
            </Text>
            <View style={styles.signatureImageContainerHorizontal}>
              {paper?.signProviderUrl ? (
                <Image
                  source={{ uri: paper.signProviderUrl }}
                  style={styles.signatureImageHorizontal}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.noSignatureHorizontal}>
                  <Ionicons
                    name="document-text-outline"
                    size={30}
                    color="#ccc"
                  />
                  <Text style={styles.noSignatureTextHorizontal}>
                    Chưa có chữ ký
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.signatureItemHorizontal}>
            <Text style={styles.signatureLabelHorizontal}>Người phê duyệt</Text>
            <Text style={styles.signatureNameHorizontal}>
              {paper?.signReceiverName || "Chưa rõ"}
            </Text>
            <View style={styles.signatureImageContainerHorizontal}>
              {paper?.signReceiverUrl ? (
                <Image
                  source={{ uri: paper.signReceiverUrl }}
                  style={styles.signatureImageHorizontal}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.noSignatureHorizontal}>
                  <Ionicons
                    name="document-text-outline"
                    size={30}
                    color="#ccc"
                  />
                  <Text style={styles.noSignatureTextHorizontal}>
                    Chưa có chữ ký
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderActionButton = () => {
    if (!stockCheck) return null;
    const status = stockCheck.status;

    switch (status) {
      case StockCheckStatus.NOT_STARTED:
        return (
          <View style={styles.actionButtonContainer}>
            <StyledButton
              title="Xác nhận kiểm đếm"
              onPress={handleStartStockCheck}
              style={{ marginTop: 12 }}
            />
          </View>
        );

      case StockCheckStatus.IN_PROGRESS:
        return (
          <View style={styles.actionButtonContainer}>
            <StyledButton
              title="Hoàn tất kiểm kho"
              onPress={handleCompleteStockCheck}
              style={{ marginTop: 12 }}
            />
          </View>
        );

      case StockCheckStatus.COMPLETED:
        return null;
      default:
        return null;
    }
  };

  if (__DEV__) {
    console.warn = () => {};
    console.error = () => {};
  }

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          backgroundColor: "#1677ff",
          paddingTop: insets.top,
          paddingBottom: 16,
          paddingHorizontal: 17,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 12, marginTop: 7 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text
          style={{
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
            marginTop: 7,
          }}
        >
          Phiếu kiểm kho {id}
        </Text>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Thông tin chi tiết phiếu kiểm kho
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>Mã phiếu</Text>
            <View style={styles.badgeBlue}>
              <Text style={styles.badgeText}>{stockCheck?.id}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày tạo</Text>
            <Text style={styles.value}>
              {stockCheck?.createdDate
                ? new Date(stockCheck?.createdDate).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày kiểm đếm</Text>
            <Text style={styles.value}>
              {stockCheck?.countingDate
                ? new Date(stockCheck?.countingDate).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày kiểm xong dự kiến</Text>
            <Text style={styles.value}>
              {stockCheck?.countingDate
                ? new Date(stockCheck?.expectedCompletedDate).toLocaleString(
                    "vi-VN",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }
                  )
                : "--"}
            </Text>
          </View>

          {/* <View style={styles.row}>
            <Text style={styles.label}>Giờ kiểm đếm</Text>
            <Text style={styles.value}>
              {stockCheck?.countingTime || "--"}
            </Text>
          </View> */}

          <View style={styles.row}>
            <Text style={styles.label}>Lý do kiểm kho</Text>
            <Text style={styles.value}>
              {stockCheck?.stockCheckReason || "Không có"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Loại kiểm kho</Text>
            <Text style={styles.value}>
              {stockCheckTypeMap[stockCheck?.type] || "Không có"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Tình trạng</Text>
            <Text style={styles.valueRed}>
              <StatusBadge
                status={stockCheck?.status || "UNKNOWN"}
                flow="import"
              />
            </Text>
          </View>
        </View>

        <View style={styles.tableContainer}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cellCode]}>Mã hàng</Text>
            <Text style={[styles.cellAlignRight]}>Hệ thống</Text>
            <Text style={[styles.cellAlignRight]}>Kiểm đếm</Text>
            {[
              StockCheckStatus.NOT_STARTED,
              StockCheckStatus.IN_PROGRESS,
            ].includes(stockCheck?.status as StockCheckStatus) && (
              <Text style={styles.scanHeader}></Text>
            )}
          </View>

          <ScrollView
            style={styles.scrollableTableContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {stockCheckDetails.map(
              (detail: StockCheckDetailType, index: number) => {
                const isCompleted =
                  detail.status === StockCheckDetailStatus.COMPLETED;
                const isLastItem = index === stockCheckDetails.length - 1;
                const difference = detail.actualQuantity - detail.quantity;

                return (
                  <View key={detail.id}>
                    <TouchableOpacity
                      style={styles.tableRow}
                      onPress={() => handleRowPress(detail)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cellCode]}>{detail.itemId}</Text>
                      <Text style={[styles.cellAlignRight]}>
                        {detail.quantity}
                      </Text>
                      <Text style={[styles.cellAlignRight]}>
                        {detail.actualQuantity}
                      </Text>

                      {[
                        StockCheckStatus.NOT_STARTED,
                        StockCheckStatus.IN_PROGRESS,
                      ].includes(stockCheck?.status as StockCheckStatus) && (
                        <View style={styles.scanCell}>
                          <TouchableOpacity
                            style={[
                              styles.scanButton,
                              isCompleted && styles.scanButtonDisabled,
                            ]}
                            disabled={isCompleted}
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/stock-check/scan-qr?stockCheckId=${stockCheck?.id}&stockCheckDetailId=${detail.id}`
                              );
                            }}
                          >
                            {isCompleted ? (
                              <Text style={styles.scanText}>Hoàn tất</Text>
                            ) : (
                              <Ionicons
                                name="qr-code-outline"
                                size={18}
                                color="white"
                              />
                            )}
                          </TouchableOpacity>
                        </View>
                      )}
                    </TouchableOpacity>

                    {!isLastItem && <View style={styles.divider} />}
                  </View>
                );
              }
            )}
          </ScrollView>
        </View>

        <View style={styles.actionButtonContainer}>{renderActionButton()}</View>
        {renderSignatureSection()}
      </ScrollView>

      <InventoryModal
        visible={inventoryModalVisible}
        onClose={handleCloseModal}
        selectedItemCode={selectedItemCode}
        selectedInventoryItems={selectedInventoryItems}
        itemUnitType={itemUnitType}
        inventoryLoading={inventoryLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        stockCheck={stockCheck} // Pass stockCheck instead of exportRequest
        checkedInventoryItemIds={checkedInventoryItemIds} // Pass checked inventory item IDs
        // Remove export-specific props that aren't needed for stock check
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: "#555",
  },
  card: {
    backgroundColor: "white",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#333",
  },
  value: {
    fontSize: 14,
    color: "#333",
  },
  badgeBlue: {
    backgroundColor: "#1677ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  badgeText: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
  },
  valueRed: {
    fontSize: 14,
    color: "#e63946",
    fontWeight: "bold",
  },
  tableContainer: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scrollableTableContent: {
    maxHeight: 450,
    backgroundColor: "white",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 12,
  },
  scanHeader: {
    width: 60,
  },
  cellAlignRight: {
    flex: 1,
    fontSize: 13,
    textAlign: "center",
  },
  scanCell: {
    width: 60,
    alignItems: "flex-end",
  },
  cellCode: {
    textAlign: "left",
    flex: 2,
  },
  scanButton: {
    backgroundColor: "#1677ff",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  scanButtonDisabled: {
    backgroundColor: "#ccc",
  },
  scanText: {
    color: "white",
    fontSize: 12,
  },
  textGreen: {
    color: "#28a745",
    fontWeight: "600",
  },
  textRed: {
    color: "#dc3545",
    fontWeight: "600",
  },
  actionButtonContainer: {
    marginBottom: 35,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  signatureContainer: {
    backgroundColor: "white",
    margin: 16,
    padding: 25,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  signatureRowWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  signatureItemHorizontal: {
    flex: 1,
    alignItems: "center",
  },
  signatureLabelHorizontal: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    marginBottom: 6,
  },
  signatureNameHorizontal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  signatureImageContainerHorizontal: {
    width: "100%",
    height: 140,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
  },
  signatureImageHorizontal: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  noSignatureHorizontal: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  noSignatureTextHorizontal: {
    fontSize: 10,
    color: "#ccc",
    marginTop: 6,
    textAlign: "center",
  },
});

export default StockCheckDetailScreen;

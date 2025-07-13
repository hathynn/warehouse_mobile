import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Image,
  Alert,
  Modal,
  TextInput as RNTextInput,
} from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useExportRequest from "@/services/useExportRequestService";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";
import usePaperService from "@/services/usePaperService";
import { router } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import {
  setExportRequestDetail,
  setScanMappings,
  updateInventoryItemId,
} from "@/redux/exportRequestDetailSlice";
import { RootState, store } from "@/redux/store";
import { ExportRequestStatus } from "@/types/exportRequest.type";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StyledButton from "@/components/ui/StyledButton";
import StatusBadge from "@/components/StatusBadge";
import { ExportRequestDetailStatus } from "@/types/exportRequestDetail.type";
import { InventoryItem } from "@/types/inventoryItem.type";

interface RouteParams {
  id: string;
}

const ExportRequestScreen: React.FC = () => {
  const insets = useSafeAreaInsets();

  const route = useRoute();
  const { id } = route.params as RouteParams;
  const dispatch = useDispatch();
  const { updateActualQuantity } = useExportRequestDetail();
  const {
    fetchInventoryItemsByExportRequestDetailId,
    autoChangeInventoryItem,
    loading: inventoryLoading,
  } = useInventoryService();
  const { getItemDetailById } = useItemService();
  const [paper, setPaper] = useState<any>(null);
  const [paperLoading, setPaperLoading] = useState(false);

  // Updated state for inventory items modal
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<
    InventoryItem[]
  >([]);
  const [selectedItemCode, setSelectedItemCode] = useState("");
  const [selectedExportRequestDetailId, setSelectedExportRequestDetailId] =
    useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [itemUnitType, setItemUnitType] = useState<string>("");
  
  // New state for auto-change loading
  const [autoChangeLoading, setAutoChangeLoading] = useState<string | null>(null);

  const { getPaperById } = usePaperService();

  const getExportTypeLabel = (type: string | undefined) => {
    switch (type) {
      case "BORROWING":
        return "Mượn";
      case "RETURN":
        return "Trả";
      case "LIQUIDATION":
        return "Thanh lý";
      case "PARTIAL":
        return "Xuất lẻ";
      case "PRODUCTION":
        return "Xuất sản xuất";
      case "SELLING":
        return "Xuất bán";
      default:
        return "Không xác định";
    }
  };

  const {
    loading: loadingRequest,
    exportRequest,
    fetchExportRequestById,
    updateExportRequestStatus,
  } = useExportRequest();

  const { loading: loadingDetails, fetchExportRequestDetails } =
    useExportRequestDetail();

  const scanMappings = useSelector(
    (state: RootState) => state.exportRequestDetail.scanMappings
  );

  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        fetchExportRequestById(id);
        fetchExportRequestDetails(id, 1, 100).then((newData) => {
          const refreshedDetails = newData.map((item) => ({
            ...item,
            actualQuantity: item.actualQuantity ?? 0,
            inventoryItemIds: item.inventoryItemIds ?? [],
          }));

          dispatch(setExportRequestDetail(refreshedDetails));

          const mappings = refreshedDetails.flatMap((detail) =>
            (detail.inventoryItemIds ?? []).map((inventoryItemId: string) => ({
              inventoryItemId: inventoryItemId.trim().toLowerCase(),
              exportRequestDetailId: detail.id,
            }))
          );
          dispatch(setScanMappings(mappings));
        });
      }
    }, [id])
  );

  // Fetch paper data when exportRequest has paperId and status is COMPLETED
  useEffect(() => {
    if (
      exportRequest?.paperId &&
      exportRequest?.status === ExportRequestStatus.COMPLETED
    ) {
      console.log("🔍 Fetching paper with ID:", exportRequest.paperId);
      setPaperLoading(true);
      getPaperById(exportRequest.paperId)
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
  }, [exportRequest?.paperId, exportRequest?.status]);

  const savedExportRequestDetails = useSelector(
    (state: RootState) => state.exportRequestDetail.details
  );

  useEffect(() => {
    console.log(
      "🟦 [Redux] savedExportRequestDetails:",
      savedExportRequestDetails
    );
    console.log("🟩 [Redux] scanMappings:", scanMappings);
  }, [savedExportRequestDetails, scanMappings]);

  if (loadingRequest || loadingDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1677ff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const handleConfirm = async () => {
    try {
      const statusUpdate = await updateExportRequestStatus(
        id,
        ExportRequestStatus.COUNTED
      );
      if (statusUpdate) {
        console.log("✅ Đã cập nhật status sang COUNTED");
        router.push("/(tabs)/export");
      } else {
        console.warn("⚠️ Cập nhật status thất bại.");
      }
    } catch (error) {
      console.error("❌ Lỗi khi xác nhận:", error);
    }
  };

  // Function to refresh inventory items
  const refreshInventoryItems = async () => {
    if (!selectedExportRequestDetailId) return;
    
    try {
      console.log(`🔄 Refreshing inventory items for exportRequestDetailId: ${selectedExportRequestDetailId}`);
      const inventoryItems = await fetchInventoryItemsByExportRequestDetailId(selectedExportRequestDetailId);
      setSelectedInventoryItems(inventoryItems);
      console.log(`✅ Refreshed ${inventoryItems.length} inventory items`);
    } catch (error) {
      console.error("❌ Error refreshing inventory items:", error);
    }
  };

  // Handle auto-change inventory item
// Handle auto-change inventory item với debug
const handleAutoChange = async (inventoryItemId: string) => {
  try {
    setAutoChangeLoading(inventoryItemId);
    
    Alert.alert(
      "Xác nhận đổi mã",
      `Bạn có chắc chắn muốn đổi mã inventory item: ${inventoryItemId}?`,
      [
        {
          text: "Hủy",
          style: "cancel",
          onPress: () => setAutoChangeLoading(null),
        },
        {
          text: "Đồng ý",
          onPress: async () => {
            try {
              console.log(`🔄 Auto-changing inventory item: ${inventoryItemId}`);
              
              // Lưu lại danh sách inventory items trước khi đổi để so sánh
              const oldInventoryItems = [...selectedInventoryItems];
              console.log("📦 Old inventory items:", oldInventoryItems.map(item => item.id));
              
              // Gọi API để đổi mã
              const result = await autoChangeInventoryItem(inventoryItemId);
              console.log("🔍 API autoChangeInventoryItem result:", result);
              
              // Refresh inventory items để lấy dữ liệu mới
              await refreshInventoryItems();
              
              // So sánh để tìm inventoryItemId mới
              // Chờ một chút để đảm bảo selectedInventoryItems đã được cập nhật
              setTimeout(() => {
                const newInventoryItems = selectedInventoryItems;
                console.log("📦 New inventory items:", newInventoryItems.map(item => item.id));
                
                // Tìm item mới (item có trong newInventoryItems nhưng không có trong oldInventoryItems)
                const newItem = newInventoryItems.find(newItem => 
                  !oldInventoryItems.some(oldItem => oldItem.id === newItem.id)
                );
                
                if (newItem && selectedExportRequestDetailId) {
                  console.log(`🎯 Found new inventory item: ${newItem.id}`);
                  
                  // Cập nhật Redux với inventoryItemId mới
                  dispatch(updateInventoryItemId({
                    exportRequestDetailId: selectedExportRequestDetailId.toString(),
                    oldInventoryItemId: inventoryItemId,
                    newInventoryItemId: newItem.id,
                  }));
                  
                  console.log(`✅ Updated Redux: ${inventoryItemId} -> ${newItem.id}`);
                } else {
                  console.warn("⚠️ Could not find new inventory item after auto-change");
                  
                  // Fallback: Thử refresh lại toàn bộ export request details từ API
                  console.log("🔄 Fallback: Refreshing export request details from API");
                  fetchExportRequestDetails(id, 1, 100).then((refreshedData) => {
                    const refreshedDetails = refreshedData.map((item) => ({
                      ...item,
                      actualQuantity: item.actualQuantity ?? 0,
                      inventoryItemIds: item.inventoryItemIds ?? [],
                    }));

                    dispatch(setExportRequestDetail(refreshedDetails));

                    const mappings = refreshedDetails.flatMap((detail) =>
                      (detail.inventoryItemIds ?? []).map((inventoryItemId: string) => ({
                        inventoryItemId: inventoryItemId.trim().toLowerCase(),
                        exportRequestDetailId: detail.id,
                      }))
                    );
                    dispatch(setScanMappings(mappings));
                    
                    console.log("✅ Fallback refresh completed");
                  });
                }
              }, 1000); // Đợi 1 giây để đảm bảo state đã được cập nhật
              
              Alert.alert("Thành công", "Đã đổi mã inventory item thành công!");
            } catch (error) {
              console.error("❌ Error auto-changing inventory item:", error);
              Alert.alert("Lỗi", "Không thể đổi mã inventory item. Vui lòng thử lại!");
            } finally {
              setAutoChangeLoading(null);
            }
          },
        },
      ]
    );
  } catch (error) {
    console.error("❌ Error in handleAutoChange:", error);
    setAutoChangeLoading(null);
  }
};

  // Updated handle row press to fetch inventory items and item details
  const handleRowPress = async (detail: any) => {
    if (!detail.id) {
      console.error("❌ Export request detail ID not found");
      return;
    }

    setSelectedItemCode(detail.itemId || "");
    setSelectedExportRequestDetailId(detail.id);
    setInventoryModalVisible(true);
    setSearchText("");
    setItemUnitType("");

    try {
      console.log(
        `🔍 Fetching inventory items for exportRequestDetailId: ${detail.id}`
      );

      // Fetch inventory items
      const inventoryItems = await fetchInventoryItemsByExportRequestDetailId(
        detail.id
      );
      setSelectedInventoryItems(inventoryItems);
      console.log(`✅ Loaded ${inventoryItems.length} inventory items`);

      // Fetch item details để lấy unitType
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

  // Filter inventory items based on search text
  const filteredInventoryItems = selectedInventoryItems.filter(
    (item) =>
      item.id?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.itemId?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.inventoryItemRow}>
      <View style={styles.inventoryItemContent}>
        <Text style={styles.inventoryItemId}>{item.id}</Text>
        <Text style={styles.inventoryItemSubtext}>Mã hàng: {item.itemId}</Text>
        {exportRequest?.type === "PRODUCTION" && (
          <Text style={styles.inventoryItemSubtext}>
            Giá trị cần xuất: {item.measurementValue} {itemUnitType || "đơn vị"}
          </Text>
        )}
      </View>

      {/* Auto-change button for items not being tracked for export */}
      {!item.isTrackingForExport && (
        <View style={styles.autoChangeButtonContainer}>
          <TouchableOpacity
            style={[
              styles.autoChangeButton,
              autoChangeLoading === item.id && styles.autoChangeButtonDisabled
            ]}
            onPress={() => handleAutoChange(item.id)}
            disabled={autoChangeLoading === item.id}
          >
            {autoChangeLoading === item.id ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={16} color="white" />
                <Text style={styles.autoChangeButtonText}>Đổi</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderActionButton = () => {
    if (!exportRequest) return null;
    const status = exportRequest.status;

    switch (status) {
      case ExportRequestStatus.IN_PROGRESS:
        return (
          <View>
            <StyledButton
              title="Xác nhận số lượng"
              onPress={handleConfirm}
              style={{ marginTop: 12 }}
            />
          </View>
        );

      case ExportRequestStatus.WAITING_EXPORT:
        return (
          <StyledButton
            title="Xác nhận xuất kho"
            onPress={() => router.push(`/export/sign/warehouse-sign?id=${id}`)}
            style={{ marginTop: 12 }}
          />
        );
      case ExportRequestStatus.COMPLETED:
        return null;
      default:
        return null;
    }
  };

  const renderSignatureSection = () => {
    if (
      exportRequest?.status !== ExportRequestStatus.COMPLETED ||
      !exportRequest?.paperId
    )
      return null;

    return (
      <View style={styles.signatureContainer}>
        <View style={styles.signatureWrapper}>
          <View style={styles.signatureItem}>
            <Text style={styles.signatureLabel}>
              Người giao hàng: {paper?.signProviderName || "Chưa rõ"}
            </Text>
            <View style={styles.signatureImageContainer}>
              {paper?.signProviderUrl ? (
                <Image
                  source={{ uri: paper.signProviderUrl }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.noSignature}>
                  <Ionicons
                    name="document-text-outline"
                    size={40}
                    color="#ccc"
                  />
                  <Text style={styles.noSignatureText}>Chưa có chữ ký</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.signatureItem}>
            <Text style={styles.signatureLabel}>
              Người nhận hàng: {paper?.signReceiverName || "Chưa rõ"}
            </Text>
            <View style={styles.signatureImageContainer}>
              {paper?.signReceiverUrl ? (
                <Image
                  source={{ uri: paper.signReceiverUrl }}
                  style={styles.signatureImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.noSignature}>
                  <Ionicons
                    name="document-text-outline"
                    size={40}
                    color="#ccc"
                  />
                  <Text style={styles.noSignatureText}>Chưa có chữ ký</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.completedBadge}>
          <Ionicons name="checkmark-circle" size={20} color="#28a745" />
          <Text style={styles.completedText}>Đơn hàng đã hoàn thành</Text>
        </View>
      </View>
    );
  };

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
          Thông tin phiếu xuất #{id}
        </Text>
      </View>
      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin chi tiết yêu cầu</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Mã phiếu</Text>
            <View style={styles.badgeBlue}>
              <Text style={styles.badgeText}>
                {exportRequest?.exportRequestId}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày tạo đơn</Text>
            <Text style={styles.value}>
              {exportRequest?.exportDate
                ? new Date(exportRequest?.exportDate).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày mong muốn xuất</Text>
            <Text style={styles.value}>
              {exportRequest?.exportDate
                ? new Date(exportRequest?.exportDate).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Loại xuất</Text>
            <Text style={styles.value}>
              {getExportTypeLabel(exportRequest?.type)}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Tình trạng yêu cầu</Text>
            <Text style={styles.valueRed}>
              <StatusBadge
                status={exportRequest?.status || "UNKNOWN"}
                flow="export"
              />
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cellCode]}>Mã hàng</Text>
            <Text style={[styles.cellAlignRight]}>Cần</Text>
            <Text style={[styles.cellAlignRight]}>Kiểm đếm</Text>
            {[
              ExportRequestStatus.IN_PROGRESS,
              ExportRequestStatus.COUNTED,
            ].includes(exportRequest?.status as ExportRequestStatus) && (
              <Text style={styles.scanHeader}></Text>
            )}
          </View>

          {savedExportRequestDetails.map((detail: any, index: number) => {
            const isDisabled = detail.quantity === detail.actualQuantity;
            const isLastItem = index === savedExportRequestDetails.length - 1;

            return (
              <View key={detail.id}>
                <TouchableOpacity
                  style={styles.tableRow}
                  onPress={() => handleRowPress(detail)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cellCode]}>{detail.itemId}</Text>
                  <Text style={[styles.cellAlignRight]}>{detail.quantity}</Text>
                  <Text style={[styles.cellAlignRight]}>
                    {detail.actualQuantity}
                  </Text>

                  {[
                    ExportRequestStatus.IN_PROGRESS,
                    ExportRequestStatus.COUNTED,
                  ].includes(exportRequest?.status as ExportRequestStatus) && (
                    <View style={styles.scanCell}>
                      <TouchableOpacity
                        style={[
                          styles.scanButton,
                          isDisabled && styles.scanButtonDisabled,
                        ]}
                        disabled={isDisabled}
                        onPress={(e) => {
                          e.stopPropagation();
                          router.push(
                            `/export/scan-qr?id=${exportRequest?.exportRequestId}`
                          );
                        }}
                      >
                        {isDisabled ? (
                          <Text style={styles.scanText}>Đã đủ</Text>
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
          })}
        </View>

        <View style={styles.actionButtonContainer}>{renderActionButton()}</View>

        {renderSignatureSection()}
      </ScrollView>

      {/* Updated Inventory Items Modal */}
      <Modal visible={inventoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Danh sách sản phẩm tồn kho (Mã hàng #{selectedItemCode})
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setInventoryModalVisible(false);
                  setSelectedInventoryItems([]);
                  setSearchText("");
                  setItemUnitType("");
                  setAutoChangeLoading(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.itemCountContainer}>
              <Text style={styles.sectionTitle}>
                Mã sản phẩm tồn kho ({filteredInventoryItems.length} sản phẩm)
              </Text>
              {inventoryLoading && (
                <ActivityIndicator
                  size="small"
                  color="#1677ff"
                  style={styles.loadingIndicator}
                />
              )}
            </View>

            {inventoryLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1677ff" />
                <Text style={styles.loadingText}>Đang tải danh sách...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredInventoryItems}
                renderItem={renderInventoryItem}
                keyExtractor={(item) => item.id}
                style={styles.inventoryList}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="archive-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>
                      {searchText
                        ? "Không tìm thấy sản phẩm phù hợp"
                        : "Không có sản phẩm tồn kho"}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
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
  valueBlue: {
    fontSize: 14,
    color: "#1677ff",
    fontWeight: "bold",
  },
  valueRed: {
    fontSize: 14,
    color: "#e63946",
    fontWeight: "bold",
  },
  table: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
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
  cell: {
    flex: 1,
    fontSize: 13,
    textAlign: "center",
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
  cellAlignNumber: {
    textAlign: "right",
    paddingRight: 1,
  },
  alignRight: {
    textAlign: "center",
    paddingRight: 10,
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
  inputLabel: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f3f4f6",
    padding: 10,
    borderRadius: 8,
    fontSize: 14,
    height: 80,
    textAlignVertical: "top",
  },
  inputs: {
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 12,
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    height: "75%",
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 5,
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    marginRight: 16,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  itemCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  inventoryList: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  inventoryItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "white",
  },
  inventoryItemContent: {
    flex: 1,
  },
  inventoryItemId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  inventoryItemSubtext: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  inventoryItemStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
    autoChangeButtonContainer: {
    marginLeft: 12,
    alignItems: "center",
  },
 actionButtonContainer: {
  marginBottom:35,
   
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  autoChangeButton: {
    backgroundColor: "#ff6b35",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  autoChangeButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
    shadowOpacity: 0,
  },
  autoChangeButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
    textAlign: "center",
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
  signatureTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: "#1677ff",
  },
  signatureWrapper: {
    marginBottom: 20,
  },
  signatureItem: {
    marginBottom: 20,
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
  },
  signatureImageContainer: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  signatureImage: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  noSignature: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  noSignatureText: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 8,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f8f0",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#28a745",
  },
  completedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#28a745",
    marginLeft: 8,
  },
});

export default ExportRequestScreen;

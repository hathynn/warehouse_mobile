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
import { RootState } from "@/redux/store";
import { ExportRequestStatus } from "@/types/exportRequest.type";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StyledButton from "@/components/ui/StyledButton";
import StatusBadge from "@/components/StatusBadge";
import { InventoryItem } from "@/types/inventoryItem.type";
import InventoryModal from "@/components/InventoryModal"; // Import modal component

interface RouteParams {
  id: string;
}

const ExportRequestScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { id } = route.params as RouteParams;
  const dispatch = useDispatch();

  const {
    fetchInventoryItemsByExportRequestDetailId,
    autoChangeInventoryItem,
    fetchInventoryItemById,
    changeInventoryItemForExportDetail,
    loading: inventoryLoading,
  } = useInventoryService();

  const { getItemDetailById } = useItemService();
  const { getPaperById } = usePaperService();

  // Paper state
  const [paper, setPaper] = useState<any>(null);
  const [paperLoading, setPaperLoading] = useState(false);

  // Modal states
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemCode, setSelectedItemCode] = useState("");
  const [selectedExportRequestDetailId, setSelectedExportRequestDetailId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [itemUnitType, setItemUnitType] = useState<string>("");

  // Auto-change loading state
  const [autoChangeLoading, setAutoChangeLoading] = useState<string | null>(null);

  // Manual change states
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);
  const [manualSearchText, setManualSearchText] = useState("");
  const [selectedManualItem, setSelectedManualItem] = useState<InventoryItem | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [manualChangeLoading, setManualChangeLoading] = useState(false);
const [originalItemId, setOriginalItemId] = useState<string>("");

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
      case "INTERNAL":
        return "Xuất nội bộ";
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

  const { loading: loadingDetails, fetchExportRequestDetails, resetTracking  } = useExportRequestDetail();

  const scanMappings = useSelector(
    (state: RootState) => state.exportRequestDetail.scanMappings
  );

  const savedExportRequestDetails = useSelector(
    (state: RootState) => state.exportRequestDetail.details
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
      console.log(
        `🔄 Refreshing inventory items for exportRequestDetailId: ${selectedExportRequestDetailId}`
      );
      const inventoryItems = await fetchInventoryItemsByExportRequestDetailId(
        selectedExportRequestDetailId
      );
      setSelectedInventoryItems(inventoryItems);
      console.log(`✅ Refreshed ${inventoryItems.length} inventory items`);
    } catch (error) {
      console.error("❌ Error refreshing inventory items:", error);
    }
  };

  // Function to fetch all inventory items by itemId for manual change
  const fetchAllInventoryItemsByItemId = async (itemId: string) => {
    try {
      console.log(`🔍 Fetching all inventory items for itemId: ${itemId}`);

      const itemDetails = await getItemDetailById(itemId);
      if (
        !itemDetails ||
        !itemDetails.inventoryItemIds ||
        itemDetails.inventoryItemIds.length === 0
      ) {
        console.warn("⚠️ No inventory item IDs found for this item");
        return [];
      }

      console.log(
        `📦 Found ${itemDetails.inventoryItemIds.length} inventory item IDs:`,
        itemDetails.inventoryItemIds
      );

      const inventoryItems = await Promise.all(
        itemDetails.inventoryItemIds.map(async (inventoryItemId: string) => {
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

      return validInventoryItems;
    } catch (error) {
      console.error("❌ Error fetching all inventory items:", error);
      return [];
    }
  };

  // ✅ Function tổng hợp refresh tất cả data
const refreshAllData = async () => {
  try {
    console.log("🔄 Refreshing all data...");
    
    // Refresh inventory items for modal
    if (selectedExportRequestDetailId) {
      const inventoryItems = await fetchInventoryItemsByExportRequestDetailId(
        selectedExportRequestDetailId
      );
      setSelectedInventoryItems(inventoryItems);
    }
    
    // Refresh export request details
    const refreshedData = await fetchExportRequestDetails(id, 1, 100);
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
    
    console.log("✅ All data refreshed successfully");
  } catch (error) {
    console.error("❌ Error refreshing data:", error);
  }
};

  // Handle auto-change inventory item
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

              const currentItem = selectedInventoryItems.find(item => item.id === inventoryItemId);
              
              // ✅ Reset tracking nếu cần
              if (currentItem?.isTrackingForExport && selectedExportRequestDetailId) {
                console.log(`🔄 Resetting tracking for: ${inventoryItemId}`);
                
                const resetSuccess = await resetTracking(
                  selectedExportRequestDetailId.toString(),
                  inventoryItemId
                );
                
                if (!resetSuccess) {
                  Alert.alert("Lỗi", "Không thể reset tracking. Vui lòng thử lại!");
                  return;
                }
                
                console.log(`✅ Reset tracking thành công`);
              }

              // ✅ Auto change inventory item
              const result = await autoChangeInventoryItem(inventoryItemId);
              console.log("✅ Auto change thành công:", result);

              // ✅ Chỉ refresh một lần tất cả data
              await refreshAllData();

              Alert.alert("Thành công", "Đã đổi mã inventory item thành công!");

            } catch (error) {
              console.error("❌ Error auto-changing:", error);
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
  const handleManualChangePress = async (originalInventoryItemId: string) => {
    try {
      console.log(`🔄 Starting manual change for itemId: ${selectedItemCode}`);

      const allItems = await fetchAllInventoryItemsByItemId(selectedItemCode);
      setAllInventoryItems(allItems);
      setManualSearchText("");
    } catch (error) {
      console.error("❌ Error in manual change:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách inventory items");
    }
  };

  // Handle manual item selection
 const handleManualItemSelect = (
  selectedItem: InventoryItem,
  originalInventoryItemId: string
) => {
  setSelectedManualItem(selectedItem);
  setOriginalItemId(originalInventoryItemId); // ✅ Lưu originalItemId
};
 if (__DEV__) {
    console.warn = () => {};
    console.error = () => {};
  }
  // Handle manual change submission
const handleManualChangeSubmit = async () => {
  if (!selectedManualItem || !originalItemId) {
    Alert.alert("Lỗi", "Vui lòng chọn item để đổi");
    return;
  }

  try {
    setManualChangeLoading(true);

    if (originalItemId === selectedManualItem.id) {
      Alert.alert("Lỗi", "Không thể đổi sang cùng một inventory item!");
      return;
    }

    console.log(`🔄 Manual change: ${originalItemId} -> ${selectedManualItem.id}`);

    const originalItem = selectedInventoryItems.find(item => item.id === originalItemId);
    
    // ✅ Reset tracking nếu cần
    if (originalItem?.isTrackingForExport && selectedExportRequestDetailId) {
      console.log(`🔄 Resetting tracking for: ${originalItemId}`);
      
      const resetSuccess = await resetTracking(
        selectedExportRequestDetailId.toString(),
        originalItemId
      );
      
      if (!resetSuccess) {
        Alert.alert("Lỗi", "Không thể reset tracking. Vui lòng thử lại!");
        return;
      }
      
      console.log(`✅ Reset tracking thành công`);
    }

    // ✅ Manual change
    const result = await changeInventoryItemForExportDetail(
      originalItemId,
      selectedManualItem.id,
      changeReason
    );

    if (!result) {
      throw new Error("API call failed");
    }

    console.log("✅ Manual change thành công");

    // ✅ Update Redux
    if (selectedExportRequestDetailId) {
      dispatch(
        updateInventoryItemId({
          exportRequestDetailId: selectedExportRequestDetailId.toString(),
          oldInventoryItemId: originalItemId,
          newInventoryItemId: selectedManualItem.id,
        })
      );
    }

    // ✅ Chỉ refresh một lần tất cả data
    await refreshAllData();

    Alert.alert("Thành công", "Đã đổi item thành công!");

    // ✅ Reset states
    setSelectedManualItem(null);
    setChangeReason("");
    setOriginalItemId("");

  } catch (error) {
    console.error("❌ Error in manual change:", error);
    
    let errorMessage = "Không thể đổi item. Vui lòng thử lại!";
    
    if (error.response?.data?.message?.includes("already has an export request detail")) {
      errorMessage = "ID này đã có trong request không thể đổi";
    }
    
    Alert.alert("Lỗi", errorMessage);
  } finally {
    setManualChangeLoading(false);
  }
};
  // Handle row press to fetch inventory items and item details
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

      const inventoryItems = await fetchInventoryItemsByExportRequestDetailId(
        detail.id
      );
      setSelectedInventoryItems(inventoryItems);
      console.log(`✅ Loaded ${inventoryItems.length} inventory items`);

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
    setAllInventoryItems([]);
    setSearchText("");
    setManualSearchText("");
    setItemUnitType("");
    setAutoChangeLoading(null);
    setSelectedManualItem(null);
    setChangeReason("");
  };

  const renderSignatureSection = () => {
    if (
      exportRequest?.status !== ExportRequestStatus.COMPLETED ||
      !exportRequest?.paperId
    )
      return null;

    return (
      <View style={styles.signatureContainer}>
        <View style={styles.signatureRowWrapper}>
          <View style={styles.signatureItemHorizontal}>
            <Text style={styles.signatureLabelHorizontal}>Người giao hàng</Text>
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
            <Text style={styles.signatureLabelHorizontal}>Người nhận hàng</Text>
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
    if (!exportRequest) return null;
    const status = exportRequest.status;

    switch (status) {
      case ExportRequestStatus.IN_PROGRESS:
        return (
          <View style={styles.actionButtonContainer}>
            <StyledButton
              title="Xác nhận kiểm đếm"
              onPress={handleConfirm}
              style={{ marginTop: 12 }}
            />
          </View>
        );

      case ExportRequestStatus.WAITING_EXPORT:
        return (
          <View style={styles.actionButtonContainer}>
            <StyledButton
              title="Xác nhận xuất kho"
              onPress={() =>
                router.push(`/export/sign/warehouse-sign?id=${id}`)
              }
              style={{ marginTop: 12 }}
            />
          </View>
        );
      case ExportRequestStatus.COMPLETED:
        return null;
      default:
        return null;
    }
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

        <View style={styles.tableContainer}>
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

          <ScrollView
            style={styles.scrollableTableContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
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
                    <Text style={[styles.cellAlignRight]}>
                      {detail.quantity}
                    </Text>
                    <Text style={[styles.cellAlignRight]}>
                      {detail.actualQuantity}
                    </Text>

                    {[
                      ExportRequestStatus.IN_PROGRESS,
                      ExportRequestStatus.COUNTED,
                    ].includes(
                      exportRequest?.status as ExportRequestStatus
                    ) && (
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
        exportRequest={exportRequest}
        autoChangeLoading={autoChangeLoading}
        onAutoChange={handleAutoChange}
        onManualChangePress={handleManualChangePress}
        allInventoryItems={allInventoryItems}
        manualSearchText={manualSearchText}
        onManualSearchTextChange={setManualSearchText}
        selectedManualItem={selectedManualItem}
        changeReason={changeReason}
        onChangeReasonChange={setChangeReason}
        manualChangeLoading={manualChangeLoading}
        onManualItemSelect={handleManualItemSelect}
        onManualChangeSubmit={handleManualChangeSubmit}
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

export default ExportRequestScreen;
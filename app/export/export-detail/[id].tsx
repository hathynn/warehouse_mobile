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
  Keyboard,
  TouchableWithoutFeedback,
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
    fetchInventoryItemById,
    changeInventoryItemForExportDetail,
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
  const [autoChangeLoading, setAutoChangeLoading] = useState<string | null>(
    null
  );

  const [modalPage, setModalPage] = useState<
    "main" | "manual_select" | "reason_input"
  >("main");
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>(
    []
  );
  const [manualSearchText, setManualSearchText] = useState("");
  const [selectedManualItem, setSelectedManualItem] =
    useState<InventoryItem | null>(null);
  const [originalItemId, setOriginalItemId] = useState<string>("");
  const [changeReason, setChangeReason] = useState("");
  const [manualChangeLoading, setManualChangeLoading] = useState(false);

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
  // Function to fetch all inventory items by itemId for manual change
  // Function to fetch all inventory items by itemId for manual change
  const fetchAllInventoryItemsByItemId = async (itemId: string) => {
    try {
      console.log(`🔍 Fetching all inventory items for itemId: ${itemId}`);

      // Get item details to get inventoryItemIds list
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

      // Log each inventory item ID being fetched (như log của bạn)
      itemDetails.inventoryItemIds.forEach((inventoryItemId: string) => {
      //   console.log(`Lấy inventory item theo ID ${inventoryItemId}`);
      // });

      // Fetch details for each inventory item ID using your service
      const inventoryItems = await Promise.all(
        itemDetails.inventoryItemIds.map(async (inventoryItemId: string) => {
          try {
            // Sử dụng fetchInventoryItemById service của bạn
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

      // Filter out null results
      const validInventoryItems = inventoryItems.filter(
        (item) => item !== null
      );
      // console.log(
      //   `✅ Successfully fetched ${validInventoryItems.length} inventory items`
      // );

      return validInventoryItems;
    } catch (error) {
      console.error("❌ Error fetching all inventory items:", error);
      return [];
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
                console.log(
                  `🔄 Auto-changing inventory item: ${inventoryItemId}`
                );

                // Lưu lại danh sách inventory items trước khi đổi để so sánh
                const oldInventoryItems = [...selectedInventoryItems];
                console.log(
                  "📦 Old inventory items:",
                  oldInventoryItems.map((item) => item.id)
                );

                // Gọi API để đổi mã
                const result = await autoChangeInventoryItem(inventoryItemId);
                console.log("🔍 API autoChangeInventoryItem result:", result);

                // Refresh inventory items để lấy dữ liệu mới
                await refreshInventoryItems();

                // So sánh để tìm inventoryItemId mới
                // Chờ một chút để đảm bảo selectedInventoryItems đã được cập nhật
                setTimeout(() => {
                  const newInventoryItems = selectedInventoryItems;
                  console.log(
                    "📦 New inventory items:",
                    newInventoryItems.map((item) => item.id)
                  );

                  // Tìm item mới (item có trong newInventoryItems nhưng không có trong oldInventoryItems)
                  const newItem = newInventoryItems.find(
                    (newItem) =>
                      !oldInventoryItems.some(
                        (oldItem) => oldItem.id === newItem.id
                      )
                  );

                  if (newItem && selectedExportRequestDetailId) {
                    console.log(`🎯 Found new inventory item: ${newItem.id}`);

                    // Cập nhật Redux với inventoryItemId mới
                    dispatch(
                      updateInventoryItemId({
                        exportRequestDetailId:
                          selectedExportRequestDetailId.toString(),
                        oldInventoryItemId: inventoryItemId,
                        newInventoryItemId: newItem.id,
                      })
                    );

                    console.log(
                      `✅ Updated Redux: ${inventoryItemId} -> ${newItem.id}`
                    );
                  } else {
                    console.warn(
                      "⚠️ Could not find new inventory item after auto-change"
                    );

                    // Fallback: Thử refresh lại toàn bộ export request details từ API
                    console.log(
                      "🔄 Fallback: Refreshing export request details from API"
                    );
                    fetchExportRequestDetails(id, 1, 100).then(
                      (refreshedData) => {
                        const refreshedDetails = refreshedData.map((item) => ({
                          ...item,
                          actualQuantity: item.actualQuantity ?? 0,
                          inventoryItemIds: item.inventoryItemIds ?? [],
                        }));

                        dispatch(setExportRequestDetail(refreshedDetails));

                        const mappings = refreshedDetails.flatMap((detail) =>
                          (detail.inventoryItemIds ?? []).map(
                            (inventoryItemId: string) => ({
                              inventoryItemId: inventoryItemId
                                .trim()
                                .toLowerCase(),
                              exportRequestDetailId: detail.id,
                            })
                          )
                        );
                        dispatch(setScanMappings(mappings));

                        console.log("✅ Fallback refresh completed");
                      }
                    );
                  }
                }, 1000); // Đợi 1 giây để đảm bảo state đã được cập nhật

                Alert.alert(
                  "Thành công",
                  "Đã đổi mã inventory item thành công!"
                );
              } catch (error) {
                console.error("❌ Error auto-changing inventory item:", error);
                Alert.alert(
                  "Lỗi",
                  "Không thể đổi mã inventory item. Vui lòng thử lại!"
                );
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

  const handleManualChangePress = async () => {
    try {
      console.log(`🔄 Starting manual change for itemId: ${selectedItemCode}`);
      setModalPage("manual_select");

      // Fetch all inventory items for this itemId
      const allItems = await fetchAllInventoryItemsByItemId(selectedItemCode);
      setAllInventoryItems(allItems);
      setManualSearchText("");
    } catch (error) {
      console.error("❌ Error in manual change:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách inventory items");
    }
  };

  // Handle manual item selection - replace the original inventory item ID
  const handleManualItemSelect = (
    selectedItem: InventoryItem,
    originalInventoryItemId: string
  ) => {
    setSelectedManualItem(selectedItem);
    setOriginalItemId(originalInventoryItemId);
    setModalPage("reason_input");
    setChangeReason("");
  };

  // Handle manual change submission
  const handleManualChangeSubmit = async () => {
    if (!selectedManualItem || !originalItemId) {
      Alert.alert("Lỗi", "Vui lòng chọn item để đổi");
      return;
    }

    try {
      setManualChangeLoading(true);

      console.log(
        `🔄 Manual change: ${originalItemId} -> ${selectedManualItem.id}`
      );
      console.log(`📝 Reason: ${changeReason}`);

      // Gọi API để thực hiện manual change
      const result = await changeInventoryItemForExportDetail(
        originalItemId,
        selectedManualItem.id
      );

      if (!result) {
        throw new Error("API call failed");
      }

      console.log("✅ Manual change API response:", result);

      // Update Redux state
      if (selectedExportRequestDetailId) {
        dispatch(
          updateInventoryItemId({
            exportRequestDetailId: selectedExportRequestDetailId.toString(),
            oldInventoryItemId: originalItemId,
            newInventoryItemId: selectedManualItem.id,
          })
        );
      }

      // Refresh data to get updated inventory items
      await refreshInventoryItems();

      // ✅ OPTION: Refresh toàn bộ export request details để đảm bảo sync
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

        console.log("✅ Full refresh after manual change completed");
      });

      Alert.alert("Thành công", "Đã đổi item thành công!");

      // Reset modal state
      setModalPage("main");
      setSelectedManualItem(null);
      setOriginalItemId("");
      setChangeReason("");
    } catch (error) {
      console.error("❌ Error in manual change submission:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Không thể đổi item. Vui lòng thử lại!"
      );
    } finally {
      setManualChangeLoading(false);
    }
  };

  /*
const handleManualChangeSubmit = async () => {
  if (!selectedManualItem || !originalItemId || !changeReason.trim()) {
    Alert.alert("Lỗi", "Vui lòng nhập lý do đổi item");
    return;
  }

  try {
    setManualChangeLoading(true);

    // Gọi API với reason
    const result = await manualChangeInventoryItemWithReason(
      originalItemId, 
      selectedManualItem.id,
      changeReason // ✅ Gửi kèm reason
    );

    if (!result) {
      throw new Error("API call failed");
    }

    // ... rest của code giống như trên
  } catch (error) {
    // ... error handling
  }
};
*/

  const enhancedSearch = (item: InventoryItem, searchText: string): boolean => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase().trim();
    if (!searchLower) return true;

    // Tạo array chứa tất cả text có thể search
    const searchableFields = [
      item.id,
      item.itemId,
      item.storedLocationName,
      item.measurementValue?.toString(),
      itemUnitType,
    ].filter(Boolean); // Loại bỏ null/undefined

    // Tìm kiếm trong từng field
    const directMatch = searchableFields.some((field) =>
      field?.toLowerCase().includes(searchLower)
    );

    // Tìm kiếm trong các phần của ID (split by special characters)
    const idParts = item.id?.toLowerCase().split(/[-_.]/) || [];
    const itemIdParts = item.itemId?.toLowerCase().split(/[-_.]/) || [];
    const allParts = [...idParts, ...itemIdParts];

    const partsMatch = allParts.some(
      (part) => part.includes(searchLower) || searchLower.includes(part)
    );

    // Fuzzy matching cho các trường hợp gõ thiếu
    const fuzzyMatch = searchableFields.some((field) => {
      if (!field) return false;
      const fieldLower = field.toLowerCase();

      // Kiểm tra nếu search text là subsequence của field
      let searchIndex = 0;
      for (
        let i = 0;
        i < fieldLower.length && searchIndex < searchLower.length;
        i++
      ) {
        if (fieldLower[i] === searchLower[searchIndex]) {
          searchIndex++;
        }
      }
      return searchIndex === searchLower.length;
    });

    return directMatch || partsMatch || fuzzyMatch;
  };

  // Updated handle row press to fetch inventory items and item details
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
    setModalPage("main"); // Reset to main page

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

  // Filter inventory items based on search text
  const filteredInventoryItems = selectedInventoryItems.filter((item) =>
    enhancedSearch(item, searchText)
  );

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.inventoryItemContainer}>
      {/* Thông tin item */}
      <View style={styles.inventoryItemRow}>
        <View style={styles.inventoryItemContent}>
          <Text style={styles.inventoryItemId}>{item.id}</Text>
          <Text style={styles.inventoryItemSubtext}>
            Vị trí: {item.storedLocationName}
          </Text>
          {exportRequest?.type === "PRODUCTION" && (
            <Text style={styles.inventoryItemSubtext}>
              Giá trị cần xuất: {item.measurementValue}{" "}
              {itemUnitType || "đơn vị"}
            </Text>
          )}
        </View>

        {/* Status indicator for items being tracked */}
        {item.isTrackingForExport && (
          <View style={styles.trackingStatusContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#28a745" />
            <Text style={styles.trackingStatusText}>Đã quét</Text>
          </View>
        )}
      </View>

      {/* Action buttons row - chỉ hiện khi chưa được track */}
      <View style={styles.actionButtonsRow}>
        {/* Scan QR Button – chỉ hiện nếu KHÔNG tracking */}
        {!item.isTrackingForExport && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              setInventoryModalVisible(false);
              router.push(
                `/export/scan-qr?id=${exportRequest?.exportRequestId}`
              );
            }}
          >
            <Ionicons name="qr-code-outline" size={16} color="white" />
            <Text style={styles.actionButtonText}>Quét QR</Text>
          </TouchableOpacity>
        )}

        {/* Auto-change Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.autoChangeActionButton,
            autoChangeLoading === item.id && styles.actionButtonDisabled,
          ]}
          onPress={() => handleAutoChange(item.id)}
          disabled={autoChangeLoading === item.id}
        >
          {autoChangeLoading === item.id ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={16} color="white" />
              <Text style={styles.actionButtonText}>Đổi tự động</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Manual Change Button */}
        <TouchableOpacity
          style={[styles.actionButton, styles.manualChangeActionButton]}
          onPress={() => {
            setOriginalItemId(item.id);
            handleManualChangePress();
          }}
        >
          <Ionicons name="create-outline" size={16} color="white" />
          <Text style={styles.actionButtonText}>Đổi thủ công</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  const renderManualInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.inventoryItemRow}>
      <View style={styles.inventoryItemContent}>
        <Text style={styles.inventoryItemId}>{item.id}</Text>
        <Text style={styles.inventoryItemSubtext}>
          Vị trí: {item.storedLocationName}
        </Text>
        <Text style={styles.inventoryItemSubtext}>
          Giá trị: {item.measurementValue} {itemUnitType || "đơn vị"}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => handleManualItemSelect(item, originalItemId)}
      >
        <Text style={styles.selectButtonText}>Chọn</Text>
      </TouchableOpacity>
    </View>
  );
  // Modal header with navigation
  const renderModalHeader = () => {
    let title = "";
    switch (modalPage) {
      case "main":
        title = `Danh sách sản phẩm tồn kho (Mã hàng #${selectedItemCode})`;
        break;
      case "manual_select":
        title = `Chọn inventory item (Mã hàng #${selectedItemCode})`;
        break;
      case "reason_input":
        title = "Nhập lý do đổi item";
        break;
    }

    return (
      <View style={styles.modalHeader}>
        {modalPage !== "main" && (
          <TouchableOpacity
            onPress={() => {
              if (modalPage === "manual_select") {
                setModalPage("main");
              } else if (modalPage === "reason_input") {
                setModalPage("manual_select");
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color="#666" />
          </TouchableOpacity>
        )}

        <Text
          style={[styles.modalTitle, modalPage !== "main" && { marginLeft: 8 }]}
        >
          {title}
        </Text>

        <TouchableOpacity
          onPress={() => {
            setInventoryModalVisible(false);
            setModalPage("main");
            setSelectedInventoryItems([]);
            setAllInventoryItems([]);
            setSearchText("");
            setManualSearchText("");
            setItemUnitType("");
            setAutoChangeLoading(null);
            setSelectedManualItem(null);
            setOriginalItemId("");
            setChangeReason("");
          }}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
    );
  };

  // Modal content based on current page
  // Sửa lại function renderModalContent - case 'manual_select'
  const renderModalContent = () => {
    switch (modalPage) {
      case "main":
        return (
          <>
            {/* Search bar for main page
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#666"
                style={styles.searchIcon}
              />
              <RNTextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm inventory items... (VD: CHI-TH-001)"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View> */}

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
          </>
        );

      case "manual_select":
        // ✅ IMPROVED: Enhanced search logic với partial matching
        const filteredAllInventoryItems = allInventoryItems.filter((item) =>
          enhancedSearch(item, manualSearchText)
        );

        return (
          <>
            {/* Search bar for manual selection */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#666"
                style={styles.searchIcon}
              />
              <RNTextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm theo mã, vị trí, giá trị... (VD: CHI-TH-001)"
                value={manualSearchText}
                onChangeText={setManualSearchText}
              />
            </View>

            <View style={styles.itemCountContainer}>
              <Text style={styles.sectionTitle}>
                Tất cả inventory items ({filteredAllInventoryItems.length}/
                {allInventoryItems.length} sản phẩm)
              </Text>
            </View>

            <FlatList
              data={filteredAllInventoryItems}
              renderItem={renderManualInventoryItem}
              keyExtractor={(item) => item.id}
              style={styles.inventoryList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="archive-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>
                    {manualSearchText
                      ? "Không tìm thấy sản phẩm phù hợp"
                      : "Không có sản phẩm"}
                  </Text>
                </View>
              }
            />
          </>
        );

      case "reason_input":
        return (
           <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.reasonInputContainer}>
            <View style={styles.selectedItemInfo}>
              <Text style={styles.selectedItemTitle}>Item được chọn:</Text>
              <Text style={styles.selectedItemId}>
                {selectedManualItem?.id}
              </Text>
              <Text style={styles.selectedItemSubtext}>
                Vị trí: {selectedManualItem?.storedLocationName}
              </Text>
              <Text style={styles.selectedItemSubtext}>
                Giá trị: {selectedManualItem?.measurementValue}{" "}
                {itemUnitType || "đơn vị"}
              </Text>
            </View>

            <View style={styles.reasonInputSection}>
              <Text style={styles.reasonLabel}>Lý do đổi item:</Text>
              <RNTextInput
                style={styles.reasonInput}
                placeholder="Nhập lý do đổi item... (có thể để trống)"
                value={changeReason}
                onChangeText={setChangeReason}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>

            <View style={styles.reasonButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.submitReasonButton,
                  manualChangeLoading && styles.submitReasonButtonDisabled,
                ]}
                onPress={handleManualChangeSubmit}
                disabled={!changeReason.trim() || manualChangeLoading}
              >
                {manualChangeLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.submitReasonButtonText}>
                    Xác nhận đổi
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </TouchableWithoutFeedback>
        );

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
        {/* ✅ Chữ ký ngang hàng */}
        <View style={styles.signatureRowWrapper}>
          {/* Người giao hàng */}
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

          {/* Người nhận hàng */}
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

        {/* Status badge */}
        {/* <View style={styles.completedBadge}>
        <Ionicons name="checkmark-circle" size={20} color="#28a745" />
        <Text style={styles.completedText}>Đơn hàng đã hoàn thành</Text>
      </View> */}
      </View>
    );
  };

  // ✅ Cập nhật actionButtonContainer để có margin phù hợp
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
          {/* Header cố định */}
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

          {/* Scrollable content */}
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

      {/* Updated Inventory Items Modal */}
      {/* Updated Inventory Items Modal with multiple pages */}
      <Modal visible={inventoryModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {renderModalHeader()}
            {renderModalContent()}
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

  // Thêm style mới:
  scrollableTableContent: {
    maxHeight: 450,
    backgroundColor: "white",
  },

  // Cập nhật tableHeader để có border bottom:
  tableHeader: {
    backgroundColor: "#f0f0f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  table: {
    backgroundColor: "white",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
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
  // inventoryItemRow: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   paddingVertical: 12,
  //   paddingHorizontal: 5,
  //   borderBottomWidth: 1,
  //   borderBottomColor: "#f0f0f0",
  //   backgroundColor: "white",
  // },
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
    marginBottom: 35,

    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  // autoChangeButton: {
  //   backgroundColor: "#ff6b35",
  //   flexDirection: "row",
  //   alignItems: "center",
  //   paddingVertical: 8,
  //   paddingHorizontal: 12,
  //   borderRadius: 6,
  //   elevation: 2,
  //   shadowColor: "#000",
  //   shadowOffset: { width: 0, height: 1 },
  //   shadowOpacity: 0.2,
  //   shadowRadius: 2,
  // },
  // autoChangeButtonDisabled: {
  //   backgroundColor: "#ccc",
  //   elevation: 0,
  //   shadowOpacity: 0,
  // },
  // autoChangeButtonText: {
  //   color: "white",
  //   fontSize: 12,
  //   fontWeight: "600",
  //   marginLeft: 4,
  // },
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

  // ✅ Styles mới cho layout ngang
  signatureRowWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12, // Khoảng cách giữa 2 chữ ký
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
    height: 140, // Giảm height từ 200 xuống 140
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

  // ✅ Giữ nguyên completedBadge style
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
  dualButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8, // Khoảng cách giữa 2 nút
  },

  // Nút Scan QR
  // scanQrButton: {
  //   backgroundColor: "#1677ff",
  //   flexDirection: "row",
  //   alignItems: "center",
  //   paddingVertical: 8,
  //   paddingHorizontal: 10,
  //   borderRadius: 6,
  //   elevation: 2,
  //   shadowColor: "#000",
  //   shadowOffset: { width: 0, height: 1 },
  //   shadowOpacity: 0.2,
  //   shadowRadius: 2,
  // },

  scanQrButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },

  // Cập nhật lại autoChangeButton để phù hợp với layout mới
  // autoChangeButton: {
  //   backgroundColor: "#ff6b35",
  //   flexDirection: "row",
  //   alignItems: "center",
  //   paddingVertical: 8,
  //   paddingHorizontal: 10, // Giảm padding để cân đối với nút scan
  //   borderRadius: 6,
  //   elevation: 2,
  //   shadowColor: "#000",
  //   shadowOffset: { width: 0, height: 1 },
  //   shadowOpacity: 0.2,
  //   shadowRadius: 2,
  // },

  // autoChangeButtonDisabled: {
  //   backgroundColor: "#ccc",
  //   elevation: 0,
  //   shadowOpacity: 0,
  // },

  autoChangeButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },

  // Container cho status khi item đang được theo dõi
  // trackingStatusContainer: {
  //   flexDirection: "row",
  //   alignItems: "center",
  //   backgroundColor: "#f0f8f0",
  //   paddingVertical: 6,
  //   paddingHorizontal: 12,
  //   borderRadius: 16,
  //   borderWidth: 1,
  //   borderColor: "#28a745",
  // },

  // trackingStatusText: {
  //   color: "#28a745",
  //   fontSize: 12,
  //   fontWeight: "600",
  //   marginLeft: 4,
  // },
  // Cập nhật dualButtonContainer thành tripleButtonContainer
  tripleButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  scanQrButton: {
    backgroundColor: "#1677ff",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    elevation: 1,
  },

  autoChangeButton: {
    backgroundColor: "#ff6b35",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    elevation: 1,
  },

  autoChangeButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
    shadowOpacity: 0,
  },

  manualChangeButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    elevation: 1,
  },

  buttonText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 3,
  },

  // trackingStatusContainer: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   backgroundColor: '#f0f8f0',
  //   paddingVertical: 6,
  //   paddingHorizontal: 12,
  //   borderRadius: 16,
  //   borderWidth: 1,
  //   borderColor: '#28a745',
  // },

  // trackingStatusText: {
  //   color: '#28a745',
  //   fontSize: 12,
  //   fontWeight: '600',
  //   marginLeft: 4,
  // },

  // New styles for manual change functionality
  manualChangeContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: "center",
  },

  manualChangeHeaderButton: {
    backgroundColor: "#28a745",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    elevation: 2,
  },

  manualChangeHeaderButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },

  backButton: {
    padding: 4,
    marginRight: 8,
  },

  selectButton: {
    backgroundColor: "#1677ff",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },

  selectButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },

  reasonInputContainer: {
    flex: 1,
    padding: 16,
  },

  selectedItemInfo: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },

  selectedItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },

  selectedItemId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1677ff",
    marginBottom: 4,
  },

  selectedItemSubtext: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },

  reasonInputSection: {
    marginBottom: 20,
  },

  reasonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },

  reasonInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: "top",
  },

  reasonButtonContainer: {
    marginTop: "auto",
  },

  submitReasonButton: {
    backgroundColor: "#1677ff",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },

  submitReasonButtonDisabled: {
    backgroundColor: "#ccc",
  },

  submitReasonButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  // Container cho mỗi inventory item (bao gồm info + buttons)
  inventoryItemContainer: {
    backgroundColor: "white",
    marginBottom: 8,
    borderRadius: 8,
    padding: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },

  // Row chứa thông tin item (không thay đổi)
  inventoryItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },

  // Row chứa các action buttons
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 4,
  },

  // Style chung cho các action buttons
  actionButton: {
    flex: 1,
    backgroundColor: "#1677ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 25,
    elevation: 1,
  },

  // Màu riêng cho auto change button
  autoChangeActionButton: {
    backgroundColor: "#ff6b35",
  },

  // Màu riêng cho manual change button
  manualChangeActionButton: {
    backgroundColor: "#28a745",
  },

  // Style khi button bị disable
  actionButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
  },

  // Text trong action buttons
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },

  // Cập nhật lại các styles cũ - xóa những styles không cần thiết
  // Xóa: tripleButtonContainer, scanQrButton, manualChangeButton, buttonText

  // Giữ nguyên trackingStatusContainer và trackingStatusText
  trackingStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f8f0",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#28a745",
    marginLeft: 40,
  },

  trackingStatusText: {
    color: "#28a745",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
});

export default ExportRequestScreen;

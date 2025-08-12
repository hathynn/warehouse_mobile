import React, { useEffect, useState, useRef } from "react";
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
  setPendingModalNavigation,
  setScanMappings,
  updateInventoryItemId,
} from "@/redux/exportRequestDetailSlice";
import { RootState } from "@/redux/store";
import { ExportRequestStatus } from "@/types/exportRequest.type";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StyledButton from "@/components/ui/StyledButton";
import StatusBadge from "@/components/StatusBadge";
import { InventoryItem, InventoryItemStatus } from "@/types/inventoryItem.type";
import InventoryModal from "@/components/InventoryModal"; // Import modal component

interface RouteParams {
  id: string;
  openModal?: string;
  itemCode?: string;
}

let globalPendingItemCode = "";
let globalShouldReopenModal = false;

const ExportRequestScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { id, openModal, itemCode } = route.params as RouteParams;
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

  // Global loading state for data refresh operations
  const [isDataRefreshing, setIsDataRefreshing] = useState(false);
  const [modalReopeningLoading, setModalReopeningLoading] = useState(false);

  // Manual change states
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);
  const [manualSearchText, setManualSearchText] = useState("");
  const [selectedManualItem, setSelectedManualItem] = useState<InventoryItem | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [manualChangeLoading, setManualChangeLoading] = useState(false);
  const [originalItemId, setOriginalItemId] = useState<string>("");
  const modalReopenProcessed = useRef(false);
  const lastReopenTimestamp = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const autoChangeInProgress = useRef(false);

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

  const { loading: loadingDetails, fetchExportRequestDetails, resetTracking } = useExportRequestDetail();

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

  // Cleanup timeout when component unmounts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle modal reopening when returning from QR scan (including QR manual change)
  useEffect(() => {
    if (openModal === 'true' && itemCode && savedExportRequestDetails.length > 0) {
      console.log(`🔍 QR return: Looking for itemCode: ${itemCode}`);
      console.log(`📋 Available details:`, savedExportRequestDetails.map(d => d.itemId));

      // RESET the ref first to allow reprocessing
      modalReopenProcessed.current = false;

      // Set GLOBAL variables before clearing URL
      globalPendingItemCode = itemCode;
      globalShouldReopenModal = true;

      // Clear URL parameters immediately to prevent infinite loop
      router.replace({ pathname: '/export/export-detail/[id]', params: { id: String(id) } });

      // Force trigger modal reopen after brief delay
      setTimeout(() => {
        if (globalShouldReopenModal && globalPendingItemCode && savedExportRequestDetails.length > 0) {
          console.log(`🔄 Force triggering modal reopen for: ${globalPendingItemCode}`);
          handleGlobalModalReopen();
        }
      }, 100);
    }
  }, [openModal, itemCode, id]); // Add id dependency and remove savedExportRequestDetails to prevent infinite loop

  // Handle global variables for modal reopening 
  useEffect(() => {
    // Only trigger if we have global variables set and data is available
    if (!globalShouldReopenModal || !globalPendingItemCode || savedExportRequestDetails.length === 0) {
      return;
    }

    // Early return if already processed to prevent duplicate execution
    if (modalReopenProcessed.current) {
      console.log(`🚫 Modal reopen already processed, skipping`);
      return;
    }

    // Throttle mechanism to prevent rapid successive calls
    const now = Date.now();
    if (now - lastReopenTimestamp.current < 500) {
      console.log(`🚫 Throttled: Too soon since last reopen attempt (${now - lastReopenTimestamp.current}ms)`);
      return;
    }

    // Move the modal reopen logic to a separate function
    handleGlobalModalReopen();
  }, [savedExportRequestDetails]); // Add dependency to trigger when data is available

  // Separate function to handle modal reopening
  const handleGlobalModalReopen = async () => {
    console.log(`🔍 Modal reopen check:`, {
      globalShouldReopenModal,
      globalPendingItemCode,
      exportDetailsLength: savedExportRequestDetails.length,
      modalReopenProcessed: modalReopenProcessed.current,
    });

    if (
      !globalShouldReopenModal ||
      !globalPendingItemCode ||
      savedExportRequestDetails.length === 0 ||
      modalReopenProcessed.current ||
      modalReopeningLoading
    ) {
      return; // Early exit if conditions not met or already loading
    }

    setModalReopeningLoading(true);

    console.log(
      `🔄 ✅ ALL CONDITIONS MET - Attempting to reopen modal for: ${globalPendingItemCode}`
    );

    // Set flag immediately to prevent duplicate execution
    modalReopenProcessed.current = true;
    lastReopenTimestamp.current = Date.now();

    // Find the matching export detail
    const targetDetail = savedExportRequestDetails.find(
      (detail) => detail.itemId === globalPendingItemCode
    );

    if (!targetDetail) {
      console.log(`❌ Could not find detail with itemCode: ${globalPendingItemCode}`);
      // Clear globals if not found
      globalShouldReopenModal = false;
      globalPendingItemCode = "";
      modalReopenProcessed.current = false;
      return;
    }

    try {
      console.log(`✅ Found matching detail, reopening modal:`, targetDetail);
      console.log(`🔄 Setting modal state...`);

      // Use existing data instead of refetching to prevent loops
      setSelectedItemCode(targetDetail.itemId || "");
      setSelectedExportRequestDetailId(Number(targetDetail.id));

      // Fetch and show inventory items
      const inventoryItems = await fetchInventoryItemsByExportRequestDetailId(Number(targetDetail.id));
      setSelectedInventoryItems(inventoryItems);

      // Only open modal if it's not already open to prevent flicker
      if (!inventoryModalVisible) {
        setInventoryModalVisible(true);
      }

      console.log(`✅ Modal reopened successfully`);

      // Clear global variables
      globalShouldReopenModal = false;
      globalPendingItemCode = "";
      setModalReopeningLoading(false);
    } catch (error) {
      console.error(`❌ Error reopening modal:`, error);
      // Clear globals on error too
      globalShouldReopenModal = false;
      globalPendingItemCode = "";
      modalReopenProcessed.current = false;
      setModalReopeningLoading(false);
    }
  };

  if (loadingRequest || loadingDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1677ff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  // Loading overlay component
  const renderLoadingOverlay = () => {
    if (!isDataRefreshing && !modalReopeningLoading) return null;

    return (
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingOverlayContent}>
          <ActivityIndicator size="large" color="#1677ff" />
          <Text style={styles.loadingOverlayText}>
            {modalReopeningLoading ? "Đang mở modal..." : "Đang cập nhật dữ liệu..."}
          </Text>
        </View>
      </View>
    );
  };

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

  // Function to refresh inventory items - removed as unused

  // ✅ NEW: Manual Change Function 1 - Select from list manually
  const handleManualChangePress = async (originalInventoryItemId: string) => {
    try {
      console.log(`🔄 Starting manual change for itemId: ${selectedItemCode}, originalId: ${originalInventoryItemId}`);

      // Set the original item ID for tracking
      setOriginalItemId(originalInventoryItemId);

      // Fetch all inventory items for this item
      const itemDetails = await getItemDetailById(selectedItemCode);
      if (!itemDetails?.inventoryItemIds || itemDetails.inventoryItemIds.length === 0) {
        Alert.alert("Lỗi", "Không tìm thấy inventory items cho item này");
        return;
      }

      console.log(`📦 Found ${itemDetails.inventoryItemIds.length} inventory item IDs`);

      // Fetch detailed inventory items
      const inventoryItems = await Promise.all(
        itemDetails.inventoryItemIds.map(async (inventoryItemId: string) => {
          try {
            return await fetchInventoryItemById(inventoryItemId);
          } catch (error) {
            console.error(`❌ Error fetching inventory item ${inventoryItemId}:`, error);
            return null;
          }
        })
      );

      const validInventoryItems = inventoryItems.filter(item => item !== null);
      setAllInventoryItems(validInventoryItems);
      setManualSearchText("");

    } catch (error) {
      console.error("❌ Error in manual change:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách inventory items");
    }
  };

  // ✅ SIMPLIFIED: Manual Change Function - Submit manual selection
  const handleManualChangeSubmit = async () => {
    if (!selectedManualItem || !originalItemId || !changeReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng chọn item và nhập lý do thay đổi");
      return;
    }

    if (originalItemId === selectedManualItem.id) {
      Alert.alert("Lỗi", "Không thể đổi sang cùng một inventory item!");
      return;
    }

    setManualChangeLoading(true);

    try {
      // Lấy trạng thái tracking của item gốc (để quyết định có reset hay không)
      const originalItem = selectedInventoryItems.find(item => item.id === originalItemId);

      // ✅ 1) RESET TRACKING TRƯỚC
      if (originalItem?.isTrackingForExport && selectedExportRequestDetailId) {
        try {
          const resetPromise = resetTracking(
            selectedExportRequestDetailId.toString(),
            originalItemId
          );
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Reset tracking timeout")), 10000)
          );
          await Promise.race([resetPromise, timeoutPromise]);
          console.log("✅ Reset tracking thành công trước khi đổi (manual)");
        } catch (e) {
          console.error("❌ Reset tracking thất bại/timeout (manual):", e);
          setManualChangeLoading(false);
          Alert.alert("Lỗi", "Không thể huỷ tracking mã cũ. Vui lòng thử lại!");
          return; // ⛔ DỪNG — không tiếp tục đổi
        }
      }

      // ✅ 2) THỰC HIỆN ĐỔI SAU KHI RESET THÀNH CÔNG
      const result = await changeInventoryItemForExportDetail(
        originalItemId,
        selectedManualItem.id,
        changeReason
      );

      if (!result) {
        setManualChangeLoading(false);
        Alert.alert("Lỗi", "Không thể đổi item. Vui lòng thử lại!");
        return;
      }

      console.log("✅ Manual change successful");

      // Update scanMappings with new inventory item ID  
      const updatedScanMappings = scanMappings.map(mapping => {
        if (mapping.inventoryItemId.toUpperCase() === originalItemId.toUpperCase()) {
          return { ...mapping, inventoryItemId: selectedManualItem.id };
        }
        return mapping;
      });
      dispatch(setScanMappings(updatedScanMappings));

      // Reset UI state
      setManualChangeLoading(false);
      setSelectedManualItem(null);
      setChangeReason("");
      setOriginalItemId("");
      setManualSearchText("");
      setAllInventoryItems([]);

      Alert.alert("Thành công", "Đã đổi item thành công!", [{ text: "OK" }]);

      // Refresh dữ liệu + modal
      setIsDataRefreshing(true);
      timeoutRef.current = setTimeout(async () => {
        try {
          const refreshedData = await fetchExportRequestDetails(id, 1, 100);
          const refreshedDetails = refreshedData.map(item => ({
            ...item,
            actualQuantity: item.actualQuantity ?? 0,
            inventoryItemIds: item.inventoryItemIds ?? [],
          }));
          dispatch(setExportRequestDetail(refreshedDetails));

          if (selectedExportRequestDetailId) {
            const inventoryItems = await fetchInventoryItemsByExportRequestDetailId(
              selectedExportRequestDetailId
            );
            setSelectedInventoryItems(inventoryItems);
          }
        } catch (error) {
          console.error("❌ Error refreshing data:", error);
        } finally {
          setIsDataRefreshing(false);
        }
      }, 500) as unknown as NodeJS.Timeout;

    } catch (error) {
      console.error("❌ Error in manual change:", error);
      setManualChangeLoading(false);

      let errorMessage = "Không thể đổi item. Vui lòng thử lại!";
      if (error?.response?.data?.message?.includes("already has an export request detail")) {
        errorMessage = "ID này đã có trong đơn xuất khác, không thể đổi.";
      }
      Alert.alert("Lỗi", errorMessage);
    }
  };




  // Handle auto-change inventory item
  const handleAutoChange = async (inventoryItemId: string) => {
    try {
      if (autoChangeInProgress.current || autoChangeLoading) {
        return;
      }

      autoChangeInProgress.current = true;
      setAutoChangeLoading(inventoryItemId);

      Alert.alert(
        "Xác nhận đổi mã",
        `Bạn có chắc chắn muốn đổi mã inventory item: ${inventoryItemId}?`,
        [
          { text: "Hủy", style: "cancel", onPress: () => { setAutoChangeLoading(null); autoChangeInProgress.current = false; } },
          {
            text: "Đồng ý",
            onPress: async () => {
              try {
                // Lấy item hiện tại để biết đang tracking hay không
                const currentItem = selectedInventoryItems.find(item => item.id === inventoryItemId);

                // ✅ 1) RESET TRACKING TRƯỚC
                if (currentItem?.isTrackingForExport && selectedExportRequestDetailId) {
                  try {
                    const resetPromise = resetTracking(
                      selectedExportRequestDetailId.toString(),
                      inventoryItemId
                    );
                    const timeoutPromise = new Promise((_, reject) =>
                      setTimeout(() => reject(new Error("Reset tracking timeout")), 10000)
                    );
                    await Promise.race([resetPromise, timeoutPromise]);
                    console.log("✅ Reset tracking thành công trước khi auto-change");
                  } catch (e) {
                    console.error("❌ Reset tracking thất bại/timeout (auto):", e);
                    Alert.alert("Lỗi", "Không thể huỷ tracking mã cũ. Vui lòng thử lại!");
                    return; // ⛔ DỪNG — không tiếp tục đổi
                  }
                }

                // ✅ 2) THỰC HIỆN AUTO-CHANGE SAU KHI RESET THÀNH CÔNG
                const result = await autoChangeInventoryItem(inventoryItemId);
                console.log("✅ Auto change thành công:", result);

                // Cập nhật scanMappings nếu có id mới
                if (result?.content?.id) {
                  const newInventoryItemId = result.content.id;
                  const updatedScanMappings = scanMappings.map(mapping => {
                    if (mapping.inventoryItemId.toUpperCase() === inventoryItemId.toUpperCase()) {
                      return { ...mapping, inventoryItemId: newInventoryItemId };
                    }
                    return mapping;
                  });
                  dispatch(setScanMappings(updatedScanMappings));
                }

                // Refresh dữ liệu + modal
                setIsDataRefreshing(true);
                timeoutRef.current = setTimeout(async () => {
                  try {
                    const refreshedData = await fetchExportRequestDetails(id, 1, 100);
                    const refreshedDetails = refreshedData.map(item => ({
                      ...item,
                      actualQuantity: item.actualQuantity ?? 0,
                      inventoryItemIds: item.inventoryItemIds ?? [],
                    }));
                    dispatch(setExportRequestDetail(refreshedDetails));

                    if (inventoryModalVisible && selectedExportRequestDetailId) {
                      const refreshedInventoryItems =
                        await fetchInventoryItemsByExportRequestDetailId(selectedExportRequestDetailId);
                      setSelectedInventoryItems(refreshedInventoryItems);
                    }
                  } catch (error) {
                    console.error("❌ Error refreshing data after auto change:", error);
                  } finally {
                    setIsDataRefreshing(false);
                  }
                }, 500) as unknown as NodeJS.Timeout;

              } catch (error) {
                console.error("❌ Error auto-changing:", error);
                let errorMessage = "Không thể đổi mã inventory item. Vui lòng thử lại!";
                if (error?.response?.data?.message) {
                  errorMessage = `Lỗi: ${error.response.data.message}`;
                }
                Alert.alert("Lỗi", errorMessage);
              } finally {
                setAutoChangeLoading(null);
                autoChangeInProgress.current = false;
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("❌ Error in handleAutoChange:", error);
      setAutoChangeLoading(null);
      autoChangeInProgress.current = false;
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


  // Handle row press to fetch inventory items and item details
  const handleRowPress = async (detail: any) => {
    if (!detail.id) {
      console.error("❌ Export request detail ID not found");
      return;
    }

    // Simple state reset
    setSelectedManualItem(null);
    setChangeReason("");
    setOriginalItemId("");
    setManualSearchText("");
    setAllInventoryItems([]);

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
    setOriginalItemId("");
  };



  const handleQRScanPress = (mode: 'normal' | 'manual_change' = 'normal', originalItemId?: string) => {
    console.log(`🔍 QR Scan pressed for itemCode: ${selectedItemCode}, mode: ${mode}, originalItemId: ${originalItemId}`);
    // Close the modal first
    setInventoryModalVisible(false);

    if (mode === 'manual_change' && originalItemId) {
      // Navigate to QR scan for manual change mode
      router.push({
        pathname: '/export/scan-qr-manual',
        params: {
          id: String(id),
          returnToModal: 'true',
          itemCode: String(selectedItemCode),
          originalItemId: String(originalItemId),
          exportRequestDetailId: String(selectedExportRequestDetailId),
        },
      });

    } else {
      // Navigate to QR scan with normal return parameters
      router.push(
        `/export/scan-qr?id=${id}&returnToModal=true&itemCode=${selectedItemCode}`
      );
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
        <View style={styles.signatureRowWrapper}>
          <View style={styles.signatureItemHorizontal}>
            <Text style={styles.signatureLabelHorizontal}>Người giao hàng</Text>

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
            <Text style={styles.signatureNameHorizontal}>
              {paper?.signProviderName || "Chưa rõ"}
            </Text>
          </View>

          <View style={styles.signatureItemHorizontal}>
            <Text style={styles.signatureLabelHorizontal}>Người nhận hàng</Text>

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
            <Text style={styles.signatureNameHorizontal}>
              {paper?.signReceiverName || "Chưa rõ"}
            </Text>
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
                              // Set pending modal navigation for QR scan from table
                              dispatch(setPendingModalNavigation({
                                exportRequestId: id,
                                itemCode: detail.itemId
                              }));
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
        onQRScanPress={handleQRScanPress}
      />

      {renderLoadingOverlay()}
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
    marginBottom: 10,
  },
  signatureNameHorizontal: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginTop: 10,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  loadingOverlayContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    minWidth: 150,
  },
  loadingOverlayText: {
    marginTop: 12,
    fontSize: 14,
    color: "#333",
    textAlign: "center",
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
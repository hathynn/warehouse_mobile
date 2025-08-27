import React, { useContext, useEffect, useState, useRef } from "react";
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
// InventoryModal import removed - now using ExportInventoryScreen navigation
import { PusherContext } from "@/contexts/pusher/PusherContext";

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

  // Pusher context for real-time updates
  const { latestNotification } = useContext(PusherContext);

  const {
    fetchInventoryItemsByExportRequestDetailId,
    autoChangeInventoryItem,
    fetchInventoryItemByItemId,
    changeInventoryItemForExportDetail,
    fetchInventoryItemById,
    loading: inventoryLoading,
  } = useInventoryService();

  const { getItemDetailById } = useItemService();
  const { getPaperById } = usePaperService();

  // Paper state
  const [paper, setPaper] = useState<any>(null);

  // Modal states
  const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemCode, setSelectedItemCode] = useState("");
  const [selectedExportRequestDetailId, setSelectedExportRequestDetailId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  const [itemUnitType, setItemUnitType] = useState<string>("");

  // Auto-change loading state
  const [autoChangeLoading, setAutoChangeLoading] = useState<string | null>(null);

  // Global loading state for data refresh operations (removed - now handled by Pusher)
  const [modalReopeningLoading, setModalReopeningLoading] = useState(false);

  // Main table loading state
  const [mainTableLoading, setMainTableLoading] = useState(false);

  // Manual change states
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);
  const [manualSearchText, setManualSearchText] = useState("");
  const [selectedManualItem, setSelectedManualItem] = useState<InventoryItem | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [manualChangeLoading, setManualChangeLoading] = useState(false);
  const [originalItemId, setOriginalItemId] = useState<string>("");
  const [manualDataLoading, setManualDataLoading] = useState(false); // Loading khi fetch data để chọn
  // const [modalKey, setModalKey] = useState(0); // Removed - not needed
  const modalReopenProcessed = useRef(false);
  const lastReopenTimestamp = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const autoChangeInProgress = useRef(false);
  const pusherEventReceived = useRef(false); // Track if Pusher event was received

  // For INTERNAL export measurement calculations
  // const [measurementTotals, setMeasurementTotals] = useState<{ [detailId: string]: number }>({});
  const [itemUnits, setItemUnits] = useState<{ [itemId: string]: string }>({});

  // Helper function to calculate total measurement value for a detail's inventory items
  // const calculateTotalMeasurementValue = async (detail: any) => {
  //   console.log(`🔍 INTERNAL - Calculating for detail ${detail.id} with inventoryItemIds:`, detail.inventoryItemIds);

  //   if (!detail.inventoryItemIds || detail.inventoryItemIds.length === 0) {
  //     console.log(`🔍 INTERNAL - Detail ${detail.id} has no inventoryItemIds, returning 0`);
  //     return 0;
  //   }

  //   try {
  //     let total = 0;
  //     for (const inventoryItemId of detail.inventoryItemIds) {
  //       console.log(`🔍 INTERNAL - Fetching inventory item ${inventoryItemId}...`);
  //       const inventoryItem = await fetchInventoryItemById(inventoryItemId);
  //       console.log(`🔍 INTERNAL - Inventory item ${inventoryItemId}:`, {
  //         measurementValue: inventoryItem?.measurementValue,
  //         isTrackingForExport: inventoryItem?.isTrackingForExport,
  //         status: inventoryItem?.status,
  //         id: inventoryItem?.id
  //       });

  //       // For INTERNAL exports, only count items with isTrackingForExport = true
  //       if (inventoryItem && inventoryItem.measurementValue && inventoryItem.isTrackingForExport === true) {
  //         console.log(`✅ INTERNAL - Adding ${inventoryItem.measurementValue} to total`);
  //         total += inventoryItem.measurementValue;
  //       } else {
  //         console.log(`❌ INTERNAL - Skipping item ${inventoryItemId} - measurementValue: ${inventoryItem?.measurementValue}, isTrackingForExport: ${inventoryItem?.isTrackingForExport}`);
  //       }
  //     }
  //     console.log(`🔍 INTERNAL - Final total for detail ${detail.id}: ${total}`);
  //     return total;
  //   } catch (error) {
  //     console.log(`❌ Error calculating measurement total for detail ${detail.id}:`, error);
  //     return 0;
  //   }
  // };

  // Function to calculate measurement totals for all details (for INTERNAL exports)
  // const calculateAllMeasurementTotals = async (details: any[], forceExportType?: string) => {
  //   const currentExportType = forceExportType || exportRequest?.type;
  //   console.log(`📊 INTERNAL - calculateAllMeasurementTotals called with exportRequest.type:`, currentExportType);
  //   console.log(`📊 INTERNAL - Details to process:`, details?.length);

  //   if (currentExportType !== "INTERNAL") {
  //     console.log(`📊 INTERNAL - Not INTERNAL export (${currentExportType}), skipping calculation`);
  //     return;
  //   }

  //   const totals: { [detailId: string]: number } = {};
  //   const units: { [itemId: string]: string } = {};

  //   for (const detail of details) {
  //     console.log(`📊 INTERNAL - Processing detail ${detail.id}...`);

  //     // Get measurement total
  //     const total = await calculateTotalMeasurementValue(detail);
  //     totals[detail.id] = total;
  //     console.log(`📊 INTERNAL - Set total for detail ${detail.id}: ${total}`);

  //     // Get item unit information
  //     try {
  //       const itemInfo = await getItemDetailById(detail.itemId);
  //       if (itemInfo?.measurementUnit) {
  //         units[detail.itemId] = itemInfo.measurementUnit;
  //         console.log(`📊 INTERNAL - Got unit for ${detail.itemId}: ${itemInfo.measurementUnit}`);
  //       } else {
  //         console.log(`📊 INTERNAL - No unit found for ${detail.itemId}`);
  //       }
  //     } catch (error) {
  //       console.log(`❌ INTERNAL - Error getting unit for ${detail.itemId}:`, error);
  //     }
  //   }

  //   console.log(`📊 INTERNAL export - Setting measurement totals:`, totals);
  //   console.log(`📊 INTERNAL export - Setting item units:`, units);
  //   setMeasurementTotals(totals);
  //   setItemUnits(units);
  //   console.log(`📊 INTERNAL export - State updated`);
  // };

  // Function to get item units for INTERNAL exports
  const getItemUnits = async (details: any[]) => {
    const currentExportType = exportRequest?.type;
    if (currentExportType !== "INTERNAL") {
      return;
    }

    const units: { [itemId: string]: string } = {};
    for (const detail of details) {
      try {
        const itemInfo = await getItemDetailById(detail.itemId);
        if (itemInfo?.measurementUnit) {
          units[detail.itemId] = itemInfo.measurementUnit;
        }
      } catch (error) {
        console.log(`❌ Error getting unit for ${detail.itemId}:`, error);
      }
    }
    setItemUnits(units);
  };

  // Helper function to get the expected measurement value for an exportRequestDetail
  const getExpectedMeasurementValue = (detail: any) => {
    if (exportRequest?.type !== "INTERNAL") {
      return detail.quantity; // For non-INTERNAL exports, show normal quantity
    }

    // For INTERNAL exports, show the measurementValue of the exportRequestDetail
    return detail.measurementValue || 0;
  };

  // Helper function to get the actual measurement total for an exportRequestDetail
  const getActualMeasurementTotal = (detail: any) => {
    if (exportRequest?.type !== "INTERNAL") {
      return detail.actualQuantity; // For non-INTERNAL exports, show normal actualQuantity
    }

    // For INTERNAL exports, use actualMeasurementValue from backend
    return detail.actualMeasurementValue || 0;
  };

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

  const { loading: loadingDetails, fetchExportRequestDetails, resetTracking, updateActualQuantity } = useExportRequestDetail();

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

          // Get item units for INTERNAL exports
          getItemUnits(refreshedDetails);

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
      getPaperById(exportRequest.paperId)
        .then((data: any) => {
          console.log("✅ Paper data received:", data);
          setPaper(data);
        })
        .catch((error) => {
          console.log("❌ Lỗi lấy chứng từ:", error);
          setPaper(null);
        });
    }
  }, [exportRequest?.paperId, exportRequest?.status]);

  // Get item units when export request type is loaded
  useEffect(() => {
    if (exportRequest?.type === "INTERNAL" && savedExportRequestDetails?.length > 0) {
      getItemUnits(savedExportRequestDetails);
    }
  }, [exportRequest?.type, savedExportRequestDetails?.length]);

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

  // Pusher real-time updates listener
  useEffect(() => {
    if (!latestNotification) return;

    const { type, data } = latestNotification;
    console.log('📡 Received Pusher notification:', { type, data, currentExportId: id });

    // Check all possible event types that could be related to export request
    const possibleEventTypes = [
      // Export request events
      'export-request-created',
      'export-request-updated',
      'export-request-status-changed',
      'export-request-assigned',
      'export-request-cancelled',
      'export-request-completed',

      // Export request detail events
      'export-request-detail-updated',
      'export-request-detail-quantity-changed',
      'export-request-detail-completed',

      // Inventory item events
      'inventory-item-changed',
      'inventory-item-assigned',
      'inventory-item-scanned',
      'inventory-item-auto-changed',
      'inventory-item-manual-changed',

      // Legacy import order events (might still be relevant)
      'import-order-created',
      'import-order-assigned',
      'import-order-counted',
      'import-order-confirmed',
      'import-order-cancelled',
      'import-order-extended',
      'import-order-completed'
    ];

    if (possibleEventTypes.includes(type)) {
      console.log(`🎯 Processing ${type} event for export ID ${id}:`, data);

      // Try different ways to match the export request ID
      const eventObjectId = data?.objectId;
      const eventId = data?.id;
      const currentId = parseInt(id);

      console.log(`🔍 ID matching check:`, {
        eventObjectId,
        eventId,
        currentId,
        objectIdMatch: eventObjectId === currentId,
        idMatch: eventId === currentId
      });

      // Match by objectId or id (more flexible matching)
      if (eventObjectId === currentId || eventId === currentId) {
        console.log('✅ Event matches current export request - processing...');

        // Mark that Pusher event was received
        pusherEventReceived.current = true;

        // Stop main table loading if it was started
        setMainTableLoading(false);

        // Handle different event types with specific logic
        switch (type) {
          case 'export-request-status-changed':
          case 'export-request-updated':
          case 'export-request-completed':
            console.log('🔄 Refreshing export request data...');
            fetchExportRequestById(id).catch((error) => {
              console.log('❌ Error refreshing export request:', error);
            });
            break;

          case 'inventory-item-changed':
          case 'inventory-item-auto-changed':
          case 'inventory-item-manual-changed':
          case 'inventory-item-scanned':
          case 'export-request-detail-updated':
          case 'export-request-detail-quantity-changed':
            console.log('🔄 Refreshing export request details and inventory...');

            // Refresh export request details
            fetchExportRequestDetails(id, 1, 100).then((newData) => {
              const refreshedDetails = newData.map((item) => ({
                ...item,
                actualQuantity: item.actualQuantity ?? 0,
                inventoryItemIds: item.inventoryItemIds ?? [],
              }));

              dispatch(setExportRequestDetail(refreshedDetails));

              // Get item units for INTERNAL exports
              if (exportRequest?.type === "INTERNAL") {
                getItemUnits(refreshedDetails);
              }

              const mappings = refreshedDetails.flatMap((detail) =>
                (detail.inventoryItemIds ?? []).map((inventoryItemId: string) => ({
                  inventoryItemId: inventoryItemId.trim().toLowerCase(),
                  exportRequestDetailId: detail.id,
                }))
              );
              dispatch(setScanMappings(mappings));

              console.log('✅ Export request details refresh completed');
            }).catch((error) => {
              console.log('❌ Error refreshing export request details:', error);
            });

            // Refresh modal inventory items if modal is currently open
            if (inventoryModalVisible && selectedExportRequestDetailId) {
              console.log('🔄 Refreshing modal inventory items...');
              fetchInventoryItemsByExportRequestDetailId(selectedExportRequestDetailId)
                .then((refreshedItems) => {
                  setSelectedInventoryItems(refreshedItems);
                  console.log('✅ Modal inventory items refreshed, count:', refreshedItems.length);
                })
                .catch((error) => {
                  console.log('❌ Error refreshing modal inventory items:', error);
                });
            }
            break;

          default:
            console.log('🔄 Generic refresh for event type:', type);
            // Generic refresh for other event types
            fetchExportRequestById(id).catch((error) => {
              console.log('❌ Error refreshing export request:', error);
            });
            break;
        }

      } else {
        console.log('⏭️ Event not for this export request, ignoring');
      }
    }

  }, [latestNotification, id, inventoryModalVisible, selectedExportRequestDetailId, fetchExportRequestDetails, fetchExportRequestById, fetchInventoryItemsByExportRequestDetailId, dispatch]);

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
      console.log(`❌ Error reopening modal:`, error);
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
    if (!modalReopeningLoading) return null;

    return (
      <View style={styles.loadingOverlay}>
        <View style={styles.loadingOverlayContent}>
          <ActivityIndicator size="large" color="#1677ff" />
          <Text style={styles.loadingOverlayText}>
            {modalReopeningLoading ? "..." : "Đang cập nhật dữ liệu..."}
          </Text>
        </View>
      </View>
    );
  };

  const handleConfirm = async () => {
    Alert.alert(
      "Xác nhận kiểm đếm",
      "Kiểm đếm đã được ghi nhận và cần được quản lý kho xác nhận. Bạn có chắc chắn muốn xác nhận kết quả kiểm kho bây giờ?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: async () => {
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
              console.log("❌ Lỗi khi xác nhận:", error);
            }
          },
        },
      ]
    );
  };

  // Function to refresh inventory items - removed as unused

  // ✅ NEW: Manual Change Function 1 - Select from list manually
  const handleManualChangePress = async (originalInventoryItemId: string) => {
    try {
      console.log(`🔄 Starting manual change for itemId: ${selectedItemCode}, originalId: ${originalInventoryItemId}`);

      // Set the original item ID for tracking
      setOriginalItemId(originalInventoryItemId);

      // Start loading
      setManualDataLoading(true);

      // Fetch all inventory items for this itemId using the new API
      const allInventoryItemsForItemId = await fetchInventoryItemByItemId(selectedItemCode);

      if (!allInventoryItemsForItemId || allInventoryItemsForItemId.length === 0) {
        Alert.alert("Lỗi", "Không tìm thấy inventory items cho item này");
        return;
      }

      console.log(`📦 Found ${allInventoryItemsForItemId.length} inventory items for itemId: ${selectedItemCode}`);

      // Filter for AVAILABLE status only
      let filteredItems = allInventoryItemsForItemId.filter(item =>
        item.status === 'AVAILABLE'
      );

      console.log(`📦 After AVAILABLE filter: ${filteredItems.length} items`);

      // Additional filtering for SELLING export type: only items with matching measurement value
      if (exportRequest?.type === "SELLING") {
        const itemDetails = await getItemDetailById(selectedItemCode);
        const requiredMeasurementValue = itemDetails?.measurementValue;

        if (requiredMeasurementValue !== undefined) {
          filteredItems = filteredItems.filter(item =>
            item.measurementValue === requiredMeasurementValue
          );
          console.log(`📦 After SELLING measurement filter (${requiredMeasurementValue}): ${filteredItems.length} items`);
        }
      }

      // Convert InventoryItemDetail to InventoryItem format for compatibility
      const convertedItems = filteredItems.map(item => ({
        id: item.id,
        reasonForDisposal: item.reasonForDisposal,
        measurementValue: item.measurementValue,
        status: item.status,
        expiredDate: item.expiredDate,
        importedDate: item.importedDate,
        updatedDate: item.updatedDate,
        parentId: item.parentId ? Number(item.parentId) : null,
        childrenIds: item.childrenIds.map(id => Number(id)),
        itemId: item.itemId,
        itemName: item.itemName,
        itemCode: item.itemCode,
        exportRequestDetailId: item.exportRequestDetailId,
        importOrderDetailId: item.importOrderDetailId || 0,
        storedLocationId: item.storedLocationId,
        storedLocationName: item.storedLocationName,
        isTrackingForExport: item.isTrackingForExport,
      }));

      setAllInventoryItems(convertedItems);
      setManualSearchText("");

      console.log(`✅ Set ${convertedItems.length} filtered inventory items for manual selection`);

    } catch (error) {
      console.log("❌ Error in manual change:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách inventory items");
    } finally {
      // Stop loading
      setManualDataLoading(false);
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
          console.log("❌ Reset tracking thất bại/timeout (manual):", e);
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

      // Success - Reset to modal main screen and refresh data
      console.log('✅ Manual change successful - resetting to modal main screen');

      // Reset manual change UI states (this will make modal return to main screen)
      setManualChangeLoading(false);
      setSelectedManualItem(null);
      setChangeReason("");
      setOriginalItemId("");
      setManualSearchText("");
      setAllInventoryItems([]); // Clear to return to main view

      // Start main table loading for visual feedback
      setMainTableLoading(true);

      // Refresh data with timeout to ensure UI updates first
      setTimeout(async () => {
        try {
          // 1. Refresh main table data
          const refreshedData = await fetchExportRequestDetails(id, 1, 100);
          const refreshedDetails = refreshedData.map(item => ({
            ...item,
            actualQuantity: item.actualQuantity ?? 0,
            inventoryItemIds: item.inventoryItemIds ?? [],
          }));
          dispatch(setExportRequestDetail(refreshedDetails));

          // Get item units for INTERNAL exports
          getItemUnits(refreshedDetails);

          // Update scan mappings
          const mappings = refreshedDetails.flatMap((detail) =>
            (detail.inventoryItemIds ?? []).map((inventoryItemId: string) => ({
              inventoryItemId: inventoryItemId.trim().toLowerCase(),
              exportRequestDetailId: detail.id,
            }))
          );
          dispatch(setScanMappings(mappings));

          // 2. Refresh modal inventory items (modal should be on main screen now)
          if (selectedExportRequestDetailId) {
            const refreshedItems = await fetchInventoryItemsByExportRequestDetailId(selectedExportRequestDetailId);
            setSelectedInventoryItems(refreshedItems);
            console.log('✅ Manual change - Data refreshed, modal on main screen');
          }

        } catch (error) {
          console.log('❌ Manual change - Error refreshing data:', error);
        } finally {
          setMainTableLoading(false);
        }
      }, 100); // Small delay to ensure state updates

    } catch (error) {
      console.log("❌ Error in manual change:", error);
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

                // ✅ 1) THỰC HIỆN AUTO-CHANGE TRƯỚC
                const result = await autoChangeInventoryItem(inventoryItemId);
                console.log("✅ Auto change thành công:", result);

                // ✅ 2) NẾU AUTO-CHANGE THÀNH CÔNG, MỚI RESET TRACKING
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
                    console.log("✅ Reset tracking thành công sau khi auto-change");
                  } catch (e) {
                    console.log("❌ Reset tracking thất bại/timeout sau auto-change:", e);
                    Alert.alert("Cảnh báo", "Auto-change thành công nhưng không thể huỷ tracking mã cũ. Vui lòng kiểm tra lại!");
                  }
                }

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

                // Show success immediately and start loading
                Alert.alert("Thành công", "Đã đổi mã thành công! Dữ liệu đang được cập nhật...", [
                  { text: "OK" }
                ]);

                // Start main table loading
                setMainTableLoading(true);

                // Reset Pusher event flag for this operation
                pusherEventReceived.current = false;

                // Fallback: If no Pusher event received within 1 second, refresh manually
                console.log('⏰ Setting fallback refresh timeout...');
                setTimeout(async () => {
                  // Check if Pusher event was already received
                  if (pusherEventReceived.current) {
                    console.log('⏰ Pusher event already handled, skipping fallback');
                    return;
                  }

                  console.log('⏰ Fallback refresh triggered - no Pusher event received');

                  try {
                    // 1. Refresh main table data (export request details)
                    console.log('⏰ Refreshing main table data...');
                    const refreshedData = await fetchExportRequestDetails(id, 1, 100);
                    const refreshedDetails = refreshedData.map(item => ({
                      ...item,
                      actualQuantity: item.actualQuantity ?? 0,
                      inventoryItemIds: item.inventoryItemIds ?? [],
                    }));
                    dispatch(setExportRequestDetail(refreshedDetails));

                    // Get item units for INTERNAL exports
                    getItemUnits(refreshedDetails);

                    // Update scan mappings
                    const mappings = refreshedDetails.flatMap((detail) =>
                      (detail.inventoryItemIds ?? []).map((inventoryItemId: string) => ({
                        inventoryItemId: inventoryItemId.trim().toLowerCase(),
                        exportRequestDetailId: detail.id,
                      }))
                    );
                    dispatch(setScanMappings(mappings));

                    console.log('⏰ Main table refresh completed');

                    // 2. Refresh modal inventory items (keep modal open)
                    if (inventoryModalVisible && selectedExportRequestDetailId) {
                      const fallbackItems = await fetchInventoryItemsByExportRequestDetailId(selectedExportRequestDetailId);
                      setSelectedInventoryItems(fallbackItems);
                      console.log('⏰ Modal refresh completed, count:', fallbackItems.length);
                    }

                  } catch (error) {
                    console.log('⏰ Fallback refresh failed:', error);
                  } finally {
                    // Stop main table loading
                    setMainTableLoading(false);
                  }
                }, 1000);

              } catch (error) {
                console.log("❌ Error auto-changing:", error);
                let errorMessage = "Không thể đổi mã inventory item. Vui lòng thử lại!";
                const responseMessage = error?.response?.data?.message || error?.message || "";

                if (responseMessage.toLowerCase().includes("no matching inventory item found")) {
                  errorMessage = "Không tìm thấy sản phẩm với giá trị phù hợp";
                  // Call updateActualQuantity with the reset tracking inventoryItemId
                  try {
                    console.log("🔄 Calling updateActualQuantity for no matching inventory item with inventoryItemId:", inventoryItemId);
                    if (selectedExportRequestDetailId) {
                      await updateActualQuantity(selectedExportRequestDetailId.toString(), inventoryItemId);
                    }
                  } catch (updateError) {
                    console.log("❌ Error calling updateActualQuantity for no matching item:", updateError);
                  }
                } else if (responseMessage) {
                  errorMessage = `Lỗi: ${responseMessage}`;
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
      console.log("❌ Error in handleAutoChange:", error);
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


  // Handle row press to navigate to export inventory screen
  const handleRowPress = async (detail: any) => {
    if (!detail.id) {
      console.log("❌ Export request detail ID not found");
      return;
    }

    // Navigate to the new export inventory screen
    router.push({
      pathname: '/export/export-inventory/[id]',
      params: {
        id: detail.id,
        itemCode: detail.itemId || "",
        exportRequestDetailId: detail.id,
        exportRequestId: id, // Truyền thêm exportRequestId để QR scan sử dụng
        exportRequestType: exportRequest?.type || "",
        exportRequestStatus: exportRequest?.status || "",
      },
    });
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
          onPress={() => router.push('/(tabs)/export')}
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
          Thông tin phiếu xuất {id}
        </Text>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin chi tiết phiếu xuất</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Mã phiếu</Text>
            <View style={styles.badgeBlue}>
              <Text style={styles.badgeText}>
                {exportRequest?.exportRequestId}
              </Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Loại xuất</Text>
            <Text style={styles.value}>
              {getExportTypeLabel(exportRequest?.type)}
            </Text>
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







          {exportRequest?.status != ExportRequestStatus.IN_PROGRESS && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Ngày kiểm đếm</Text>
                <Text style={styles.value}>
                  {exportRequest?.countingDate
                    ? new Date(exportRequest?.countingDate).toLocaleString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                    : "--"}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Giờ kiểm đếm</Text>
                <Text style={styles.value}>
                  {exportRequest?.countingTime || "Chưa xác định"}
                </Text>
              </View>
            </>
          )}

          {exportRequest?.status === ExportRequestStatus.WAITING_EXPORT && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Người nhận hàng</Text>
                <Text style={styles.value}>
                  {exportRequest?.receiverName || "Chưa xác định"}
                </Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>SĐT người nhận hàng</Text>
                <Text style={styles.value}>
                  {exportRequest?.receiverPhone || "Chưa xác định"}
                </Text>
              </View>
            </>
          )}


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


            {exportRequest?.type === "INTERNAL" ? (
              <>
                <Text style={[styles.cellAlignRight]}>Cần</Text>
                <Text style={[styles.cellAlignRight]}>Kiểm đếm</Text>
                <Text style={[styles.cellAlignRight]}>Đơn vị</Text>
              </>
            ) : (
              <>
                <Text style={[styles.cellAlignRight]}>Cần</Text>
                <Text style={[styles.cellAlignRight]}>Kiểm đếm</Text>
              </>
            )}

            {[
              ExportRequestStatus.IN_PROGRESS,
              ExportRequestStatus.COUNTED,
            ].includes(exportRequest?.status as ExportRequestStatus) && (
                <Text style={styles.scanHeader}></Text>
              )}
          </View>

          {/* Loading overlay for main table */}
          {mainTableLoading && (
            <View style={styles.tableLoadingOverlay}>
              <ActivityIndicator size="large" color="#1677ff" />
              <Text style={styles.tableLoadingText}>Đang cập nhật dữ liệu...</Text>
            </View>
          )}

          <ScrollView
            style={[
              styles.scrollableTableContent,
              mainTableLoading && { opacity: 0.5 }
            ]}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            scrollEnabled={!mainTableLoading}
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
                      {getExpectedMeasurementValue(detail)}
                    </Text>
                    <Text style={[styles.cellAlignRight]}>
                      {getActualMeasurementTotal(detail)}
                    </Text>
                    {exportRequest?.type === "INTERNAL" && (
                      <Text style={[styles.cellAlignRight]}>
                        {itemUnits[detail.itemId] || ""}
                      </Text>
                    )}

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


      {/* InventoryModal is now replaced with ExportInventoryScreen navigation */}

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
  tableLoadingOverlay: {
    position: "absolute",
    top: 50, // Below header
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  tableLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#1677ff",
    fontWeight: "600",
  },
});

export default ExportRequestScreen;
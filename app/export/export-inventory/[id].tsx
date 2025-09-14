import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput as RNTextInput,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { InventoryItem } from "@/types/inventoryItem.type";
import { RootState } from "@/redux/store";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import { ExportRequestStatus, ExportRequestTypeEnum } from "@/types/exportRequest.type";
import { updateInventoryItemId, setScanMappings, setScannedNewItemForMultiSelect, setMeasurementModalVisible, addScannedItemForModal, removeScannedItemForModal, clearScannedItemsForModal } from "@/redux/exportRequestDetailSlice";

interface RouteParams extends Record<string, string | undefined> {
  id: string;
  itemCode: string;
  exportRequestDetailId: string;
  exportRequestId?: string;
  exportRequestType?: string;
  exportRequestStatus?: string;
  scannedNewItem?: string;
  originalItemId?: string;
  untrackedItemIds?: string;
}

type ScreenPage = "main" | "manual_select" | "reason_input";

// Function to format location string from English to Vietnamese
const formatLocationString = (locationStr: string): string => {
  if (!locationStr) return locationStr;

  return locationStr
    .replace(/Zone:/g, 'Khu:')
    .replace(/Floor:/g, 'Tầng:')
    .replace(/Row:/g, 'Dãy:')
    .replace(/Line:/g, 'Hàng:');
};

const ExportInventoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const params = useLocalSearchParams<RouteParams>();
  const { id, itemCode, exportRequestDetailId, exportRequestId, exportRequestType, exportRequestStatus, scannedNewItem, originalItemId, untrackedItemIds } = params;

  // Debug logging for parameters
  console.log(`📋 ExportInventory params:`, {
    id,
    originalItemId,
    untrackedItemIds,
    scannedNewItem, // Add this to see if it's being received
    itemCode,
    exportRequestDetailId,
    exportRequestId,
    exportRequestType,
    exportRequestStatus
  });

  // Debug INTERNAL multi-selection check
  // console.log(`🔍 INTERNAL check - exportRequestType: "${exportRequestType}", is INTERNAL: ${exportRequestType === "INTERNAL"}`);

  // Get current scan mappings from Redux store for debugging
  const scanMappings = useSelector(
    (state: RootState) => state.exportRequestDetail.scanMappings
  );

  // Get scanned new item for multi-select from Redux
  const scannedNewItemFromRedux = useSelector(
    (state: RootState) => state.exportRequestDetail.scannedNewItemForMultiSelect
  );
  
  // Get scanned items for modal from Redux
  const scannedNewItemsForModalFromRedux = useSelector(
    (state: RootState) => state.exportRequestDetail.scannedItemsForModal
  );

  const [currentPage, setCurrentPage] = useState<ScreenPage>("main");
  const [originalItemIdState, setOriginalItemIdState] = useState<string>("");
  const [showMeasurementWarning, setShowMeasurementWarning] = useState(false);
  const [itemData, setItemData] = useState<any | null>(null);
  const [exportRequestDetailData, setExportRequestDetailData] = useState<any | null>(null);

  // Main screen states
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<InventoryItem[]>([]);
  const [searchText] = useState("");
  const [itemUnitType, setItemUnitType] = useState<string>("");

  // Auto-change loading state
  const [autoChangeLoading, setAutoChangeLoading] = useState<string | null>(null);

  // Manual change states
  const [allInventoryItems, setAllInventoryItems] = useState<InventoryItem[]>([]);
  const [manualSearchText, setManualSearchText] = useState("");
  const [selectedManualItem, setSelectedManualItem] = useState<InventoryItem | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [manualChangeLoading, setManualChangeLoading] = useState(false);
  const [manualDataLoading, setManualDataLoading] = useState(false);

  // INTERNAL export type multi-selection states
  const [selectedOldItems, setSelectedOldItems] = useState<InventoryItem[]>([]);
  const [selectedNewItems, setSelectedNewItems] = useState<InventoryItem[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState<'old' | 'new' | null>(null);
  const [checkAllOldItems, setCheckAllOldItems] = useState(true);
  const [internalManualChangeStep, setInternalManualChangeStep] = useState<'select_old' | 'reason_input'>('select_old');

  // Measurement modal states for INTERNAL QR scan result
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  // Use Redux state instead of local state for scanned items
  const scannedNewItemsForModal = scannedNewItemsForModalFromRedux;
  const [measurementModalReason, setMeasurementModalReason] = useState('');
  
  // Track processed scanned items to avoid re-processing
  const [processedScannedItems, setProcessedScannedItems] = useState<Set<string>>(new Set());

  // Services
  const {
    fetchInventoryItemsByExportRequestDetailId,
    autoChangeInventoryItem,
    fetchInventoryItemByItemId,
    changeInventoryItemForExportDetail,
    changeInventoryItemsForExportDetail,
    fetchInventoryItemById,
    loading: inventoryLoading,
  } = useInventoryService();

  const { getItemDetailById } = useItemService();
  const { fetchExportRequestDetailById, resetTracking, updateActualQuantity } = useExportRequestDetail();

  // Validation function for measurement replacement
  const validateMeasurementForReplacement = async (
    oldItemId: string,
    newItem: InventoryItem,
    exportRequestDetailId: number
  ) => {
    try {
      // Get old item data
      const oldItem = await fetchInventoryItemById(oldItemId);
      if (!oldItem) {
        throw new Error("Không tìm thấy thông tin inventory item cũ");
      }

      // Get all items in the same export request detail
      const allItemsInDetail = await fetchInventoryItemsByExportRequestDetailId(exportRequestDetailId);

      // Calculate total measurement value of other items (excluding old item)
      const otherItemsTotal = allItemsInDetail
        .filter((item: InventoryItem) => item.id !== oldItemId)
        .reduce((sum: number, item: InventoryItem) => sum + (item.measurementValue || 0), 0);

      // Total after change
      const totalAfterChange = (newItem.measurementValue || 0) + otherItemsTotal;

      // Get required value from export request detail
      const exportDetail = await fetchExportRequestDetailById(exportRequestDetailId);
      const requiredValue = exportDetail?.measurementValue || 0;

      return {
        isValid: totalAfterChange >= requiredValue,
        totalAfterChange,
        requiredValue,
        oldItemValue: oldItem.measurementValue || 0,
        newItemValue: newItem.measurementValue || 0
      };
    } catch (error) {
      console.log("❌ Error validating measurement replacement:", error);
      return {
        isValid: true, // Allow if validation fails to avoid blocking legitimate operations
        totalAfterChange: 0,
        requiredValue: 0,
        oldItemValue: 0,
        newItemValue: 0
      };
    }
  };

  // Fetch item data for measurement value display
  useEffect(() => {
    const fetchItemData = async () => {
      if (itemCode) {
        try {
          const itemInfo = await getItemDetailById(itemCode);
          setItemData(itemInfo);
        } catch (error) {
          console.log("Error fetching item data:", error);
          setItemData(null);
        }
      }
    };

    fetchItemData();
  }, [itemCode]);

  // Fetch export request detail data for measurement value display
  useEffect(() => {
    const fetchExportRequestDetailData = async () => {
      if (exportRequestDetailId) {
        try {
          const exportDetailInfo = await fetchExportRequestDetailById(parseInt(exportRequestDetailId));
          setExportRequestDetailData(exportDetailInfo);
        } catch (error) {
          console.log("Error fetching export request detail data:", error);
          setExportRequestDetailData(null);
        }
      }
    };

    fetchExportRequestDetailData();
  }, [exportRequestDetailId]);

  // Handle scanned new item from QR scan using Redux state
  useEffect(() => {
    console.log(`🔍 QR useEffect check - scannedItem: ${scannedNewItemFromRedux}, exportType: ${exportRequestType}, step: ${internalManualChangeStep}`);
    
    if (scannedNewItemFromRedux && 
        exportRequestType === "INTERNAL" && 
        (internalManualChangeStep === 'reason_input' || internalManualChangeStep === 'select_old') &&
        !processedScannedItems.has(scannedNewItemFromRedux)) {
      
      console.log(`📱 Received scanned new item from Redux: ${scannedNewItemFromRedux}`);

      // Mark as processed immediately to prevent re-processing
      setProcessedScannedItems(prev => new Set([...prev, scannedNewItemFromRedux]));

      // Fetch the inventory item details and show measurement modal
      const showMeasurementModalForScannedItem = async () => {
        try {
          const inventoryItem = await fetchInventoryItemById(scannedNewItemFromRedux);
          if (inventoryItem) {
            // ✅ VALIDATION: Check if scanned item has same itemId as selected old items
            if (selectedOldItems.length > 0) {
              const oldItemId = selectedOldItems[0].itemId;
              if (inventoryItem.itemId !== oldItemId) {
                Alert.alert(
                  "Không thể chọn",
                  `Sản phẩm được quét (${inventoryItem.itemCode || inventoryItem.itemId}) không cùng loại với sản phẩm cần thay thế (${selectedOldItems[0].itemCode || oldItemId}). Vui lòng quét sản phẩm cùng loại.`
                );
                // Clear the Redux state
                dispatch(setScannedNewItemForMultiSelect(null));
                return;
              }
              console.log(`✅ INTERNAL QR - ItemId validation passed: ${inventoryItem.itemId} matches ${oldItemId}`);
            }

            console.log(`📊 Adding scanned item to measurement modal: ${scannedNewItemFromRedux}`);

            // Add to scanned items array for modal (avoid duplicates) using Redux
            dispatch(addScannedItemForModal(inventoryItem));
            console.log(`✅ Added to modal items. Total: ${scannedNewItemsForModal.length + 1}`);

            console.log(`📱 Opening measurement modal after QR scan`);
            setShowMeasurementModal(true);
            dispatch(setMeasurementModalVisible(true));
            
            // Play success haptic feedback
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Delay clearing Redux state to ensure component has processed it
            setTimeout(() => {
              dispatch(setScannedNewItemForMultiSelect(null));
            }, 100);
          }
        } catch (error) {
          console.log(`❌ Error fetching scanned item ${scannedNewItemFromRedux}:`, error);
          // Clear the Redux state even on error
          dispatch(setScannedNewItemForMultiSelect(null));
        }
      };

      showMeasurementModalForScannedItem();
    }
  }, [scannedNewItemFromRedux, exportRequestType, internalManualChangeStep, selectedOldItems, processedScannedItems]);

  // Function to refresh inventory data
  const refreshInventoryData = async () => {
    if (!exportRequestDetailId) return;

    try {
      console.log(`🔄 Refreshing inventory items for exportRequestDetailId: ${exportRequestDetailId}`);
      const inventoryItems = await fetchInventoryItemsByExportRequestDetailId(parseInt(exportRequestDetailId));
      setSelectedInventoryItems(inventoryItems);
      console.log(`✅ Refreshed ${inventoryItems.length} inventory items`);
    } catch (error) {
      console.log("❌ Error refreshing inventory data:", error);
    }
  };

  // Function to refresh export request detail data
  const refreshExportRequestDetailData = async () => {
    if (!exportRequestDetailId) return;

    try {
      console.log(`🔄 Refreshing export request detail data for id: ${exportRequestDetailId}`);
      const exportDetailInfo = await fetchExportRequestDetailById(parseInt(exportRequestDetailId));
      setExportRequestDetailData(exportDetailInfo);
      console.log(`✅ Refreshed export request detail data, status: ${exportDetailInfo?.status}`);
    } catch (error) {
      console.log("❌ Error refreshing export request detail data:", error);
    }
  };

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!exportRequestDetailId || !itemCode) return;

      try {
        console.log(`🔍 Fetching inventory items for exportRequestDetailId: ${exportRequestDetailId}`);

        let inventoryItems = await fetchInventoryItemsByExportRequestDetailId(parseInt(exportRequestDetailId));
        
        // INTERNAL_MULTI_SELECT mode: Show all items if untrackedItemIds is provided 
        if (originalItemId === 'INTERNAL_MULTI_SELECT' && untrackedItemIds) {
          const allIds = untrackedItemIds.split(',');
          inventoryItems = inventoryItems.filter((item: any) => allIds.includes(item.id));
          console.log(`📋 INTERNAL_MULTI_SELECT: Filtered to ${inventoryItems.length} items from ${allIds.length} IDs`);
          
          // Trigger the INTERNAL multi-select modal directly with filtered items
          console.log(`🔄 INTERNAL_MULTI_SELECT: Setting up modal with ${inventoryItems.length} items`);
          
          // Convert to InventoryItem format for compatibility
          const convertedItems = inventoryItems.map((item: any) => ({
            id: item.id,
            reasonForDisposal: item.reasonForDisposal,
            measurementValue: item.measurementValue,
            status: item.status,
            expiredDate: item.expiredDate,
            importedDate: item.importedDate,
            updatedDate: item.updatedDate,
            parentId: item.parentId ? Number(item.parentId) : null,
            childrenIds: item.childrenIds?.map((id: any) => Number(id)) || [],
            itemId: item.itemId,
            itemName: item.itemName,
            itemCode: item.itemCode,
            exportRequestDetailId: item.exportRequestDetailId,
            importOrderDetailId: item.importOrderDetailId || 0,
            storedLocationId: item.storedLocationId,
            storedLocationName: item.storedLocationName,
            isTrackingForExport: item.isTrackingForExport,
          }));
          
          // Set up INTERNAL multi-select modal states but keep on main page
          setSelectedOldItems(convertedItems); // Auto-select all items
          setSelectedNewItems([]);
          setInternalManualChangeStep('select_old');
          setMultiSelectMode('old');
          setChangeReason("");
          setCheckAllOldItems(true);
          setAllInventoryItems(convertedItems);
          setManualSearchText("");
          // KEEP on main page: setCurrentPage("main");
          
          // Show measurement modal directly on main page
          setShowMeasurementModal(true);
          dispatch(setMeasurementModalVisible(true));
          
          console.log(`✅ INTERNAL_MULTI_SELECT modal setup complete with ${convertedItems.length} items on main page`);
        }
        
        setSelectedInventoryItems(inventoryItems);
        console.log(`✅ Loaded ${inventoryItems.length} inventory items`);

        console.log(`🔍 Fetching item details for itemId: ${itemCode}`);
        const itemDetails = await getItemDetailById(itemCode);
        if (itemDetails && itemDetails.measurementUnit) {
          setItemUnitType(itemDetails.measurementUnit);
        } else {
          setItemUnitType("đơn vị");
          console.warn("⚠️ Không tìm thấy unitType cho item");
        }
      } catch (error) {
        console.log("❌ Error loading initial data:", error);
        setSelectedInventoryItems([]);
        setItemUnitType("đơn vị");
      }
    };

    loadInitialData();
  }, [exportRequestDetailId, itemCode]);

  const enhancedSearch = (item: InventoryItem, searchText: string): boolean => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase().trim();
    if (!searchLower) return true;

    const searchableFields = [
      item.id,
      item.itemId,
      item.storedLocationName,
      item.measurementValue?.toString(),
      itemUnitType,
    ].filter(Boolean);

    const directMatch = searchableFields.some((field) =>
      field?.toLowerCase().includes(searchLower)
    );

    const idParts = item.id?.toLowerCase().split(/[-_.]/) || [];
    const itemIdParts = item.itemId?.toLowerCase().split(/[-_.]/) || [];
    const allParts = [...idParts, ...itemIdParts];

    const partsMatch = allParts.some(
      (part) => part.includes(searchLower) || searchLower.includes(part)
    );

    const fuzzyMatch = searchableFields.some((field) => {
      if (!field) return false;
      const fieldLower = field.toLowerCase();

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

  // Search function for manual selection - only by measurementValue
  const measurementSearch = (item: InventoryItem, searchText: string): boolean => {
    if (!searchText) return true;

    const searchLower = searchText.toLowerCase().trim();
    if (!searchLower) return true;

    // Only search by measurementValue
    const measurementValueStr = item.measurementValue?.toString() || '';
    return measurementValueStr.toLowerCase().includes(searchLower);
  };

  const filteredInventoryItems = selectedInventoryItems.filter((item) =>
    enhancedSearch(item, searchText)
  );

  const filteredAllInventoryItems = (allInventoryItems || []).filter((item) =>
    measurementSearch(item, manualSearchText || "") &&
    // For manual change mode, only show items with isTrackingForExport = false
    (currentPage !== "manual_select" || !item.isTrackingForExport)
  );
  
  const handleInventoryItemPress = async (item: InventoryItem) => {
    // Only handle tracking products for INTERNAL export type
    if (exportRequestType === "INTERNAL" && item.isTrackingForExport) {
      Alert.alert(
        "Hủy tracking",
        `Bạn có muốn hủy tracking cho sản phẩm ${item.id} không?`,
        [
          {
            text: "Hủy",
            style: "cancel"
          },
          {
            text: "Xác nhận",
            style: "destructive",
            onPress: async () => {
              try {
                const success = await resetTracking(exportRequestDetailId.toString(), item.id);
                if (success) {
                  Alert.alert("Thành công", "Đã hủy tracking cho sản phẩm");
                  // Refresh both inventory data and export request detail data to show updated status
                  await Promise.all([
                    refreshInventoryData(),
                    refreshExportRequestDetailData()
                  ]);
                } else {
                  Alert.alert("Lỗi", "Không thể hủy tracking. Vui lòng thử lại!");
                }
              } catch (error) {
                console.error("Error resetting tracking:", error);
                Alert.alert("Lỗi", "Có lỗi xảy ra khi hủy tracking. Vui lòng thử lại!");
              }
            }
          }
        ]
      );
    }
    // For non-tracked items or non-INTERNAL exports, do nothing (or you could add other logic here)
  };

  const handleManualChangePress = async (originalInventoryItemId: string) => {
    try {
      console.log(`🔄 Starting manual change for itemId: ${itemCode}, originalId: ${originalInventoryItemId}, exportType: ${exportRequestType}`);

      // Check if this is INTERNAL export type for multi-selection flow
      console.log(`🔍 Manual change check - exportRequestType: "${exportRequestType}", comparing with "INTERNAL"`);
      if (exportRequestType === "INTERNAL") {
        console.log(`✅ INTERNAL export type detected - starting multi-selection flow`);
        return handleInternalManualChangePress(originalInventoryItemId);
      }

      // Original flow for other export types (SELLING, etc.)
      console.log(`❌ Non-INTERNAL export type (${exportRequestType}) - using single-selection flow`);

      // Set the original item ID for tracking
      setOriginalItemIdState(originalInventoryItemId);

      // Start loading
      setManualDataLoading(true);

      // Fetch all inventory items for this itemId using the new API
      const allInventoryItemsForItemId = await fetchInventoryItemByItemId(itemCode);

      if (!allInventoryItemsForItemId || allInventoryItemsForItemId.length === 0) {
        Alert.alert("Lỗi", "Không tìm thấy hàng tồn kho cho item này");
        return;
      }

      console.log(`📦 Found ${allInventoryItemsForItemId.length} inventory items for itemId: ${itemCode}`);

      // Filter for AVAILABLE status AND not assigned to other export request details
      let filteredItems = allInventoryItemsForItemId.filter(item =>
        item.status === 'AVAILABLE' &&
        !item.exportRequestDetailId // Chỉ lấy items chưa được assign
      );

      console.log(`📦 After AVAILABLE + unassigned filter: ${filteredItems.length} items`);

      // Additional filtering for SELLING export type: only items with matching measurement value
      if (exportRequestType === "SELLING") {
        const itemDetails = await getItemDetailById(itemCode);
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
      setCurrentPage("manual_select");

      console.log(`✅ Set ${convertedItems.length} filtered inventory items for manual selection`);

    } catch (error) {
      console.log("❌ Error in manual change:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách mã hàng tồn kho");
    } finally {
      // Stop loading
      setManualDataLoading(false);
    }
  };

  // INTERNAL export type multi-selection flow
  const handleInternalManualChangePress = async (originalInventoryItemId: string) => {
    try {
      console.log(`🔄 INTERNAL manual change - starting with originalId: ${originalInventoryItemId}`);

      // Reset multi-selection states
      setSelectedOldItems([]);
      setSelectedNewItems([]);
      setInternalManualChangeStep('select_old');
      setMultiSelectMode('old');
      setChangeReason("");
      setCheckAllOldItems(true);

      // Start loading
      setManualDataLoading(true);

      // Fetch current inventory items in the export request detail
      let currentInventoryItems = await fetchInventoryItemsByExportRequestDetailId(parseInt(exportRequestDetailId!));
      
      // If we have untrackedItemIds, filter to all those items
      if (originalItemId === 'INTERNAL_MULTI_SELECT' && untrackedItemIds) {
        const allIds = untrackedItemIds.split(',');
        currentInventoryItems = currentInventoryItems.filter((item: any) => allIds.includes(item.id));
        console.log(`📋 INTERNAL_MULTI_SELECT manual change: Filtered to ${currentInventoryItems.length} items`);
      }

      // Convert to InventoryItem format for compatibility
      const convertedCurrentItems = currentInventoryItems.map((item: any) => ({
        id: item.id,
        reasonForDisposal: item.reasonForDisposal,
        measurementValue: item.measurementValue,
        status: item.status,
        expiredDate: item.expiredDate,
        importedDate: item.importedDate,
        updatedDate: item.updatedDate,
        parentId: item.parentId ? Number(item.parentId) : null,
        childrenIds: item.childrenIds?.map((id: any) => Number(id)) || [],
        itemId: item.itemId,
        itemName: item.itemName,
        itemCode: item.itemCode,
        exportRequestDetailId: item.exportRequestDetailId,
        importOrderDetailId: item.importOrderDetailId || 0,
        storedLocationId: item.storedLocationId,
        storedLocationName: item.storedLocationName,
        isTrackingForExport: item.isTrackingForExport,
      }));

      setAllInventoryItems(convertedCurrentItems);
      setManualSearchText("");
      setCurrentPage("manual_select");

      // Auto-select all untracked items by default for INTERNAL multi-select
      const untrackedItems = convertedCurrentItems.filter(item => !item.isTrackingForExport);
      setSelectedOldItems(untrackedItems);

      console.log(`✅ INTERNAL manual change - loaded ${convertedCurrentItems.length} current items for old selection`);

    } catch (error) {
      console.log("❌ Error in INTERNAL manual change:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách sản phẩm hiện tại");
    } finally {
      setManualDataLoading(false);
    }
  };

  // Handle item selection for INTERNAL export type multi-selection
  const handleInternalItemSelect = async (item: InventoryItem) => {
    if (multiSelectMode === 'old') {
      // Don't allow selecting tracked items
      if (item.isTrackingForExport) {
        Alert.alert("Thông báo", "Không thể chọn sản phẩm đã được quét");
        return;
      }

      // Selecting old items to replace
      const isAlreadySelected = selectedOldItems.some(selected => selected.id === item.id);

      if (isAlreadySelected) {
        // Remove from selection
        setSelectedOldItems(prev => prev.filter(selected => selected.id !== item.id));
        // If removing items, update checkAll state
        if (selectedOldItems.length - 1 < filteredAllInventoryItems.length) {
          setCheckAllOldItems(false);
        }
        console.log(`🔄 INTERNAL - Removed old item from selection: ${item.id}`);
      } else {
        // Add to selection
        setSelectedOldItems(prev => {
          const newSelection = [...prev, item];
          // If all items are selected, update checkAll state
          if (newSelection.length === filteredAllInventoryItems.length) {
            setCheckAllOldItems(true);
          }
          return newSelection;
        });
        console.log(`🔄 INTERNAL - Added old item to selection: ${item.id}`);
      }
    }
  };

  // Handle step transitions for INTERNAL export type
  const handleInternalStepTransition = async () => {
    if (internalManualChangeStep === 'select_old') {
      if (selectedOldItems.length === 0) {
        Alert.alert("Lỗi", "Vui lòng chọn ít nhất một sản phẩm cần thay đổi để thay đổi");
        return;
      }

      console.log(`🔄 INTERNAL - Moving to select_new step with ${selectedOldItems.length} old items selected`);

      // Load available items for replacement
      setManualDataLoading(true);
      try {
        const allInventoryItemsForItemId = await fetchInventoryItemByItemId(itemCode);

        // Filter for AVAILABLE status AND not assigned to other export request details
        const filteredItems = allInventoryItemsForItemId.filter(item =>
          item.status === 'AVAILABLE' &&
          !item.exportRequestDetailId
        );

        // Convert to InventoryItem format
        const convertedItems = filteredItems.map(item => ({
          id: item.id,
          reasonForDisposal: item.reasonForDisposal,
          measurementValue: item.measurementValue,
          status: item.status,
          expiredDate: item.expiredDate,
          importedDate: item.importedDate,
          updatedDate: item.updatedDate,
          parentId: item.parentId ? Number(item.parentId) : null,
          childrenIds: item.childrenIds?.map((id: any) => Number(id)) || [],
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

        // Check all untracked items by default
        if (checkAllOldItems) {
          const untrackedItems = convertedItems.filter(item => !item.isTrackingForExport);
          setSelectedOldItems(untrackedItems);
        }

        // Skip select_new step, go directly to reason_input
        setInternalManualChangeStep('reason_input');
        setCurrentPage('reason_input');
        setMultiSelectMode(null);

        console.log(`✅ INTERNAL - Loaded ${convertedItems.length} available items for new selection`);

      } catch (error) {
        console.log("❌ Error loading available items:", error);
        Alert.alert("Lỗi", "Không thể tải danh sách sản phẩm khả dụng");
      } finally {
        setManualDataLoading(false);
      }
    }
  };

  // Handle submission for INTERNAL export type multi-selection
  const handleInternalManualChangeSubmit = async () => {
    if (!changeReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do thay đổi");
      return;
    }

    if (selectedOldItems.length === 0 || selectedNewItems.length === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn sản phẩm cần thay đổi và sản muốn thay đổi");
      return;
    }

    setManualChangeLoading(true);

    try {
      console.log(`🔄 INTERNAL manual change submission:`, {
        oldItems: selectedOldItems.map(item => item.id),
        newItems: selectedNewItems.map(item => item.id),
        reason: changeReason.trim()
      });

      // ✅ 1) RESET TRACKING CHO TẤT CẢ OLD ITEMS TRƯỚC KHI CHANGE
      const itemsWereTracking: { [itemId: string]: boolean } = {};

      for (const oldItem of selectedOldItems) {
        if (oldItem.isTrackingForExport && exportRequestDetailId) {
          try {
            // console.log(`🔄 INTERNAL - Reset tracking trước khi manual change cho item: ${oldItem.id}`);
            itemsWereTracking[oldItem.id] = true; // Lưu trạng thái tracking

            const ok = await resetTracking(exportRequestDetailId.toString(), oldItem.id);
            if (!ok) {
              throw new Error(`Reset tracking returned false for item ${oldItem.id}`);
            }
            // console.log(`✅ INTERNAL - Reset tracking successful for: ${oldItem.id}`);
          } catch (e: any) {
            const errorMsg = e?.response?.data?.message || e?.message || 'Unknown error';
            console.log(`❌ INTERNAL - Reset tracking error for ${oldItem.id}: ${errorMsg}`);

            // If error indicates item is not being tracked, it's actually okay
            if (errorMsg.includes('is not being tracked') ||
              errorMsg.includes('not stable for export') ||
              errorMsg.includes('is not stable for export request detail')) {
              // console.log(`ℹ️ INTERNAL - Item ${oldItem.id} already not associated with export request detail, considering as success`);
              continue;
            }

            throw new Error(`Không thể reset tracking cho item ${oldItem.id}. ${errorMsg}`);
          }
        } else {
          // console.log(`ℹ️ INTERNAL - Item ${oldItem.id} is not being tracked, skipping reset`);
          itemsWereTracking[oldItem.id] = false;
        }
      }

      // ✅ 2) SAU KHI RESET TRACKING THÀNH CÔNG, MỚI THỰC HIỆN MANUAL CHANGE
      let manualChangeResult: any;
      try {
        manualChangeResult = await changeInventoryItemsForExportDetail(
          selectedOldItems.map(item => item.id),
          selectedNewItems.map(item => item.id),
          changeReason.trim()
        );

        if (!manualChangeResult) {
          throw new Error("API call returned null/undefined");
        }

        console.log("✅ INTERNAL manual change API successful");
      } catch (changeError) {
        // ❌ Nếu manual change thất bại sau khi đã reset tracking, khôi phục tracking cho các items đã bị reset
        // console.log("🔄 INTERNAL manual change thất bại, đang khôi phục tracking...");

        for (const oldItem of selectedOldItems) {
          if (itemsWereTracking[oldItem.id] && exportRequestDetailId) {
            try {
              await updateActualQuantity(exportRequestDetailId.toString(), oldItem.id);
              console.log(`✅ INTERNAL - Đã khôi phục tracking cho item: ${oldItem.id}`);
            } catch (updateError) {
              console.log(`❌ INTERNAL - Không thể khôi phục tracking cho item ${oldItem.id}:`, updateError);
            }
          }
        }

        throw changeError; // Re-throw để xử lý lỗi bình thường
      }

      // Update scan mappings for all changed items
      if (exportRequestDetailId && selectedNewItems.length > 0) {
        // console.log(`🔄 INTERNAL - Updating scan mappings for ${selectedOldItems.length} old → ${selectedNewItems.length} new items`);

        // For each old item, try to find existing mapping and update it
        for (let i = 0; i < selectedOldItems.length; i++) {
          const oldItem = selectedOldItems[i];
          const newItem = selectedNewItems[i] || selectedNewItems[0]; // Use first new item if not enough new items

          const existingMapping = scanMappings.find(
            mapping => mapping.exportRequestDetailId.toString() === exportRequestDetailId.toString() &&
              mapping.inventoryItemId.toLowerCase() === oldItem.id.toLowerCase()
          );

          if (existingMapping) {
            dispatch(updateInventoryItemId({
              exportRequestDetailId: exportRequestDetailId,
              oldInventoryItemId: oldItem.id,
              newInventoryItemId: newItem.id
            }));
            // console.log(`✅ INTERNAL - Updated scan mapping ${i + 1}: ${oldItem.id} → ${newItem.id}`);
          } else {
            // console.log(`ℹ️ INTERNAL - No existing mapping found for old item: ${oldItem.id}`);
          }
        }
      }

      // Reset states and return to main screen
      setSelectedOldItems([]);
      setSelectedNewItems([]);
      setInternalManualChangeStep('select_old');
      setMultiSelectMode(null);
      setChangeReason("");
      setAllInventoryItems([]);
      setCurrentPage("main");
      setManualChangeLoading(false);

      // Refresh data
      await refreshInventoryData();

      Alert.alert("Thành công", `Đã thay đổi ${selectedOldItems.length} sản phẩm thành ${selectedNewItems.length} sản phẩm mới!`);

    } catch (error: any) {
      console.log("❌ INTERNAL manual change error:", error);
      setManualChangeLoading(false);

      const message = error?.response?.data?.message || error?.message || "Lỗi không xác định";
      Alert.alert("Lỗi", `Lỗi thay đổi sản phẩm: ${message}`);
    }
  };

  const handleManualItemSelect = async (item: InventoryItem) => {
    // Check if this is INTERNAL export type with multi-selection mode
    if (exportRequestType === "INTERNAL" && multiSelectMode) {
      return handleInternalItemSelect(item);
    }

    // ✅ VALIDATION: Check if new item has same itemId as original item + measurement validation
    if (originalItemId) {
      try {
        const originalItem = await fetchInventoryItemById(originalItemId);

        // ✅ 1) Check itemId matching first
        if (originalItem && originalItem.itemId !== item.itemId) {
          Alert.alert(
            "Không thể chọn",
            `Sản phẩm được chọn (${item.itemCode || item.itemId}) không cùng loại với sản phẩm gốc (${originalItem.itemCode || originalItem.itemId}). Vui lòng chọn sản phẩm cùng loại.`
          );
          return; // Stop processing and don't select the item
        }
        console.log(`✅ ItemId validation passed: ${item.itemId} matches ${originalItem.itemId}`);

        // ✅ 2) Removed measurement validation - allow all measurement values

      } catch (error) {
        console.log("❌ Error validating original item:", error);
        Alert.alert("Lỗi", "Không thể xác thực sản phẩm. Vui lòng thử lại!");
        return;
      }
    }

    setSelectedManualItem(item);
    setCurrentPage("reason_input");
  };

  // Function to check measurement warning before manual change submit
  const handleManualChangeSubmit = async () => {
    // Removed measurement warning - allow all measurement values

    // If no measurement issues or not INTERNAL type, proceed directly
    submitManualChange();
  };

  const submitManualChange = async () => {
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
      // ✅ 1) RESET TRACKING TRƯỚC KHI ĐỔI - giống như QR manual change
      let wasTrackingBeforeReset = false;

      if (exportRequestDetailId && originalItemId) {
        try {
          // console.log(`🔄 ExportInventory - Reset tracking trước khi manual change cho item: ${originalItemId}`);
          const originalInventoryItemData = await fetchInventoryItemById(originalItemId);
          wasTrackingBeforeReset = !!originalInventoryItemData?.isTrackingForExport;

          if (originalInventoryItemData?.isTrackingForExport) {
            const ok = await resetTracking(exportRequestDetailId.toString(), originalItemId);
            if (!ok) throw new Error("Không thể reset tracking cho item cũ");
            // console.log(`✅ ExportInventory - Reset tracking successful for: ${originalItemId}`);
          } else {
            // console.log(`ℹ️ ExportInventory - ${originalItemId} không tracking, bỏ qua reset`);
          }
        } catch (e) {
          console.log("❌ ExportInventory - Reset tracking error:", e);
          setManualChangeLoading(false);
          Alert.alert("Lỗi", "Không thể huỷ tracking mã cũ. Vui lòng thử lại!");
          return;
        }
      } else {
        console.warn("ℹ️ ExportInventory - Thiếu exportRequestDetailId hoặc originalItemId — bỏ qua resetTracking");
      }

      // ✅ 2) SAU KHI RESET TRACKING THÀNH CÔNG, MỚI THỰC HIỆN MANUAL CHANGE
      let manualChangeResult: any;

      try {
        manualChangeResult = await changeInventoryItemForExportDetail(
          originalItemId,
          selectedManualItem.id,
          changeReason
        );

        if (!manualChangeResult) {
          throw new Error("API trả về null/undefined");
        }
      } catch (manualChangeError) {
        // ❌ Nếu manual change thất bại sau khi đã reset tracking, gọi lại updateActualQuantity để khôi phục
        if (wasTrackingBeforeReset && exportRequestDetailId && originalItemId) {
          // console.log("🔄 Manual change thất bại, đang khôi phục tracking bằng updateActualQuantity...");
          try {
            await updateActualQuantity(exportRequestDetailId.toString(), originalItemId);
            console.log("✅ Đã khôi phục tracking thành công sau lỗi manual change");
          } catch (updateError) {
            console.log("❌ Không thể khôi phục tracking sau lỗi manual change:", updateError);
          }
        }

        setManualChangeLoading(false);
        Alert.alert("Lỗi", "Không thể đổi item. Vui lòng thử lại!");
        return;
      }

      console.log("✅ Manual change successful");

      // ✅ CẬP NHẬT SCAN MAPPING VỚI ITEM MỚI (giống auto-change)
      if (selectedManualItem?.id && exportRequestDetailId && originalItemId) {
        const newInventoryItemId = selectedManualItem.id;
        // console.log(`🔄 Manual change - Cập nhật scan mapping: ${originalItemId} → ${newInventoryItemId}`);
        // console.log(`🔍 Manual change - exportRequestDetailId: ${exportRequestDetailId}`);
        // console.log(`🔍 Manual change - Current scan mappings:`, JSON.stringify(scanMappings, null, 2));

        // Tìm mapping hiện tại
        const existingMapping = scanMappings.find(
          mapping => mapping.exportRequestDetailId.toString() === exportRequestDetailId.toString() &&
            mapping.inventoryItemId.toLowerCase() === originalItemId.toLowerCase()
        );
        // console.log(`🔍 Manual change - Existing mapping found:`, existingMapping);

        if (existingMapping) {
          // Cập nhật mapping hiện tại
          dispatch(updateInventoryItemId({
            exportRequestDetailId: exportRequestDetailId,
            oldInventoryItemId: originalItemId,
            newInventoryItemId: newInventoryItemId
          }));
          console.log("✅ Manual change - Đã cập nhật scan mapping hiện tại");
        } else {
          // Tạo mapping mới nếu chưa có
          const newMappings = [
            ...scanMappings,
            {
              exportRequestDetailId: exportRequestDetailId,
              inventoryItemId: newInventoryItemId.toLowerCase()
            }
          ];
          dispatch(setScanMappings(newMappings));
          console.log("✅ Manual change - Đã tạo scan mapping mới");
        }
      }

      // Reset manual change states and go back to main screen
      setSelectedManualItem(null);
      setChangeReason("");
      setOriginalItemIdState("");
      setManualSearchText("");
      setAllInventoryItems([]);
      setCurrentPage("main");
      setManualChangeLoading(false);

      // Refresh data on current screen
      await refreshInventoryData();

      Alert.alert("Thành công", "Đã đổi sản phẩm thành công!");

    } catch (error: any) {
      console.log("❌ Error in manual change:", error);
      setManualChangeLoading(false);

      let errorMessage = "Không thể đổi item. Vui lòng thử lại!";
      const responseMessage = error?.response?.data?.message || "";

      if (responseMessage.includes("is already assigned")) {
        errorMessage = "Sản phẩm tồn kho này đã được assign cho đơn xuất khác. Vui lòng chọn sản phẩm khác!";
      } else if (responseMessage.includes("already has an export request detail")) {
        errorMessage = "ID này đã có trong đơn xuất khác, không thể đổi.";
      } else if (responseMessage) {
        errorMessage = `Lỗi: ${responseMessage}`;
      }

      Alert.alert("Lỗi", errorMessage);
    }
  };

  // Handle warning confirmation
  const handleMeasurementWarningConfirm = async () => {
    setShowMeasurementWarning(false);
    submitManualChange();
  };

  // Handle warning cancel
  const handleMeasurementWarningCancel = () => {
    setShowMeasurementWarning(false);
  };

  // Handle measurement modal confirmation
  const handleMeasurementModalConfirm = async () => {
    if (!measurementModalReason.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập lý do thay đổi");
      return;
    }

    if (selectedOldItems.length === 0 || scannedNewItemsForModal.length === 0) {
      Alert.alert("Lỗi", "Vui lòng chọn sản phẩm cũ và quét ít nhất một sản phẩm mới");
      return;
    }

    // Skip measurement value validation for INTERNAL exports
    proceedWithMeasurementModalChange();
  };

  // Extracted function to proceed with the measurement modal change
  const proceedWithMeasurementModalChange = async () => {
    setManualChangeLoading(true);

    try {
      // console.log(`🔄 INTERNAL measurement modal - submitting with:`, {
      //   oldItems: selectedOldItems.map(item => item.id),
      //   newItems: scannedNewItemsForModal.map(item => item.id),
      //   reason: measurementModalReason.trim()
      // });

      // ✅ 1) RESET TRACKING CHO TẤT CẢ OLD ITEMS TRƯỚC KHI CHANGE
      const itemsWereTracking: { [itemId: string]: boolean } = {};

      for (const oldItem of selectedOldItems) {
        if (oldItem.isTrackingForExport && exportRequestDetailId) {
          try {
            // console.log(`🔄 INTERNAL - Reset tracking trước khi change cho item: ${oldItem.id}`);
            itemsWereTracking[oldItem.id] = true; // Lưu trạng thái tracking

            const ok = await resetTracking(exportRequestDetailId.toString(), oldItem.id);
            if (!ok) {
              throw new Error(`Reset tracking returned false for item ${oldItem.id}`);
            }
            // console.log(`✅ INTERNAL - Reset tracking successful for: ${oldItem.id}`);
          } catch (e: any) {
            const errorMsg = e?.response?.data?.message || e?.message || 'Unknown error';
            console.log(`❌ INTERNAL - Reset tracking error for ${oldItem.id}: ${errorMsg}`);

            // If error indicates item is not being tracked, it's actually okay
            if (errorMsg.includes('is not being tracked') ||
              errorMsg.includes('not stable for export') ||
              errorMsg.includes('is not stable for export request detail')) {
              // console.log(`ℹ️ INTERNAL - Item ${oldItem.id} already not associated with export request detail, considering as success`);
              continue;
            }

            throw new Error(`Không thể reset tracking cho item ${oldItem.id}. ${errorMsg}`);
          }
        } else {
          // console.log(`ℹ️ INTERNAL - Item ${oldItem.id} is not being tracked, skipping reset`);
          itemsWereTracking[oldItem.id] = false;
        }
      }

      // ✅ 2) SAU KHI RESET TRACKING THÀNH CÔNG, MỚI THỰC HIỆN CHANGE
      let changeResult: any;
      try {
        changeResult = await changeInventoryItemsForExportDetail(
          selectedOldItems.map(item => item.id),
          scannedNewItemsForModal.map(item => item.id), // Array of scanned items
          measurementModalReason.trim()
        );

        if (!changeResult) {
          throw new Error("API call returned null/undefined");
        }

        console.log("✅ INTERNAL measurement modal - API change successful");

        // ✅ 3) SAU KHI CHANGE THÀNH CÔNG, GỌI updateActualQuantity CHO CÁC NEW INVENTORY ITEMS
        if (exportRequestDetailId && scannedNewItemsForModal.length > 0) {
          console.log(`🔄 INTERNAL - Calling updateActualQuantity for ${scannedNewItemsForModal.length} new items...`);

          for (const newItem of scannedNewItemsForModal) {
            try {
              await updateActualQuantity(exportRequestDetailId.toString(), newItem.id);
              console.log(`✅ INTERNAL - Updated actualQuantity for new item: ${newItem.id}`);
            } catch (updateError) {
              console.log(`❌ INTERNAL - Failed to update actualQuantity for new item ${newItem.id}:`, updateError);
              // Continue với các items khác thay vì throw error
            }
          }
        }

      } catch (changeError) {
        // ❌ Nếu change thất bại sau khi đã reset tracking, khôi phục tracking cho các items đã bị reset
        // console.log("🔄 INTERNAL change thất bại, đang khôi phục tracking...");

        for (const oldItem of selectedOldItems) {
          if (itemsWereTracking[oldItem.id] && exportRequestDetailId) {
            try {
              await updateActualQuantity(exportRequestDetailId.toString(), oldItem.id);
              console.log(`✅ INTERNAL - Đã khôi phục tracking cho item: ${oldItem.id}`);
            } catch (updateError) {
              console.log(`❌ INTERNAL - Không thể khôi phục tracking cho item ${oldItem.id}:`, updateError);
            }
          }
        }

        throw changeError; // Re-throw để xử lý lỗi bình thường
      }

      // Update scan mappings for all changed items
      if (exportRequestDetailId && scannedNewItemsForModal.length > 0) {
        // console.log(`🔄 INTERNAL - Updating scan mappings for ${selectedOldItems.length} old → ${scannedNewItemsForModal.length} new items`);

        // For each old item, try to find existing mapping and update it
        for (let i = 0; i < selectedOldItems.length; i++) {
          const oldItem = selectedOldItems[i];
          const newItem = scannedNewItemsForModal[i] || scannedNewItemsForModal[0]; // Use first new item if not enough new items

          const existingMapping = scanMappings.find(
            mapping => mapping.exportRequestDetailId.toString() === exportRequestDetailId.toString() &&
              mapping.inventoryItemId.toLowerCase() === oldItem.id.toLowerCase()
          );

          if (existingMapping) {
            dispatch(updateInventoryItemId({
              exportRequestDetailId: exportRequestDetailId,
              oldInventoryItemId: oldItem.id,
              newInventoryItemId: newItem.id
            }));
            // console.log(`✅ INTERNAL - Updated scan mapping ${i + 1}: ${oldItem.id} → ${newItem.id}`);
          } else {
            // console.log(`ℹ️ INTERNAL - No existing mapping found for old item: ${oldItem.id}`);
          }
        }
      }

      // Reset states and return to main screen
      setShowMeasurementModal(false);
      dispatch(setMeasurementModalVisible(false));
      dispatch(clearScannedItemsForModal());
      setMeasurementModalReason('');
      setSelectedOldItems([]);
      setSelectedNewItems([]);
      setInternalManualChangeStep('select_old');
      setMultiSelectMode(null);
      setChangeReason("");
      setAllInventoryItems([]);
      setCurrentPage("main");
      setManualChangeLoading(false);

      // Refresh data
      await refreshInventoryData();

      Alert.alert("Thành công", `Đã thay đổi ${selectedOldItems.length} sản phẩm cũ thành ${scannedNewItemsForModal.length} sản phẩm mới thành công!`);

    } catch (error: any) {
      console.log("❌ INTERNAL measurement modal error:", error);
      setManualChangeLoading(false);

      const message = error?.response?.data?.message || error?.message || "Lỗi không xác định";
      Alert.alert("Lỗi", `Lỗi thay đổi sản phẩm: ${message}`);
    }
  };

  // Handle measurement modal cancel
  const handleMeasurementModalCancel = () => {
    setShowMeasurementModal(false);
    dispatch(setMeasurementModalVisible(false));
    dispatch(clearScannedItemsForModal());
    setMeasurementModalReason('');
    
    // Reset INTERNAL states
    setSelectedOldItems([]);
    setSelectedNewItems([]);
    setMultiSelectMode(null);
    setInternalManualChangeStep('select_old');
    setAllInventoryItems([]);
    
    // Clear Redux state to prevent re-triggering
    dispatch(setScannedNewItemForMultiSelect(null));
  };

  // Handle continue scanning for more new items
  const handleContinueScanning = () => {
    console.log(`🔄 Continue scanning - keeping modal with ${scannedNewItemsForModal.length} items`);
    
    // Temporarily close modal to reset Redux state, then navigate to QR scan
    console.log(`📱 Closing measurement modal to enable QR scanning`);
    setShowMeasurementModal(false);
    dispatch(setMeasurementModalVisible(false));
    
    // Small delay to ensure Redux state is updated, then navigate
    setTimeout(() => {
      console.log(`📱 Navigating to QR scan after modal closed`);
      handleQRScanForInternalReplacement();
    }, 300);
  };

  // Handle removing a scanned item from the modal
  const handleRemoveScannedItem = (itemId: string) => {
    dispatch(removeScannedItemForModal(itemId));
    console.log(`🗑️ Removed item ${itemId} from modal. Remaining: ${scannedNewItemsForModal.length - 1}`);
  };

  // Handle removing an old item from the list
  const handleRemoveOldItem = (itemId: string) => {
    // Remove from allInventoryItems and update checkAll state in the same function
    setAllInventoryItems(prevItems => {
      const updatedItems = prevItems.filter(item => item.id !== itemId);
      console.log(`🗑️ Removed old item ${itemId} from list. Remaining: ${updatedItems.length}`);
      
      // Update checkAll state based on new counts
      setSelectedOldItems(prevSelected => {
        const updatedSelected = prevSelected.filter(item => item.id !== itemId);
        console.log(`🗑️ Removed old item ${itemId} from selection. Remaining selected: ${updatedSelected.length}`);
        
        // Update checkAll state with the new counts
        setCheckAllOldItems(updatedSelected.length === updatedItems.length && updatedItems.length > 0);
        
        return updatedSelected;
      });
      
      return updatedItems;
    });
  };

  // Handle auto-change inventory item
  const handleAutoChange = async (inventoryItemId: string) => {
    setAutoChangeLoading(inventoryItemId);

    Alert.alert(
      "Xác nhận đổi mã",
      `Bạn có chắc chắn muốn đổi mã inventory item: ${inventoryItemId}?`,
      [
        {
          text: "Hủy",
          style: "cancel",
          onPress: () => setAutoChangeLoading(null)
        },
        {
          text: "Đồng ý",
          onPress: async () => {
            try {
              // Lấy item hiện tại để biết đang tracking hay không
              const currentItem = selectedInventoryItems.find(item => item.id === inventoryItemId);

              // ✅ 1) NẾU ITEM ĐANG TRACKING, RESET TRACKING TRƯỚC KHI AUTO-CHANGE
              if (currentItem?.isTrackingForExport && exportRequestDetailId) {
                try {
                  // console.log(`🔄 Reset tracking trước khi auto-change cho item: ${inventoryItemId}`);
                  const resetPromise = resetTracking(
                    exportRequestDetailId.toString(),
                    inventoryItemId
                  );
                  const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Reset tracking timeout")), 10000)
                  );
                  await Promise.race([resetPromise, timeoutPromise]);
                  // console.log("✅ Reset tracking thành công trước khi auto-change");
                } catch (e) {
                  console.log("❌ Reset tracking thất bại/timeout trước auto-change:", e);
                  Alert.alert("Lỗi", "Không thể huỷ tracking mã cũ. Vui lòng thử lại!");
                  setAutoChangeLoading(null);
                  return; // Dừng lại, không tiếp tục auto-change
                }
              }

              // ✅ 2) SAU KHI RESET TRACKING THÀNH CÔNG, MỚI THỰC HIỆN AUTO-CHANGE
              let autoChangeResult: any;
              try {
                autoChangeResult = await autoChangeInventoryItem(inventoryItemId);
                console.log("✅ Auto change thành công:", autoChangeResult);
              } catch (autoChangeError) {
                // ❌ Nếu auto change thất bại sau khi đã reset tracking, gọi lại updateActualQuantity để khôi phục
                if (currentItem?.isTrackingForExport && exportRequestDetailId) {
                  // console.log("🔄 Auto change thất bại, đang khôi phục tracking bằng updateActualQuantity...");
                  try {
                    await updateActualQuantity(exportRequestDetailId.toString(), inventoryItemId);
                    console.log("✅ Đã khôi phục tracking thành công sau lỗi auto change");
                  } catch (updateError) {
                    console.log("❌ Không thể khôi phục tracking sau lỗi auto change:", updateError);
                  }
                }
                throw autoChangeError; // Re-throw để xử lý lỗi bình thường
              }

              // ✅ 3) CẬP NHẬT SCAN MAPPING VỚI ITEM MỚI
              // console.log(`🔍 Debug check - autoChangeResult?.content?.id: ${autoChangeResult?.content?.id}`);
              // console.log(`🔍 Debug check - exportRequestDetailId: ${exportRequestDetailId}`);
              // console.log(`🔍 Debug check - condition result: ${!!(autoChangeResult?.content?.id && exportRequestDetailId)}`);

              if (autoChangeResult?.content?.id && exportRequestDetailId) {
                const newInventoryItemId = autoChangeResult.content.id;
                // console.log(`🔄 Cập nhật scan mapping: ${inventoryItemId} → ${newInventoryItemId}`);
                // console.log(`🔍 Debug - exportRequestDetailId: ${exportRequestDetailId}`);
                // console.log(`🔍 Debug - Current scan mappings:`, JSON.stringify(scanMappings, null, 2));

                // Tìm mapping hiện tại
                const existingMapping = scanMappings.find(
                  mapping => mapping.exportRequestDetailId.toString() === exportRequestDetailId.toString() &&
                    mapping.inventoryItemId.toLowerCase() === inventoryItemId.toLowerCase()
                );
                // console.log(`🔍 Debug - Existing mapping found:`, existingMapping);

                if (existingMapping) {
                  // Cập nhật mapping hiện tại
                  dispatch(updateInventoryItemId({
                    exportRequestDetailId: exportRequestDetailId,
                    oldInventoryItemId: inventoryItemId,
                    newInventoryItemId: newInventoryItemId
                  }));
                  // console.log("✅ Đã cập nhật scan mapping hiện tại");
                } else {
                  // Tạo mapping mới nếu chưa có
                  const newMappings = [
                    ...scanMappings,
                    {
                      exportRequestDetailId: exportRequestDetailId,
                      inventoryItemId: newInventoryItemId.toLowerCase()
                    }
                  ];
                  dispatch(setScanMappings(newMappings));
                  // console.log("✅ Đã tạo scan mapping mới");
                }
              }

              // Reset auto change loading
              setAutoChangeLoading(null);

              // Refresh data on current screen
              await refreshInventoryData();

              Alert.alert("Thành công", "Đã đổi mã thành công!");
            } catch (error) {
              console.log("❌ Error auto-changing:", error);
              let errorMessage = "Không thể đổi mã inventory item. Vui lòng thử lại!";
              const responseMessage = error?.response?.data?.message || error?.message || "";

              if (responseMessage.toLowerCase().includes("no matching inventory item found")) {
                errorMessage = "Không tìm thấy sản phẩm với giá trị phù hợp";
              } else if (responseMessage) {
                errorMessage = `Lỗi: ${responseMessage}`;
              }
              Alert.alert("Lỗi", errorMessage);
            } finally {
              setAutoChangeLoading(null);
            }
          },
        },
      ]
    );
  };

  // Handle QR scan for INTERNAL replacement (multi-select flow)
  const handleQRScanForInternalReplacement = () => {
    console.log(`🔍 INTERNAL QR Scan pressed for itemCode: ${itemCode}`);

    // Use exportRequestId if available, otherwise fallback to id
    const qrScanId = exportRequestId || id;
    console.log(`📱 INTERNAL - Using QR scan ID: ${qrScanId} (exportRequestId: ${exportRequestId}, id: ${id})`);

    // Ensure modal state is false before navigation
    dispatch(setMeasurementModalVisible(false));

    // Navigate to QR scan for INTERNAL multi-select mode
    router.push({
      pathname: '/export/scan-qr-manual',
      params: {
        id: String(qrScanId),
        returnToModal: 'true',
        itemCode: String(itemCode),
        originalItemId: 'INTERNAL_MULTI_SELECT', // Special flag for INTERNAL multi-select
        exportRequestDetailId: String(exportRequestDetailId),
      },
    });
  };

  const handleQRScanPress = (mode: 'normal' | 'manual_change' = 'normal', originalItemId?: string) => {
    console.log(`🔍 QR Scan pressed for itemCode: ${itemCode}, mode: ${mode}, originalItemId: ${originalItemId}`);

    // Sử dụng exportRequestId nếu có, nếu không thì fallback về id (có thể là exportRequestDetailId)
    const qrScanId = exportRequestId || id;
    console.log(`📱 Using QR scan ID: ${qrScanId} (exportRequestId: ${exportRequestId}, id: ${id})`);

    if (mode === 'manual_change' && originalItemId) {
      // Navigate to QR scan for manual change mode
      router.push({
        pathname: '/export/scan-qr-manual',
        params: {
          id: String(qrScanId),
          returnToModal: 'true',
          itemCode: String(itemCode),
          originalItemId: String(originalItemId),
          exportRequestDetailId: String(exportRequestDetailId),
        },
      });
    } else {
      // Navigate to QR scan with normal return parameters
      router.push(
        `/export/scan-qr?id=${qrScanId}&returnToModal=true&itemCode=${itemCode}`
      );
    }
  };

  // Group inventory items by measurement value
  const getGroupedInventoryItems = () => {
    const grouped: { [key: string]: InventoryItem[] } = {};

    filteredInventoryItems.forEach(item => {
      const measurementValue = item.measurementValue?.toString() || '0';
      if (!grouped[measurementValue]) {
        grouped[measurementValue] = [];
      }
      grouped[measurementValue].push(item);
    });

    return Object.entries(grouped).map(([measurementValue, items]) => ({
      measurementValue,
      items,
      key: `${measurementValue}-${items.length}`
    }));
  };

  const renderGroupedInventoryItems = ({ item: group }: { item: { measurementValue: string; items: InventoryItem[]; key: string } }) => {
    const { measurementValue, items } = group;

    return (
      <View style={styles.groupContainer}>
        {/* Group header showing measurement value */}
        <View style={styles.groupHeader}>
          <Text style={styles.groupMeasurementValue}>
            Giá trị đo: {measurementValue} {itemUnitType || 'đơn vị'}
          </Text>
          <Text style={styles.groupItemCount}>
            ({items.length} sản phẩm)
          </Text>
        </View>

        {/* List of inventory items in this group */}
        {items.map(item => (
          <TouchableOpacity 
            key={item.id} 
            style={[
              styles.inventoryItemContainer, 
              item.isTrackingForExport && styles.trackedItemContainer
            ]}
            onPress={() => handleInventoryItemPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.inventoryItemRow}>
              <View style={styles.inventoryItemContent}>
                <Text style={styles.inventoryItemId}>{item.id}</Text>
                <Text style={styles.inventoryItemSubtext}>
                  Vị trí: {formatLocationString(item.storedLocationName)}
                </Text>
                {exportRequestType === "INTERNAL" && (
                  <Text style={styles.inventoryItemSubtext}>
                    Giá trị đo lường: {item.measurementValue}{" "}
                    {itemUnitType || "đơn vị"}
                  </Text>
                )}
              </View>

              {/* Show tracking status */}
              {item.isTrackingForExport && (
                <View style={styles.trackingStatusContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                  <Text style={styles.trackingStatusText}>
                    Đã quét
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionButtonsRow}>
              {/* Hide buttons if export request status is COUNTED */}
              {exportRequestStatus !== ExportRequestStatus.COUNTED && (
                <>
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



                  {exportRequestType != "INTERNAL" && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.manualChangeActionButton]}
                      onPress={() => handleManualChangePress(item.id)}
                    >
                      <Ionicons name="swap-horizontal-outline" size={16} color="white" />
                      <Text style={styles.actionButtonText}>Đổi thủ công</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderManualInventoryItem = ({ item }: { item: InventoryItem }) => {
    // Check if this item is selected in multi-selection mode
    const isSelectedOld = selectedOldItems.some(selected => selected.id === item.id);
    const isSelectedNew = selectedNewItems.some(selected => selected.id === item.id);
    const isSelected = isSelectedOld || isSelectedNew;

    return (
      <View style={[
        styles.inventoryItemRow,
        isSelected && styles.selectedInventoryItemRow
      ]}>
        <View style={styles.inventoryItemContent}>
          <Text style={styles.inventoryItemId}>{item.id}</Text>
          <Text style={styles.inventoryItemSubtext}>
            Vị trí: {formatLocationString(item.storedLocationName)}
          </Text>
          <Text style={styles.inventoryItemSubtext}>
            Giá trị: {item.measurementValue} {itemUnitType || "đơn vị"}
          </Text>
          {/* Show selection status for INTERNAL multi-selection */}
          {exportRequestType === "INTERNAL" && multiSelectMode === 'old' && isSelected && (
            <Text style={styles.selectedIndicatorText}>
              {isSelectedOld ? "✓ Đã chọn " : "✓ Đã chọn (mới)"}
            </Text>
          )}
        </View>

        {exportRequestType === "INTERNAL" && multiSelectMode === 'old' ? (
          <View style={styles.multiSelectActions}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => handleManualItemSelect(item)}
            >
              <View style={[
                styles.checkbox,
                isSelected && styles.checkboxChecked
              ]}>
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteItemButton}
              onPress={() => handleRemoveOldItem(item.id)}
            >
              <Ionicons name="close-circle" size={20} color="#ff4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[
              styles.selectButton,
              isSelected && styles.selectedButton
            ]}
            onPress={() => handleManualItemSelect(item)}
          >
            <Text style={[
              styles.selectButtonText,
              isSelected && styles.selectedButtonText
            ]}>
              Chọn
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderHeader = () => {
    let title = "";
    switch (currentPage) {
      case "main":
        title = `Danh sách sản phẩm tồn kho 
(Mã hàng #${itemCode})`;
        break;
      case "manual_select":
        if (exportRequestType === "INTERNAL" && multiSelectMode) {
          if (internalManualChangeStep === 'select_old') {
            title = `Chọn sản phẩm muốn thay đổi (${selectedOldItems.length} đã chọn)`;
          } else {
            title = `Chọn hàng tồn kho (Mã hàng #${itemCode})`;
          }
        } else {
          title = `Chọn hàng tồn kho (Mã hàng #${itemCode})`;
        }
        break;
      case "reason_input":
        if (exportRequestType === "INTERNAL" && (selectedOldItems.length > 0 || selectedNewItems.length > 0)) {
          title = `Nhập lý do thay đổi (${selectedOldItems.length} → ${selectedNewItems.length})`;
        } else {
          title = "Nhập lý do đổi sản phẩm";
        }
        break;
    }

    return (
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => {
              if (currentPage === "main") {
                // Navigate to export detail instead of router.back()
                // Use exportRequestId if available, otherwise fallback to use the exportRequestDetailId to get the parent exportRequest
                const targetExportRequestId = exportRequestId || id;
                console.log(`🔙 ExportInventory back pressed - navigating to export detail: ${targetExportRequestId} (exportRequestId: ${exportRequestId}, fallback id: ${id})`);
                router.replace(`/export/export-detail/${targetExportRequestId}`);
              } else if (currentPage === "manual_select") {
                // Handle INTERNAL multi-selection back navigation
                setCurrentPage("main");
                // Reset INTERNAL states
                setSelectedOldItems([]);
                setSelectedNewItems([]);
                setMultiSelectMode(null);
                setInternalManualChangeStep('select_old');
                setCheckAllOldItems(true);
              } else if (currentPage === "reason_input") {
                if (exportRequestType === "INTERNAL") {
                  // Go back to select_old step
                  setInternalManualChangeStep('select_old');
                  setMultiSelectMode('old');
                  setCurrentPage("manual_select");
                } else {
                  setCurrentPage("manual_select");
                }
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{title}</Text>
        </View>

        {/* Display ItemId measurement value */}

      </View>
    );
  };

  const renderContent = () => {
    switch (currentPage) {
      case "main":
        return (
          <>
            {currentPage === "main" && itemData && (
              <View style={styles.warningMeasurementInfo}>
                <Text style={styles.itemMeasurementTextLeft}>
                  Giá trị đo lường chuẩn: <Text style={styles.itemMeasurementText}>{itemData.measurementValue || 0} {itemData.measurementUnit || ''}</Text>
                </Text>
                {exportRequestDetailData && exportRequestType === "INTERNAL" && (
                  <Text style={styles.itemMeasurementTextLeft}>
                    Giá trị xuất yêu cầu: <Text style={styles.itemMeasurementText}>{exportRequestDetailData.measurementValue || 0} {itemData.measurementUnit || itemUnitType || ''}</Text>
                  </Text>
                )}
              </View>
            )}
            <View style={styles.itemCountContainer}>

              <Text style={styles.sectionTitle}>
                Sản phẩm tồn kho ({filteredInventoryItems.length} sản phẩm)
              </Text>
              {inventoryLoading && (
                <ActivityIndicator
                  size="small"
                  color="#1677ff"
                  style={styles.loadingIndicator}
                />
              )}
            </View>

            {exportRequestStatus === ExportRequestStatus.IN_PROGRESS && 
             !(
               (exportRequestType === "INTERNAL" && (exportRequestDetailData as any)?.status === "MATCH") ||
               (exportRequestType === "SELLING" && exportRequestDetailData?.actualQuantity === exportRequestDetailData?.quantity)
             ) && (
              <View style={styles.scanButtonContainer}>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.globalScanButton, exportRequestType === "INTERNAL" && styles.halfWidthButton]}
                    onPress={() => handleQRScanPress('normal')}
                  >
                    <Ionicons name="qr-code-outline" size={20} color="white" />
                    <Text style={styles.globalScanButtonText}>Quét QR</Text>
                  </TouchableOpacity>

              
                </View>
              </View>
            )}

            {inventoryLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1677ff" />
                <Text style={styles.loadingText}>Đang tải danh sách...</Text>
              </View>
            ) : (
              <FlatList
                data={getGroupedInventoryItems()}
                renderItem={renderGroupedInventoryItems}
                keyExtractor={(item) => item.key}
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
        return (
          <>
            <View style={styles.searchContainer}>
              <Ionicons
                name="search"
                size={20}
                color="#666"
                style={styles.searchIcon}
              />
              <RNTextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm theo giá trị đo lường... (VD: 10, 25.5)"
                placeholderTextColor="#999"
                value={manualSearchText || ""}
                onChangeText={setManualSearchText}
              />
            </View>

            {/* QR Scan Button for Manual Change - Only for non-INTERNAL or traditional flow */}
            {exportRequestStatus === ExportRequestStatus.IN_PROGRESS &&
              !(exportRequestType === "INTERNAL" && multiSelectMode === 'old') &&
              !(
                (exportRequestType === "INTERNAL" && (exportRequestDetailData as any)?.status === "MATCH") ||
                (exportRequestType === "SELLING" && exportRequestDetailData?.actualQuantity === exportRequestDetailData?.quantity)
              ) && (
                <View style={styles.scanButtonContainer}>
                  <TouchableOpacity
                    style={styles.manualScanButton}
                    onPress={() => handleQRScanPress('manual_change', originalItemId)}
                  >
                    <Ionicons name="qr-code-outline" size={20} color="white" />
                    <Text style={styles.manualScanButtonText}>Quét QR để chọn sản phẩm</Text>
                  </TouchableOpacity>
                </View>
              )}

            {/* INTERNAL multi-selection summary and controls */}
            {exportRequestType === "INTERNAL" && multiSelectMode === 'old' && (
              <View style={styles.multiSelectSummaryContainer}>
                <Text style={styles.multiSelectSummaryTitle}>
                  Đã chọn {selectedOldItems.length} sản phẩm để thay đổi
                </Text>

                {/* QR Scan button for scanning new items */}
                {!((exportRequestDetailData as any)?.status === "MATCH") && (
                  <TouchableOpacity
                    style={styles.qrScanButton}
                    onPress={() => router.push(`/export/scan-qr-manual?id=${exportRequestId || id}&originalItemId=INTERNAL_MULTI_SELECT`)}
                  >
                    <Ionicons name="qr-code-outline" size={20} color="white" />
                    <Text style={styles.qrScanButtonText}>Scan QR sản phẩm mới</Text>
                  </TouchableOpacity>
                )}

                {/* Confirm Changes button */}
                {/* <TouchableOpacity
                  style={[
                    styles.nextStepButton,
                    selectedOldItems.length === 0
                      ? styles.nextStepButtonDisabled
                      : {}
                  ]}
                  onPress={handleInternalStepTransition}
                  disabled={selectedOldItems.length === 0}
                >
                  <Text style={styles.nextStepButtonText}>
                    Xác nhận thay đổi
                  </Text>
                </TouchableOpacity> */}

              </View>
            )}

            <View style={styles.itemCountContainer}>
              <View style={styles.summaryRow}>
                <Text style={[styles.sectionTitle, { flex: 1 }]}>
                  {exportRequestType === "INTERNAL" && multiSelectMode === 'old'
                    ? `Sản phẩm hiện tại (${filteredAllInventoryItems.length} sản phẩm)`
                    : `Hàng tồn kho khả dụng (${filteredAllInventoryItems.length}/${allInventoryItems?.length || 0} sản phẩm)`
                  }
                </Text>

                {/* Check All / Uncheck All button - only for INTERNAL multi-select */}
                {exportRequestType === "INTERNAL" && multiSelectMode === 'old' && (
                  <TouchableOpacity
                    style={styles.checkAllButton}
                    onPress={() => {
                      if (checkAllOldItems) {
                        setSelectedOldItems([]);
                        setCheckAllOldItems(false);
                      } else {
                        // Only select untracked items
                        const untrackedItems = filteredAllInventoryItems.filter(item => !item.isTrackingForExport);
                        setSelectedOldItems(untrackedItems);
                        setCheckAllOldItems(true);
                      }
                    }}
                  >
                    <Text style={styles.checkAllButtonText}>
                      {checkAllOldItems ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {manualDataLoading && (
                <ActivityIndicator
                  size="small"
                  color="#1677ff"
                  style={styles.loadingIndicator}
                />
              )}
            </View>

            {manualDataLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1677ff" />
                <Text style={styles.loadingText}>Đang tải danh sách sản phẩm...</Text>
              </View>
            ) : (
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
            )}
          </>
        );

      case "reason_input":
        return (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.reasonInputContainer}>
              {/* Show selected items summary for INTERNAL multi-selection */}
              {exportRequestType === "INTERNAL" && (selectedOldItems.length > 0 || selectedNewItems.length > 0) ? (
                <View style={styles.selectedItemInfo}>
                  <Text style={styles.selectedItemTitle}>Tóm tắt thay đổi:</Text>

                  <Text style={styles.selectedItemSubtext}>
                    Sản phẩm muốn thay đổi ({selectedOldItems.length}):
                  </Text>
                  {selectedOldItems.map((item, index) => (
                    <Text key={item.id} style={styles.selectedItemId}>
                      {index + 1}. {item.id} ({item.measurementValue} {itemUnitType || "đơn vị"})
                    </Text>
                  ))}

                  <Text style={styles.selectedItemSubtext}>
                    Sản phẩm muốn thay thế ({selectedNewItems.length}):
                  </Text>
                  {selectedNewItems.map((item, index) => (
                    <Text key={item.id} style={styles.selectedItemId}>
                      {index + 1}. {item.id} ({item.measurementValue} {itemUnitType || "đơn vị"})
                    </Text>
                  ))}
                </View>
              ) : (
                <View style={styles.selectedItemInfo}>
                  <Text style={styles.selectedItemTitle}>Sản phẩm được chọn:</Text>
                  <Text style={styles.selectedItemId}>
                    {selectedManualItem?.id}
                  </Text>
                  <Text style={styles.selectedItemSubtext}>
                    Vị trí: {formatLocationString(selectedManualItem?.storedLocationName)}
                  </Text>
                  <Text style={styles.selectedItemSubtext}>
                    Giá trị: {selectedManualItem?.measurementValue}{" "}
                    {itemUnitType || "đơn vị"}
                  </Text>
                </View>
              )}

              <View style={styles.reasonInputSection}>
                <Text style={styles.reasonLabel}>Lý do đổi sản phẩm:</Text>
                <RNTextInput
                  style={styles.reasonInput}
                  placeholder="Nhập lý do đổi sản phẩm..."
                  value={changeReason || ""}
                  onChangeText={setChangeReason}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>

              <View>
                <TouchableOpacity
                  style={[
                    styles.submitReasonButton,
                    (manualChangeLoading || !(changeReason || "").trim()) && styles.submitReasonButtonDisabled,
                  ]}
                  onPress={
                    exportRequestType === "INTERNAL" && (selectedOldItems.length > 0 || selectedNewItems.length > 0)
                      ? handleInternalManualChangeSubmit
                      : handleManualChangeSubmit
                  }
                  disabled={!(changeReason || "").trim() || manualChangeLoading}
                >
                  {manualChangeLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text
                      style={[
                        styles.submitReasonButtonText,
                        (!(changeReason || "").trim()) && { color: '#999' }
                      ]}
                    >
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

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderContent()}

      {/* Measurement Warning Dialog */}
      {showMeasurementWarning && selectedManualItem && itemData && (
        <View style={styles.warningOverlay}>
          <View style={styles.warningDialog}>
            <Text style={styles.warningTitle}>Cảnh báo giá trị xuất</Text>
            <Text style={styles.warningText}>
              Giá trị đo lường của sản phẩm này đã vượt quá so với giá trị cần xuất.
            </Text>
            <View style={styles.warningMeasurementInfo}>
              <Text style={styles.warningMeasurementText}>
                Giá trị đo lường cần xuất: {itemData.measurementValue || 0} {itemUnitType || ''}
              </Text>
              <Text style={styles.warningMeasurementText}>
                Giá trị đo lường đã chọn: {selectedManualItem.measurementValue || 0} {itemUnitType || ''}
              </Text>
            </View>
            <View style={styles.warningButtonRow}>
              <TouchableOpacity
                style={[styles.warningButton, styles.warningCancelButton]}
                onPress={handleMeasurementWarningCancel}
              >
                <Text style={styles.warningCancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.warningButton, styles.warningConfirmButton]}
                onPress={handleMeasurementWarningConfirm}
              >
                <Text style={styles.warningConfirmButtonText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Measurement Modal for INTERNAL QR Scan Result */}
      {showMeasurementModal && (selectedOldItems.length > 0 || scannedNewItemsForModal.length > 0) && (
        <View style={styles.warningOverlay}>
          <View style={styles.measurementModal}>
            <Text style={styles.measurementModalTitle}>Xác nhận thay đổi sản phẩm</Text>

            <ScrollView style={styles.measurementModalContent}>
              {/* Selected old items summary - only show untracked items */}
              <View style={styles.measurementSection}>
                {(() => {
                  const untrackedSelectedItems = selectedOldItems.filter(item => !item.isTrackingForExport);
                  return (
                    <>
                      <Text style={styles.measurementSectionTitle}>Sản phẩm được thay đổi ({untrackedSelectedItems.length}):</Text>
                      {untrackedSelectedItems.map((item, index) => (
                  <View key={item.id} style={styles.measurementItemInfo}>
                    <View style={styles.measurementItemContent}>
                      <View style={styles.measurementItemDetails}>
                        <Text style={styles.measurementItemId}>
                          {index + 1}. {item.id}{item.isTrackingForExport ? ' (Sản phẩm này đã quét)' : ''}
                        </Text>
                        <Text style={styles.measurementItemValue}>Giá trị: {item.measurementValue} {itemUnitType || "đơn vị"}</Text>
                        <Text style={styles.measurementItemLocation}>Vị trí: {formatLocationString(item.storedLocationName)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeItemButton}
                        onPress={() => handleRemoveOldItem(item.id)}
                        disabled={manualChangeLoading}
                      >
                          <Ionicons name="close-circle" size={24} color="#ff4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                      ))}
                    </>
                  );
                })()}
              </View>

              {/* Scanned new items info */}
              <View style={styles.measurementSection}>
                <Text style={styles.measurementSectionTitle}>Sản phẩm thay thế (Đã quét {scannedNewItemsForModal.length} QR):</Text>
                {scannedNewItemsForModal.map((scannedItem, index) => (
                  <View key={scannedItem.id} style={styles.measurementItemInfo}>
                    <View style={styles.measurementItemContent}>
                      <View style={styles.measurementItemDetails}>
                        <Text style={styles.measurementItemId}>{index + 1}. {scannedItem.id}</Text>
                        <Text style={styles.measurementItemValue}>Giá trị: {scannedItem.measurementValue} {itemUnitType || "đơn vị"}</Text>
                        <Text style={styles.measurementItemLocation}>Vị trí: {formatLocationString(scannedItem.storedLocationName)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeItemButton}
                        onPress={() => handleRemoveScannedItem(scannedItem.id)}
                        disabled={manualChangeLoading}
                      >
                        <Ionicons name="close-circle" size={24} color="#ff4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>

              {/* Reason input */}
              <View style={styles.measurementSection}>
                <Text style={styles.measurementReasonLabel}>Lý do thay đổi:</Text>
                <RNTextInput
                  style={styles.measurementReasonInput}
                  placeholder="Nhập lý do thay đổi sản phẩm..."
                  value={measurementModalReason}
                  onChangeText={setMeasurementModalReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={styles.measurementModalButtons}>
              <TouchableOpacity
                style={[styles.measurementModalButton, styles.measurementModalCancelButton]}
                onPress={handleMeasurementModalCancel}
                disabled={manualChangeLoading}
              >
                <Text style={styles.measurementModalCancelButtonText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.measurementModalButton, styles.measurementModalScanButton]}
                onPress={handleContinueScanning}
                disabled={manualChangeLoading}
              >
                <Ionicons name="qr-code-outline" size={16} color="white" />
                <Text style={styles.measurementModalScanButtonText}>Quét tiếp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.measurementModalButton,
                  styles.measurementModalConfirmButton,
                  (!measurementModalReason.trim() || manualChangeLoading) && styles.measurementModalButtonDisabled
                ]}
                onPress={handleMeasurementModalConfirm}
                disabled={!measurementModalReason.trim() || manualChangeLoading}
              >
                {manualChangeLoading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.measurementModalConfirmButtonText}>Xác nhận</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  header: {
    backgroundColor: "#1677ff",
    paddingBottom: 16,
    paddingHorizontal: 17,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 16,
  },
  backButton: {
    paddingRight: 12,
  },
  headerTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
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
    fontWeight: "500",
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
  trackedItemContainer: {
    backgroundColor: "#f0f8f0",
    borderWidth: 1,
    borderColor: "#28a745",
    elevation: 2,
    shadowOpacity: 0.15,
  },
  inventoryItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
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
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    gap: 4,
  },
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
  autoChangeActionButton: {
    backgroundColor: "#ff6b35",
  },
  manualChangeActionButton: {
    backgroundColor: "#28a745",
  },
  actionButtonDisabled: {
    backgroundColor: "#ccc",
    elevation: 0,
  },
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
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
    elevation: 0,
    shadowOpacity: 0,
  },
  submitReasonButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  scanButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  globalScanButton: {
    backgroundColor: "#1677ff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  globalScanButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  manualScanButton: {
    backgroundColor: "#6c5ce7",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  manualScanButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
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
  itemMeasurementText: {
    fontSize: 12,
    color: "black",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
  itemMeasurementTextLeft: {
    fontSize: 12,
    color: "black",
    marginTop: 4,
    textAlign: "center",
  },
  warningMeasurementInfo: {
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: "#ffeaa7",
  },
  groupContainer: {
    marginBottom: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  groupHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#dee2e6",
  },
  groupMeasurementValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 4,
  },
  groupItemCount: {
    fontSize: 12,
    color: "#6c757d",
    fontStyle: "italic",
  },
  // Warning Dialog Styles
  warningOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  warningDialog: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#dc3545",
    textAlign: "center",
    marginBottom: 12,
  },
  warningText: {
    fontSize: 14,
    color: "#495057",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  warningMeasurementText: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 4,
    textAlign: "center",
  },
  warningButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  warningButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  warningCancelButton: {
    backgroundColor: "#c1c1c1ff",
  },
  warningCancelButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  warningConfirmButton: {
    backgroundColor: "#1677ff",
  },
  warningConfirmButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  // INTERNAL multi-selection styles
  selectedInventoryItemRow: {
    backgroundColor: "#e3f2fd",
    borderWidth: 2,
    borderColor: "#1677ff",
    borderRadius: 10,
    padding: 10,
    marginBottom: 5,
  },
  selectedIndicatorText: {
    fontSize: 12,
    color: "#1677ff",
    fontWeight: "600",
    marginTop: 4,
  },
  selectedButton: {
    backgroundColor: "#f44336",
  },
  selectedButtonText: {
    color: "white",
  },
  multiSelectSummaryContainer: {
    backgroundColor: "#f8f9fa",
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  multiSelectSummaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 12,
    textAlign: "center",
  },
  nextStepButton: {
    backgroundColor: "#1677ff",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  nextStepButtonDisabled: {
    backgroundColor: "#ccc",
  },
  nextStepButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  halfWidthButton: {
    flex: 1,
  },
  manualChangeButton: {
    backgroundColor: "#28a745",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  manualChangeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  qrScanButtonForNewItems: {
    backgroundColor: "#6c5ce7",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  qrScanButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  // Checkbox styles
  checkboxContainer: {
    padding: 4,
    marginLeft: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#ccc",
    borderRadius: 4,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 15,

  },
  checkboxChecked: {
    backgroundColor: "#1677ff",
    borderColor: "#1677ff",
  },
  multiSelectActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteItemButton: {
    padding: 4,
    marginLeft: 8,
  },

  // New styles for summary row and buttons
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  checkAllButton: {
    backgroundColor: "#6c757d",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  checkAllButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  qrScanButton: {
    backgroundColor: "#6c5ce7",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  // Measurement Modal Styles
  measurementModal: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    width: "95%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  measurementModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 16,
  },
  measurementModalContent: {
    maxHeight: 400,
  },
  measurementSection: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  measurementSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 8,
  },
  measurementItemInfo: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  measurementItemId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1677ff",
    marginBottom: 4,
  },
  measurementItemValue: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  measurementItemLocation: {
    fontSize: 13,
    color: "#666",
  },
  measurementReasonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  measurementReasonInput: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
  },
  measurementModalButtons: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  measurementModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  measurementModalCancelButton: {
    backgroundColor: "#6c757d",
  },
  measurementModalCancelButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  measurementModalScanButton: {
    backgroundColor: "#6c5ce7",
  },
  measurementModalScanButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  measurementModalConfirmButton: {
    backgroundColor: "#1677ff",
  },
  measurementModalConfirmButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  measurementModalButtonDisabled: {
    backgroundColor: "#ccc",
  },
  // New styles for measurement item layout with delete button
  measurementItemContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  measurementItemDetails: {
    flex: 1,
    marginRight: 8,
  },
  removeItemButton: {
    padding: 4,
    marginTop: 2,
  },
});

export default ExportInventoryScreen;
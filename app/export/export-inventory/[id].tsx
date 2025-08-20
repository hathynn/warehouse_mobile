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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { InventoryItem } from "@/types/inventoryItem.type";
import { RootState } from "@/redux/store";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import { ExportRequestStatus, ExportRequestTypeEnum } from "@/types/exportRequest.type";
import { updateInventoryItemId, setScanMappings, setScannedNewItemForMultiSelect } from "@/redux/exportRequestDetailSlice";

interface RouteParams extends Record<string, string | undefined> {
  id: string;
  itemCode: string;
  exportRequestDetailId: string;
  exportRequestId?: string;
  exportRequestType?: string;
  exportRequestStatus?: string;
  scannedNewItem?: string;
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
  const { id, itemCode, exportRequestDetailId, exportRequestId, exportRequestType, exportRequestStatus, scannedNewItem } = params;

  // Debug logging for parameters
  console.log(`📋 ExportInventory params:`, {
    id,
    scannedNewItem, // Add this to see if it's being received
    itemCode,
    exportRequestDetailId,
    exportRequestId,
    exportRequestType,
    exportRequestStatus
  });

  // Debug INTERNAL multi-selection check
  console.log(`🔍 INTERNAL check - exportRequestType: "${exportRequestType}", is INTERNAL: ${exportRequestType === "INTERNAL"}`);

  // Get current scan mappings from Redux store for debugging
  const scanMappings = useSelector(
    (state: RootState) => state.exportRequestDetail.scanMappings
  );

  // Get scanned new item for multi-select from Redux
  const scannedNewItemFromRedux = useSelector(
    (state: RootState) => state.exportRequestDetail.scannedNewItemForMultiSelect
  );

  const [currentPage, setCurrentPage] = useState<ScreenPage>("main");
  const [originalItemId, setOriginalItemId] = useState<string>("");
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
  const [internalManualChangeStep, setInternalManualChangeStep] = useState<'select_old' | 'select_new' | 'reason_input'>('select_old');

  // Measurement modal states for INTERNAL QR scan result
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [scannedNewItemsForModal, setScannedNewItemsForModal] = useState<any[]>([]);
  const [measurementModalReason, setMeasurementModalReason] = useState('');

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
  const { fetchExportRequestDetailById, resetTracking } = useExportRequestDetail();

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
    if (scannedNewItemFromRedux && exportRequestType === "INTERNAL" && multiSelectMode === 'new') {
      console.log(`📱 Received scanned new item from Redux: ${scannedNewItemFromRedux}`);
      
      // Fetch the inventory item details and show measurement modal
      const showMeasurementModalForScannedItem = async () => {
        try {
          const inventoryItem = await fetchInventoryItemById(scannedNewItemFromRedux);
          if (inventoryItem) {
            console.log(`📊 Adding scanned item to measurement modal: ${scannedNewItemFromRedux}`);
            
            // Add to scanned items array for modal (avoid duplicates)
            setScannedNewItemsForModal(prevItems => {
              const alreadyExists = prevItems.some(item => item.id === inventoryItem.id);
              if (!alreadyExists) {
                const updatedItems = [...prevItems, inventoryItem];
                console.log(`✅ Added to modal items. Total: ${updatedItems.length}`);
                return updatedItems;
              } else {
                console.log(`⚠️ Item ${inventoryItem.id} already in modal, skipping`);
                return prevItems;
              }
            });
            
            setShowMeasurementModal(true);
            
            // Clear the Redux state to avoid re-processing
            dispatch(setScannedNewItemForMultiSelect(null));
          }
        } catch (error) {
          console.log(`❌ Error fetching scanned item ${scannedNewItemFromRedux}:`, error);
          // Clear the Redux state even on error
          dispatch(setScannedNewItemForMultiSelect(null));
        }
      };
      
      showMeasurementModalForScannedItem();
    }
  }, [scannedNewItemFromRedux, exportRequestType, multiSelectMode]);

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

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      if (!exportRequestDetailId || !itemCode) return;

      try {
        console.log(`🔍 Fetching inventory items for exportRequestDetailId: ${exportRequestDetailId}`);

        const inventoryItems = await fetchInventoryItemsByExportRequestDetailId(parseInt(exportRequestDetailId));
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
    measurementSearch(item, manualSearchText || "")
  );

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
      setOriginalItemId(originalInventoryItemId);

      // Start loading
      setManualDataLoading(true);

      // Fetch all inventory items for this itemId using the new API
      const allInventoryItemsForItemId = await fetchInventoryItemByItemId(itemCode);

      if (!allInventoryItemsForItemId || allInventoryItemsForItemId.length === 0) {
        Alert.alert("Lỗi", "Không tìm thấy inventory items cho item này");
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
      
      // Start loading
      setManualDataLoading(true);

      // Fetch current inventory items in the export request detail
      const currentInventoryItems = await fetchInventoryItemsByExportRequestDetailId(parseInt(exportRequestDetailId!));
      
      // Convert to InventoryItem format for compatibility
      const convertedCurrentItems = currentInventoryItems.map(item => ({
        id: item.id,
        reasonForDisposal: item.reasonForDisposal,
        measurementValue: item.measurementValue,
        status: item.status,
        expiredDate: item.expiredDate,
        importedDate: item.importedDate,
        updatedDate: item.updatedDate,
        parentId: item.parentId ? Number(item.parentId) : null,
        childrenIds: item.childrenIds?.map(id => Number(id)) || [],
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
      // Selecting old items to replace
      const isAlreadySelected = selectedOldItems.some(selected => selected.id === item.id);
      
      if (isAlreadySelected) {
        // Remove from selection
        setSelectedOldItems(prev => prev.filter(selected => selected.id !== item.id));
        console.log(`🔄 INTERNAL - Removed old item from selection: ${item.id}`);
      } else {
        // Add to selection
        setSelectedOldItems(prev => [...prev, item]);
        console.log(`🔄 INTERNAL - Added old item to selection: ${item.id}`);
      }
    } else if (multiSelectMode === 'new') {
      // Selecting new items as replacements
      const isAlreadySelected = selectedNewItems.some(selected => selected.id === item.id);
      
      if (isAlreadySelected) {
        // Remove from selection
        setSelectedNewItems(prev => prev.filter(selected => selected.id !== item.id));
        console.log(`🔄 INTERNAL - Removed new item from selection: ${item.id}`);
      } else {
        // Add to selection
        setSelectedNewItems(prev => [...prev, item]);
        console.log(`🔄 INTERNAL - Added new item to selection: ${item.id}`);
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
          childrenIds: item.childrenIds?.map(id => Number(id)) || [],
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
        setInternalManualChangeStep('select_new');
        setMultiSelectMode('new');
        setManualSearchText("");
        
        console.log(`✅ INTERNAL - Loaded ${convertedItems.length} available items for new selection`);
        
      } catch (error) {
        console.log("❌ Error loading available items:", error);
        Alert.alert("Lỗi", "Không thể tải danh sách sản phẩm khả dụng");
      } finally {
        setManualDataLoading(false);
      }
      
    } else if (internalManualChangeStep === 'select_new') {
      if (selectedNewItems.length === 0) {
        Alert.alert("Lỗi", "Vui lòng chọn ít nhất một sản phẩm mới để thay thế");
        return;
      }
      
      console.log(`🔄 INTERNAL - Moving to reason_input step with ${selectedNewItems.length} new items selected`);
      setInternalManualChangeStep('reason_input');
      setCurrentPage('reason_input');
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

      // Reset tracking for all old items first
      for (const oldItem of selectedOldItems) {
        if (oldItem.isTrackingForExport && exportRequestDetailId) {
          try {
            console.log(`🔄 INTERNAL - Reset tracking for old item: ${oldItem.id}`);
            const ok = await resetTracking(exportRequestDetailId.toString(), oldItem.id);
            if (!ok) throw new Error(`Không thể reset tracking cho item ${oldItem.id}`);
            console.log(`✅ INTERNAL - Reset tracking successful for: ${oldItem.id}`);
          } catch (e) {
            console.log(`❌ INTERNAL - Reset tracking error for ${oldItem.id}:`, e);
            throw new Error(`Không thể huỷ tracking mã cũ ${oldItem.id}. Vui lòng thử lại!`);
          }
        }
      }

      // Call the multi-item change API
      const result = await changeInventoryItemsForExportDetail(
        selectedOldItems.map(item => item.id),
        selectedNewItems.map(item => item.id),
        changeReason.trim()
      );

      if (!result) {
        throw new Error("API call failed");
      }

      console.log("✅ INTERNAL manual change successful");

      // Update scan mappings for all changed items
      for (const oldItem of selectedOldItems) {
        // Find corresponding new item (for now, map 1:1 or first available)
        const newItem = selectedNewItems[0]; // Simplified mapping
        if (newItem && exportRequestDetailId) {
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
            console.log(`✅ INTERNAL - Updated scan mapping: ${oldItem.id} → ${newItem.id}`);
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

    // Original logic for other export types
    // Validate measurement for replacement when new item has lower measurement value (INTERNAL exports only)
    if (exportRequestType === "INTERNAL" && exportRequestDetailId && originalItemId) {
      // First, get original item to compare measurement values
      try {
        const originalItem = await fetchInventoryItemById(originalItemId);
        if (originalItem && (item.measurementValue || 0) < (originalItem.measurementValue || 0)) {
          console.log(`🔍 INTERNAL export - ExportInventoryScreen - Validating measurement replacement: new ${item.measurementValue} < old ${originalItem.measurementValue}`);

          const validation = await validateMeasurementForReplacement(
            originalItemId,
            item,
            parseInt(exportRequestDetailId)
          );

          if (!validation.isValid) {
            console.log(`❌ INTERNAL export - ExportInventoryScreen - Measurement replacement validation failed: total ${validation.totalAfterChange} < required ${validation.requiredValue}`);

            // Show error message
            Alert.alert(
              "Không thể chọn",
              "Giá trị đo lường của sản phẩm tồn kho không phù hợp với giá trị xuất của sản phẩm"
            );
            return; // Stop processing and don't select the item
          }
          console.log(`✅ INTERNAL export - ExportInventoryScreen - Measurement replacement validation passed: total ${validation.totalAfterChange} >= required ${validation.requiredValue}`);
        }
      } catch (error) {
        console.log("❌ Error validating original item:", error);
        // Continue with selection if validation fails to avoid blocking legitimate operations
      }
    }

    setSelectedManualItem(item);
    setCurrentPage("reason_input");
  };

  // Function to check measurement warning before manual change submit
  const handleManualChangeSubmit = async () => {
    // Only show warnings for INTERNAL export requests with exceeded values
    if (exportRequestType === "INTERNAL" && selectedManualItem && itemData) {
      const selectedMeasurement = selectedManualItem.measurementValue || 0;
      const requiredMeasurement = itemData.measurementValue || 0;

      // Only warn for exceeded values in INTERNAL exports
      if (selectedMeasurement > requiredMeasurement) {
        console.log(`⚠️ INTERNAL export - Measurement value exceeded: selected ${selectedMeasurement} > required ${requiredMeasurement}`);
        setShowMeasurementWarning(true);
        return;
      }
    }

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
      if (exportRequestDetailId && originalItemId) {
        try {
          console.log(`🔄 ExportInventory - Reset tracking trước khi manual change cho item: ${originalItemId}`);
          const originalInventoryItemData = await fetchInventoryItemById(originalItemId);
          if (originalInventoryItemData?.isTrackingForExport) {
            const ok = await resetTracking(exportRequestDetailId.toString(), originalItemId);
            if (!ok) throw new Error("Không thể reset tracking cho item cũ");
            console.log(`✅ ExportInventory - Reset tracking successful for: ${originalItemId}`);
          } else {
            console.log(`ℹ️ ExportInventory - ${originalItemId} không tracking, bỏ qua reset`);
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

      // ✅ CẬP NHẬT SCAN MAPPING VỚI ITEM MỚI (giống auto-change)
      if (selectedManualItem?.id && exportRequestDetailId && originalItemId) {
        const newInventoryItemId = selectedManualItem.id;
        console.log(`🔄 Manual change - Cập nhật scan mapping: ${originalItemId} → ${newInventoryItemId}`);
        console.log(`🔍 Manual change - exportRequestDetailId: ${exportRequestDetailId}`);
        console.log(`🔍 Manual change - Current scan mappings:`, JSON.stringify(scanMappings, null, 2));
        
        // Tìm mapping hiện tại
        const existingMapping = scanMappings.find(
          mapping => mapping.exportRequestDetailId.toString() === exportRequestDetailId.toString() && 
                     mapping.inventoryItemId.toLowerCase() === originalItemId.toLowerCase()
        );
        console.log(`🔍 Manual change - Existing mapping found:`, existingMapping);
        
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
      setOriginalItemId("");
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

    setManualChangeLoading(true);

    try {
      console.log(`🔄 INTERNAL measurement modal - submitting with:`, {
        oldItems: selectedOldItems.map(item => item.id),
        newItems: scannedNewItemsForModal.map(item => item.id),
        reason: measurementModalReason.trim()
      });

      // Reset tracking for old items that are currently being tracked
      for (const oldItem of selectedOldItems) {
        if (oldItem.isTrackingForExport && exportRequestDetailId) {
          try {
            console.log(`🔄 INTERNAL - Reset tracking for tracked old item: ${oldItem.id}`);
            const ok = await resetTracking(exportRequestDetailId.toString(), oldItem.id);
            if (!ok) throw new Error(`Không thể reset tracking cho item ${oldItem.id}`);
            console.log(`✅ INTERNAL - Reset tracking successful for: ${oldItem.id}`);
          } catch (e) {
            console.log(`❌ INTERNAL - Reset tracking error for ${oldItem.id}:`, e);
            throw new Error(`Không thể huỷ tracking mã cũ ${oldItem.id}. Vui lòng thử lại!`);
          }
        } else if (!oldItem.isTrackingForExport) {
          console.log(`ℹ️ INTERNAL - Item ${oldItem.id} is not being tracked, skipping reset`);
        }
      }

      // Call the multi-item change API with the scanned items
      const result = await changeInventoryItemsForExportDetail(
        selectedOldItems.map(item => item.id),
        scannedNewItemsForModal.map(item => item.id), // Array of scanned items
        measurementModalReason.trim()
      );

      if (!result) {
        throw new Error("API call failed");
      }

      console.log("✅ INTERNAL measurement modal - change successful");

      // Update scan mappings
      if (exportRequestDetailId) {
        const existingMapping = scanMappings.find(
          mapping => mapping.exportRequestDetailId.toString() === exportRequestDetailId.toString() && 
                     mapping.inventoryItemId.toLowerCase() === selectedOldItems[0].id.toLowerCase()
        );
        
        if (existingMapping && scannedNewItemsForModal.length > 0) {
          dispatch(updateInventoryItemId({
            exportRequestDetailId: exportRequestDetailId,
            oldInventoryItemId: selectedOldItems[0].id,
            newInventoryItemId: scannedNewItemsForModal[0].id
          }));
          console.log(`✅ INTERNAL - Updated scan mapping: ${selectedOldItems[0].id} → ${scannedNewItemsForModal[0].id}`);
        }
      }

      // Reset states and return to main screen
      setShowMeasurementModal(false);
      setScannedNewItemsForModal([]);
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
    setScannedNewItemsForModal([]);
    setMeasurementModalReason('');
  };

  // Handle continue scanning for more new items
  const handleContinueScanning = () => {
    console.log(`🔄 Continue scanning - keeping modal with ${scannedNewItemsForModal.length} items`);
    // Keep modal open but trigger QR scan again
    handleQRScanForInternalReplacement();
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
                  console.log(`🔄 Reset tracking trước khi auto-change cho item: ${inventoryItemId}`);
                  const resetPromise = resetTracking(
                    exportRequestDetailId.toString(),
                    inventoryItemId
                  );
                  const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Reset tracking timeout")), 10000)
                  );
                  await Promise.race([resetPromise, timeoutPromise]);
                  console.log("✅ Reset tracking thành công trước khi auto-change");
                } catch (e) {
                  console.log("❌ Reset tracking thất bại/timeout trước auto-change:", e);
                  Alert.alert("Lỗi", "Không thể huỷ tracking mã cũ. Vui lòng thử lại!");
                  setAutoChangeLoading(null);
                  return; // Dừng lại, không tiếp tục auto-change
                }
              }

              // ✅ 2) SAU KHI RESET TRACKING THÀNH CÔNG, MỚI THỰC HIỆN AUTO-CHANGE
              const result = await autoChangeInventoryItem(inventoryItemId);
              console.log("✅ Auto change thành công:", result);

              // ✅ 3) CẬP NHẬT SCAN MAPPING VỚI ITEM MỚI - DEBUG CHECK
              console.log(`🔍 Debug check - result?.content?.id: ${result?.content?.id}`);
              console.log(`🔍 Debug check - exportRequestDetailId: ${exportRequestDetailId}`);
              console.log(`🔍 Debug check - condition result: ${!!(result?.content?.id && exportRequestDetailId)}`);
              
              if (result?.content?.id && exportRequestDetailId) {
                const newInventoryItemId = result.content.id;
                console.log(`🔄 Cập nhật scan mapping: ${inventoryItemId} → ${newInventoryItemId}`);
                console.log(`🔍 Debug - exportRequestDetailId: ${exportRequestDetailId}`);
                console.log(`🔍 Debug - Current scan mappings:`, JSON.stringify(scanMappings, null, 2));
                
                // Tìm mapping hiện tại
                const existingMapping = scanMappings.find(
                  mapping => mapping.exportRequestDetailId.toString() === exportRequestDetailId.toString() && 
                             mapping.inventoryItemId.toLowerCase() === inventoryItemId.toLowerCase()
                );
                console.log(`🔍 Debug - Existing mapping found:`, existingMapping);
                
                if (existingMapping) {
                  // Cập nhật mapping hiện tại
                  dispatch(updateInventoryItemId({
                    exportRequestDetailId: exportRequestDetailId,
                    oldInventoryItemId: inventoryItemId,
                    newInventoryItemId: newInventoryItemId
                  }));
                  console.log("✅ Đã cập nhật scan mapping hiện tại");
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
                  console.log("✅ Đã tạo scan mapping mới");
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
          <View key={item.id} style={styles.inventoryItemContainer}>
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
          </View>
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
          {exportRequestType === "INTERNAL" && multiSelectMode && isSelected && (
            <Text style={styles.selectedIndicatorText}>
              {isSelectedOld ? "✓ Đã chọn (cũ)" : "✓ Đã chọn (mới)"}
            </Text>
          )}
        </View>

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
            {exportRequestType === "INTERNAL" && multiSelectMode 
              ? (isSelected ? "Bỏ chọn" : "Chọn")
              : "Chọn"
            }
          </Text>
        </TouchableOpacity>
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
          } else if (internalManualChangeStep === 'select_new') {
            title = `Chọn sản phẩm muốn thay thế (${selectedNewItems.length} đã chọn)`;
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
                if (exportRequestType === "INTERNAL" && multiSelectMode && internalManualChangeStep === 'select_new') {
                  // Go back to select_old step
                  setInternalManualChangeStep('select_old');
                  setMultiSelectMode('old');
                  setSelectedNewItems([]);
                  // Reload old items for selection
                  handleInternalManualChangePress("");
                } else {
                  setCurrentPage("main");
                  // Reset INTERNAL states
                  setSelectedOldItems([]);
                  setSelectedNewItems([]);
                  setMultiSelectMode(null);
                  setInternalManualChangeStep('select_old');
                }
              } else if (currentPage === "reason_input") {
                if (exportRequestType === "INTERNAL" && multiSelectMode) {
                  // Go back to select_new step
                  setInternalManualChangeStep('select_new');
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

            {exportRequestStatus === ExportRequestStatus.IN_PROGRESS && (
              <View style={styles.scanButtonContainer}>
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={[styles.globalScanButton, exportRequestType === "INTERNAL" && styles.halfWidthButton]}
                    onPress={() => handleQRScanPress('normal')}
                  >
                    <Ionicons name="qr-code-outline" size={20} color="white" />
                    <Text style={styles.globalScanButtonText}>Quét QR</Text>
                  </TouchableOpacity>
                  
                  {exportRequestType === "INTERNAL" && (
                    <TouchableOpacity
                      style={[styles.manualChangeButton, styles.halfWidthButton]}
                      onPress={() => handleInternalManualChangePress("")}
                    >
                      <Ionicons name="swap-horizontal-outline" size={20} color="white" />
                      <Text style={styles.manualChangeButtonText}>Đổi thủ công</Text>
                    </TouchableOpacity>
                  )}
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
             !(exportRequestType === "INTERNAL" && multiSelectMode) && (
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
            {exportRequestType === "INTERNAL" && multiSelectMode && (
              <View style={styles.multiSelectSummaryContainer}>
                <Text style={styles.multiSelectSummaryTitle}>
                  {multiSelectMode === 'old' 
                    ? `Đã chọn ${selectedOldItems.length} sản phẩm để thay đổi`
                    : `Đã chọn ${selectedNewItems.length} sản phẩm để thay thế`
                  }
                </Text>
                
                {/* QR Scan button for select_new step */}
                {multiSelectMode === 'new' && (
                  <TouchableOpacity
                    style={styles.qrScanButtonForNewItems}
                    onPress={() => handleQRScanForInternalReplacement()}
                  >
                    <Ionicons name="qr-code-outline" size={20} color="white" />
                    <Text style={styles.qrScanButtonText}>Quét QR để thêm sản phẩm thay thế</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity
                  style={[
                    styles.nextStepButton,
                    (multiSelectMode === 'old' && selectedOldItems.length === 0) ||
                    (multiSelectMode === 'new' && selectedNewItems.length === 0)
                      ? styles.nextStepButtonDisabled
                      : {}
                  ]}
                  onPress={handleInternalStepTransition}
                  disabled={
                    (multiSelectMode === 'old' && selectedOldItems.length === 0) ||
                    (multiSelectMode === 'new' && selectedNewItems.length === 0)
                  }
                >
                  <Text style={styles.nextStepButtonText}>
                    {multiSelectMode === 'old' ? 'Tiếp theo' : 'Xác nhận lý do'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.itemCountContainer}>
              <Text style={styles.sectionTitle}>
                {exportRequestType === "INTERNAL" && multiSelectMode
                  ? (multiSelectMode === 'old' 
                      ? `Sản phẩm hiện tại (${filteredAllInventoryItems.length} sản phẩm)` 
                      : `Sản phẩm khả dụng (${filteredAllInventoryItems.length}/${allInventoryItems?.length || 0} sản phẩm)`
                    )
                  : `Hàng tồn kho khả dụng (${filteredAllInventoryItems.length}/${allInventoryItems?.length || 0} sản phẩm)`
                }
              </Text>
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
      {showMeasurementModal && scannedNewItemsForModal.length > 0 && (
        <View style={styles.warningOverlay}>
          <View style={styles.measurementModal}>
            <Text style={styles.measurementModalTitle}>Xác nhận thay đổi sản phẩm</Text>
            
            <ScrollView style={styles.measurementModalContent}>
              {/* Selected old items summary */}
              <View style={styles.measurementSection}>
                <Text style={styles.measurementSectionTitle}>Sản phẩm được thay đổi ({selectedOldItems.length}):</Text>
                {selectedOldItems.map((item, index) => (
                  <View key={item.id} style={styles.measurementItemInfo}>
                    <Text style={styles.measurementItemId}>{index + 1}. {item.id}</Text>
                    <Text style={styles.measurementItemValue}>Giá trị: {item.measurementValue} {itemUnitType || "đơn vị"}</Text>
                  </View>
                ))}
              </View>

              {/* Scanned new items info */}
              <View style={styles.measurementSection}>
                <Text style={styles.measurementSectionTitle}>Sản phẩm thay thế ({scannedNewItemsForModal.length} đã quét QR):</Text>
                {scannedNewItemsForModal.map((scannedItem, index) => (
                  <View key={scannedItem.id} style={styles.measurementItemInfo}>
                    <Text style={styles.measurementItemId}>{index + 1}. {scannedItem.id}</Text>
                    <Text style={styles.measurementItemValue}>Giá trị: {scannedItem.measurementValue} {itemUnitType || "đơn vị"}</Text>
                    <Text style={styles.measurementItemLocation}>Vị trí: {formatLocationString(scannedItem.storedLocationName)}</Text>
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
    borderRadius:10,
    padding:10,
    marginBottom:5,
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
});

export default ExportInventoryScreen;
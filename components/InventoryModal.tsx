import React, { useState, useEffect } from "react";
import {
  Modal,
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { InventoryItem, InventoryItemStatus } from "@/types/inventoryItem.type";
import { CheckedInventoryItem } from "@/types/stockCheckDetail.type";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import { ExportRequestStatus } from "@/types/exportRequest.type";
import { StockCheckStatus } from "@/types/stockCheck.type";

interface InventoryModalProps {
  visible: boolean;
  onClose: () => void;
  selectedItemCode: string;
  selectedInventoryItems: InventoryItem[];
  itemUnitType: string;
  inventoryLoading: boolean;
  searchText: string;
  onSearchTextChange: (text: string) => void;

  // Export-specific props (optional for stock check)
  exportRequest?: any;
  exportRequestDetailId?: number | null;
  autoChangeLoading?: string | null;
  onAutoChange?: (inventoryItemId: string) => void;
  onManualChangePress?: (originalInventoryItemId: string) => void;
  // Props for manual selection
  allInventoryItems?: InventoryItem[];
  manualSearchText?: string;
  onManualSearchTextChange?: (text: string) => void;
  selectedManualItem?: InventoryItem | null;
  changeReason?: string;
  onChangeReasonChange?: (text: string) => void;
  manualChangeLoading?: boolean;
  manualDataLoading?: boolean;
  onManualItemSelect?: (item: InventoryItem, originalInventoryItemId: string) => void;
  onManualChangeSubmit?: () => void;

  // Stock check specific props (optional for export)
  stockCheck?: any;
  checkedInventoryItemIds?: CheckedInventoryItem[];
  onResetTracking?: (inventoryItemId: string) => void;

  // QR scan navigation callback
  onQRScanPress?: (mode?: 'normal' | 'manual_change', originalItemId?: string) => void;
  
  // Stock check specific callback for marking item as unavailable
  onMarkAsUnavailable?: (inventoryItemId: string) => void;
}

type ModalPage = "main" | "manual_select" | "reason_input";

// Function to format location string from English to Vietnamese
const formatLocationString = (locationStr: string): string => {
  if (!locationStr) return locationStr;
  
  return locationStr
    .replace(/Zone:/g, 'Khu:')
    .replace(/Floor:/g, 'Tầng:')
    .replace(/Row:/g, 'Dãy:')
    .replace(/Line:/g, 'Hàng:');
};

const InventoryModal: React.FC<InventoryModalProps> = ({
  visible,
  onClose,
  selectedItemCode,
  selectedInventoryItems,
  itemUnitType,
  inventoryLoading,
  searchText,
  onSearchTextChange,
  exportRequest,
  exportRequestDetailId,
  autoChangeLoading,
  onAutoChange,
  onManualChangePress,
  allInventoryItems,
  manualSearchText,
  onManualSearchTextChange,
  selectedManualItem,
  changeReason,
  onChangeReasonChange,
  manualChangeLoading,
  manualDataLoading,
  onManualItemSelect,
  onManualChangeSubmit,
  // Stock check specific props
  stockCheck,
  checkedInventoryItemIds,
  onResetTracking,
  onQRScanPress,
  onMarkAsUnavailable,
}) => {
  const [modalPage, setModalPage] = useState<ModalPage>("main");
  const [originalItemId, setOriginalItemId] = useState<string>("");
  const [detailedInventoryItems, setDetailedInventoryItems] = useState<{ [key: string]: InventoryItem }>({});
  const [detailedItemsLoading, setDetailedItemsLoading] = useState(false);
  const [showMeasurementWarning, setShowMeasurementWarning] = useState(false);
  const [itemData, setItemData] = useState<any | null>(null);
  const [exportRequestDetailData, setExportRequestDetailData] = useState<any | null>(null);

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
        .filter(item => item.id !== oldItemId)
        .reduce((sum, item) => sum + (item.measurementValue || 0), 0);
      
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

  // Add inventory service
  const { fetchInventoryItemById, fetchInventoryItemsByExportRequestDetailId } = useInventoryService();
  const { getItemDetailById } = useItemService();
  const { fetchExportRequestDetailById } = useExportRequestDetail();

  // Fetch item data for measurement value display
  useEffect(() => {
    const fetchItemData = async () => {
      if (visible && selectedItemCode) {
        try {
          const itemInfo = await getItemDetailById(selectedItemCode);
          setItemData(itemInfo);
        } catch (error) {
          console.log("Error fetching item data:", error);
          setItemData(null);
        }
      }
    };

    fetchItemData();
  }, [visible, selectedItemCode, getItemDetailById]);

  // Fetch export request detail data for measurement value display
  useEffect(() => {
    const fetchExportRequestDetailData = async () => {
      if (visible && exportRequestDetailId) {
        try {
          const exportDetailInfo = await fetchExportRequestDetailById(exportRequestDetailId);
          setExportRequestDetailData(exportDetailInfo);
        } catch (error) {
          console.log("Error fetching export request detail data:", error);
          setExportRequestDetailData(null);
        }
      }
    };

    fetchExportRequestDetailData();
  }, [visible, exportRequestDetailId, fetchExportRequestDetailById]);

  // Fetch detailed inventory item data when modal opens or items change
  useEffect(() => {
    const fetchDetailedItems = async () => {
      if (!visible || !selectedInventoryItems.length || !stockCheck) return;

      setDetailedItemsLoading(true);
      const detailedItems: { [key: string]: InventoryItem } = {};

      for (const item of selectedInventoryItems) {
        try {
          const detailedItem = await fetchInventoryItemById(item.id);
          if (detailedItem) {
            detailedItems[item.id] = detailedItem;
          }
        } catch (error) {
          console.log(`Error fetching detailed item ${item.id}:`, error);
        }
      }

      setDetailedInventoryItems(detailedItems);
      setDetailedItemsLoading(false);
    };

    fetchDetailedItems();
  }, [visible, selectedInventoryItems, stockCheck, fetchInventoryItemById]);

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

  const handleManualChangePress = (originalInventoryItemId: string) => {
    setOriginalItemId(originalInventoryItemId);
    onManualChangePress?.(originalInventoryItemId);
    setModalPage("manual_select");
  };

  const handleManualItemSelect = async (item: InventoryItem) => {
    // Validate measurement for replacement when new item has lower measurement value (INTERNAL exports only)
    if (exportRequest?.type === "INTERNAL" && exportRequestDetailId && originalItemId) {
      // First, get original item to compare measurement values
      try {
        const originalItem = await fetchInventoryItemById(originalItemId);
        if (originalItem && (item.measurementValue || 0) < (originalItem.measurementValue || 0)) {
          console.log(`🔍 INTERNAL export - InventoryModal - Validating measurement replacement: new ${item.measurementValue} < old ${originalItem.measurementValue}`);
          
          const validation = await validateMeasurementForReplacement(
            originalItemId,
            item,
            exportRequestDetailId
          );
          
          if (!validation.isValid) {
            console.log(`❌ INTERNAL export - InventoryModal - Measurement replacement validation failed: total ${validation.totalAfterChange} < required ${validation.requiredValue}`);
            
            // Show error message
            Alert.alert(
              "Không thể chọn",
              "Giá trị đo lường của sản phẩm tồn kho không phù hợp với giá trị xuất của sản phẩm"
            );
            return; // Stop processing and don't select the item
          }
          console.log(`✅ INTERNAL export - InventoryModal - Measurement replacement validation passed: total ${validation.totalAfterChange} >= required ${validation.requiredValue}`);
        }
      } catch (error) {
        console.log("❌ Error validating original item:", error);
        // Continue with selection if validation fails to avoid blocking legitimate operations
      }
    }

    onManualItemSelect?.(item, originalItemId);
    setModalPage("reason_input");
  };

  // Function to check measurement warning before manual change submit
  const handleManualChangeSubmit = async () => {
    // Only show warnings for INTERNAL export requests with exceeded values
    if (exportRequest?.type === "INTERNAL" && selectedManualItem && itemData) {
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
    if (onManualChangeSubmit) {
      onManualChangeSubmit();
    }
  };

  // Handle warning confirmation
  const handleMeasurementWarningConfirm = async () => {
    setShowMeasurementWarning(false);
    if (onManualChangeSubmit) {
      onManualChangeSubmit();
    }
  };

  // Handle warning cancel
  const handleMeasurementWarningCancel = () => {
    setShowMeasurementWarning(false);
    // Optional: Reset selection or go back to manual selection
  };

  const handleClose = () => {
    setModalPage("main");
    setOriginalItemId("");
    onClose();
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
    const isStockCheckMode = !!stockCheck;

    // Calculate how many items in this group are checked
    const checkedCount = items.filter(item => 
      checkedInventoryItemIds?.some(checkedItem => checkedItem.inventoryItemId === item.id)
    ).length;

    return (
      <View style={styles.groupContainer}>
        {/* Group header showing measurement value */}
        <View style={styles.groupHeader}>
          <Text style={styles.groupMeasurementValue}>
            Giá trị đo: {measurementValue} {itemUnitType || 'đơn vị'}
          </Text>
          <Text style={styles.groupItemCount}>
            ({items.length} sản phẩm{checkedCount > 0 ? ` - ${checkedCount} đã quét` : ''})
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
                {exportRequest?.type === "INTERNAL" && (
                  <Text style={styles.inventoryItemSubtext}>
                    Giá trị xuất: {item.measurementValue}{" "}
                    {itemUnitType || "đơn vị"}
                  </Text>
                )}
              </View>

              {/* Show tracking status for both export and stock check */}
              {(item.isTrackingForExport || (isStockCheckMode && checkedInventoryItemIds?.some(checkedItem => checkedItem.inventoryItemId === item.id))) && (
                <View style={styles.trackingStatusContainer}>
                  <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                  <Text style={styles.trackingStatusText}>
                    Đã quét
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.actionButtonsRow}>
              {isStockCheckMode ? (
                // Stock check mode: Button logic based on status and tracking
                (() => {
                  // Hide buttons if stock check status is COUNTED
                  if (stockCheck?.status === StockCheckStatus.COUNTED) {
                    return null;
                  }

                  const isChecked = checkedInventoryItemIds?.some(checkedItem => checkedItem.inventoryItemId === item.id);
                  const detailedItem = detailedInventoryItems[item.id];
                  const status = detailedItem?.status;
                  const isTracking = isChecked; // isTracking is true when item is checked

                  // Logic based on status and tracking state
                  if (status === InventoryItemStatus.AVAILABLE && isTracking) {
                    // Status AVAILABLE + isTracking true = "Thanh lý" button
                    return (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.resetTrackingButton,
                        ]}
                        onPress={() => onResetTracking?.(item.id)}
                      >
                        <Ionicons name="refresh-outline" size={16} color="white" />
                        <Text style={styles.actionButtonText}>Thanh lý</Text>
                      </TouchableOpacity>
                    );
                  } else if (status === InventoryItemStatus.AVAILABLE && !isTracking) {
                    // Status AVAILABLE + isTracking false = "Không tìm thấy sản phẩm" button
                    return (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.unavailableButton,
                        ]}
                        onPress={() => onMarkAsUnavailable?.(item.id)}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="white" />
                        <Text style={styles.actionButtonText}>Không tìm thấy sản phẩm</Text>
                      </TouchableOpacity>
                    );
                  } else if (status === InventoryItemStatus.UNAVAILABLE) {
                    // Status UNAVAILABLE = "Không tìm thấy sản phẩm" button (disabled)
                    return (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.disabledButton,
                        ]}
                        disabled={true}
                      >
                        <Ionicons name="close-circle-outline" size={16} color="white" />
                        <Text style={styles.actionButtonText}>Không tìm thấy sản phẩm</Text>
                      </TouchableOpacity>
                    );
                  } else if (status === InventoryItemStatus.NEED_LIQUID) {
                    // Status NEED_LIQUID = "Đã yêu cầu thanh lý" button (disabled)
                    return (
                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.disabledButton,
                        ]}
                        disabled={true}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color="white" />
                        <Text style={styles.actionButtonText}>Đã yêu cầu thanh lý</Text>
                      </TouchableOpacity>
                    );
                  } else if (!isTracking) {
                    // isTracking false = "Quét QR" button
                    return (
                      // <TouchableOpacity
                      //   style={[
                      //     styles.actionButton,
                      //     styles.stockCheckScanButton,
                      //   ]}
                      //   onPress={() => {
                      //     if (onQRScanPress) {
                      //       onQRScanPress('normal');
                      //     }
                      //   }}
                      // >
                      //   <Ionicons name="qr-code-outline" size={16} color="white" />
                      //   <Text style={styles.actionButtonText}>Quét QR</Text>
                      // </TouchableOpacity>
                      null
                    );
                  } else {
                    // Default fallback - show QR scan button
                    return (
                      // <TouchableOpacity
                      //   style={[
                      //     styles.actionButton,
                      //     styles.stockCheckScanButton,
                      //   ]}
                      //   onPress={() => {
                      //     if (onQRScanPress) {
                      //       onQRScanPress('normal');
                      //     }
                      //   }}
                      // >
                      //   <Ionicons name="qr-code-outline" size={16} color="white" />
                      //   <Text style={styles.actionButtonText}>Quét QR</Text>
                      // </TouchableOpacity>
                      null
                    );
                  }
                })()
              ) : (
                // Export mode: Show original export buttons
                (() => {
                  // Hide buttons if export request status is COUNTED
                  if (exportRequest?.status === ExportRequestStatus.COUNTED) {
                    return null;
                  }

                  return (
                    <>
                      {/* !item.isTrackingForExport && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => {
                            if (onQRScanPress) {
                              onQRScanPress('normal');
                            } else {
                              // Fallback to direct navigation if callback not provided
                              handleClose();
                              router.push(
                                `/export/scan-qr?id=${exportRequest?.exportRequestId}`
                              );
                            }
                          }}
                        >
                          <Ionicons name="qr-code-outline" size={16} color="white" />
                          <Text style={styles.actionButtonText}>Quét QR</Text>
                        </TouchableOpacity>
                      ) */}

                      <TouchableOpacity
                        style={[
                          styles.actionButton,
                          styles.autoChangeActionButton,
                          autoChangeLoading === item.id && styles.actionButtonDisabled,
                        ]}
                        onPress={() => onAutoChange?.(item.id)}
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

                      <TouchableOpacity
                        style={[styles.actionButton, styles.manualChangeActionButton]}
                        onPress={() => handleManualChangePress(item.id)}
                      >
                        <Ionicons name="create-outline" size={16} color="white" />
                        <Text style={styles.actionButtonText}>Đổi thủ công</Text>
                      </TouchableOpacity>
                    </>
                  );
                })()
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderManualInventoryItem = ({ item }: { item: InventoryItem }) => (
    <View style={styles.inventoryItemRow}>
      <View style={styles.inventoryItemContent}>
        <Text style={styles.inventoryItemId}>{item.id}</Text>
        <Text style={styles.inventoryItemSubtext}>
          Vị trí: {formatLocationString(item.storedLocationName)}
        </Text>
        <Text style={styles.inventoryItemSubtext}>
          Giá trị: {item.measurementValue} {itemUnitType || "đơn vị"}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => handleManualItemSelect(item)}
      >
        <Text style={styles.selectButtonText}>Chọn</Text>
      </TouchableOpacity>
    </View>
  );

  const renderModalHeader = () => {
    let title = "";
    switch (modalPage) {
      case "main":
        title = `Danh sách sản phẩm tồn kho (Mã hàng #${selectedItemCode})`;
        break;
      case "manual_select":
        title = `Chọn hàng tồn kho (Mã hàng #${selectedItemCode})`;
        break;
      case "reason_input":
        title = "Nhập lý do đổi sản phẩm";
        break;
    }

    return (
      <View style={styles.modalHeader}><View style={styles.modalHeaderUpper}>
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



        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
      </View>
        {/* Display ItemId measurement value */}
        {modalPage === "main" && itemData && (

          <View style={styles.warningMeasurementInfo}>
            <Text style={styles.itemMeasurementTextLeft}>
              Giá trị đo lường chuẩn: <Text style={styles.itemMeasurementText}>{itemData.measurementValue || 0} {itemData.measurementUnit || ''}</Text>
            </Text>
            {exportRequestDetailData && (
              <Text style={styles.itemMeasurementTextLeft}>
                Giá trị xuất yêu cầu: <Text style={styles.itemMeasurementText}>{exportRequestDetailData.measurementValue || 0} {itemData.measurementUnit || itemUnitType || ''}</Text>
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderModalContent = () => {
    switch (modalPage) {
      case "main":
        return (
          <>
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

            {exportRequest?.status === ExportRequestStatus.IN_PROGRESS && (
              <View style={styles.scanButtonContainer}>
                <TouchableOpacity
                  style={styles.globalScanButton}
                  onPress={() => {
                    if (onQRScanPress) {
                      onQRScanPress('normal');
                    } else if (exportRequest?.exportRequestId) {
                      handleClose();
                      router.push(`/export/scan-qr?id=${exportRequest.exportRequestId}`);
                    }
                  }}
                >
                  <Ionicons name="qr-code-outline" size={20} color="white" />
                  <Text style={styles.globalScanButtonText}>Quét QR</Text>
                </TouchableOpacity>
              </View>
            )}

            {inventoryLoading || detailedItemsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1677ff" />
                <Text style={styles.loadingText}>Đang tải danh sách...</Text>
              </View>
            ) : stockCheck ? (
              // Stock check mode: Show grouped items by measurement value
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
            ) : (
              // Export mode: Show individual items
              <FlatList
                data={filteredInventoryItems}
                renderItem={({ item }) => (
                  <View style={styles.inventoryItemContainer}>
                    <View style={styles.inventoryItemRow}>
                      <View style={styles.inventoryItemContent}>
                        <Text style={styles.inventoryItemId}>{item.id}</Text>
                        <Text style={styles.inventoryItemSubtext}>
                          Vị trí: {formatLocationString(item.storedLocationName)}
                        </Text>
                        {exportRequest?.type === "INTERNAL" && (
                          <Text style={styles.inventoryItemSubtext}>
                            Giá trị xuất: {item.measurementValue}{" "}
                            {itemUnitType || "đơn vị"}
                          </Text>
                        )}
                      </View>

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
                      {exportRequest?.status !== ExportRequestStatus.COUNTED && (
                        <>
                          {/* !item.isTrackingForExport && (
                            <TouchableOpacity
                              style={styles.actionButton}
                              onPress={() => {
                                if (onQRScanPress) {
                                  onQRScanPress('normal');
                                } else {
                                  handleClose();
                                  router.push(
                                    `/export/scan-qr?id=${exportRequest?.exportRequestId}`
                                  );
                                }
                              }}
                            >
                              <Ionicons name="qr-code-outline" size={16} color="white" />
                              <Text style={styles.actionButtonText}>Quét QR</Text>
                            </TouchableOpacity>
                          ) */}

                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              styles.autoChangeActionButton,
                              autoChangeLoading === item.id && styles.actionButtonDisabled,
                            ]}
                            onPress={() => onAutoChange?.(item.id)}
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

                          <TouchableOpacity
                            style={[styles.actionButton, styles.manualChangeActionButton]}
                            onPress={() => handleManualChangePress(item.id)}
                          >
                            <Ionicons name="create-outline" size={16} color="white" />
                            <Text style={styles.actionButtonText}>Đổi thủ công</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                )}
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
                onChangeText={onManualSearchTextChange}
              />
            </View>

            {/* QR Scan Button for Manual Change */}
            {exportRequest?.status === ExportRequestStatus.IN_PROGRESS && (
              <View style={styles.scanButtonContainer}>
                <TouchableOpacity
                  style={styles.manualScanButton}
                  onPress={() => {
                    if (onQRScanPress) {
                      onQRScanPress('manual_change', originalItemId);
                    }
                  }}
                >
                  <Ionicons name="qr-code-outline" size={20} color="white" />
                  <Text style={styles.manualScanButtonText}>Quét QR để chọn sản phẩm</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.itemCountContainer}>
              <Text style={styles.sectionTitle}>
                Hàng tồn kho khả dụng ({filteredAllInventoryItems.length}/
                {allInventoryItems?.length || 0} sản phẩm)
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
              <View style={styles.selectedItemInfo}>
                <Text style={styles.selectedItemTitle}>Item được chọn:</Text>
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

              <View style={styles.reasonInputSection}>
                <Text style={styles.reasonLabel}>Lý do đổi item:</Text>
                <RNTextInput
                  style={styles.reasonInput}
                  placeholder="Nhập lý do đổi item..."
                  value={changeReason || ""}
                  onChangeText={onChangeReasonChange}
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
                    // ✅ Disable khi loading hoặc không có lý do
                    (manualChangeLoading || !(changeReason || "").trim()) && styles.submitReasonButtonDisabled,
                  ]}
                  onPress={handleManualChangeSubmit}
                  disabled={!(changeReason || "").trim() || manualChangeLoading} // ✅ Disable logic
                >
                  {manualChangeLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text
                      style={[
                        styles.submitReasonButtonText,
                        // ✅ Đổi màu text khi disabled
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
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {renderModalHeader()}
          {renderModalContent()}
        </View>
      </View>
      
      {/* Measurement Warning Dialog */}
      {showMeasurementWarning && selectedManualItem && itemData && (
        <View style={styles.warningOverlay}>
          <View style={styles.warningDialog}>
            <Text style={styles.warningTitle}>Cảnh báo giá trị xuất</Text>
            <Text style={styles.warningText}>
              Giá trị đo lường của inventory item này đã vượt quá so với giá trị cần xuất.
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
    </Modal>
  );
};

const styles = StyleSheet.create({
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


    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalHeaderUpper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,

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
  backButton: {
    padding: 4,
    marginRight: 8,
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
  submitReasonButtonDisabled: {
    backgroundColor: "#ccc", // Màu xám khi disabled
    elevation: 0,
    shadowOpacity: 0,
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
  stockCheckTrackButton: {
    backgroundColor: "#6c5ce7",
  },
  stockCheckScanButton: {
    backgroundColor: "#007bff",
  },
  resetTrackingButton: {
    backgroundColor: "#ff6b35",
  },
  unavailableButton: {
    backgroundColor: "#dc3545",
  },
  disabledButton: {
    backgroundColor: "#6c757d",
    opacity: 0.7,
  },
  checkedButton: {
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

  submitReasonButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  scanButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    marginHorizontal: 20,
    marginBottom:5,
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
});

export default InventoryModal;

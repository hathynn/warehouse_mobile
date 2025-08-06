import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput as RNTextInput,
  ActivityIndicator,
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { InventoryItem } from "@/types/inventoryItem.type";
import { ExportRequestStatus } from "@/types/exportRequest.type";

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
  onManualItemSelect?: (item: InventoryItem, originalInventoryItemId: string) => void;
  onManualChangeSubmit?: () => void;

  // Stock check specific props (optional for export)
  stockCheck?: any;
  checkedInventoryItemIds?: string[];
}

type ModalPage = "main" | "manual_select" | "reason_input";

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
  onManualItemSelect,
  onManualChangeSubmit,
  // Stock check specific props
  stockCheck,
  checkedInventoryItemIds,
}) => {
  const [modalPage, setModalPage] = useState<ModalPage>("main");
  const [originalItemId, setOriginalItemId] = useState<string>("");

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

  const filteredInventoryItems = selectedInventoryItems.filter((item) =>
    enhancedSearch(item, searchText)
  );

  const filteredAllInventoryItems = (allInventoryItems || []).filter((item) =>
    enhancedSearch(item, manualSearchText || "")
  );

  const handleManualChangePress = (originalInventoryItemId: string) => {
    setOriginalItemId(originalInventoryItemId);
    onManualChangePress?.(originalInventoryItemId);
    setModalPage("manual_select");
  };

  const handleManualItemSelect = (item: InventoryItem) => {
    onManualItemSelect?.(item, originalItemId);
    setModalPage("reason_input");
  };

  const handleClose = () => {
    setModalPage("main");
    setOriginalItemId("");
    onClose();
  };

  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    // Determine if this is stock check mode
    const isStockCheckMode = !!stockCheck;

    return (
      <View style={styles.inventoryItemContainer}>
        <View style={styles.inventoryItemRow}>
          <View style={styles.inventoryItemContent}>
            <Text style={styles.inventoryItemId}>{item.id}</Text>
            <Text style={styles.inventoryItemSubtext}>
              Vị trí: {item.storedLocationName}
            </Text>
            {exportRequest?.type === "INTERNAL" && (
              <Text style={styles.inventoryItemSubtext}>
                Giá trị cần xuất: {item.measurementValue}{" "}
                {itemUnitType || "đơn vị"}
              </Text>
            )}
          </View>

          {/* Show tracking status for both export and stock check */}
          {(item.isTrackingForExport || (isStockCheckMode && checkedInventoryItemIds?.includes(item.id))) && (
            <View style={styles.trackingStatusContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.trackingStatusText}>
                {isStockCheckMode ? "Đã kiểm" : "Đã quét"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtonsRow}>
          {isStockCheckMode ? (
            // Stock check mode: Show checked button only if item is tracked
            (() => {
              const isChecked = checkedInventoryItemIds?.includes(item.id);

              if (isChecked) {
                return (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.checkedButton,
                    ]}
                    disabled={true}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="white" />
                    <Text style={styles.actionButtonText}>Checked</Text>
                  </TouchableOpacity>
                );
              }

              // If not checked, show nothing
              return null;
            })()
          ) : (
            // Export mode: Show original export buttons
            <>
              {!item.isTrackingForExport && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    handleClose();
                    router.push(
                      `/export/scan-qr?id=${exportRequest?.exportRequestId}`
                    );
                  }}
                >
                  <Ionicons name="qr-code-outline" size={16} color="white" />
                  <Text style={styles.actionButtonText}>Quét QR</Text>
                </TouchableOpacity>
              )}

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
                onPress={() => onManualChangePress?.(item.id)}
              >
                <Ionicons name="create-outline" size={16} color="white" />
                <Text style={styles.actionButtonText}>Đổi thủ công</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

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

        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
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
                placeholder="Tìm kiếm theo mã, vị trí, giá trị... (VD: CHI-TH-001)"
                value={manualSearchText || ""}
                onChangeText={onManualSearchTextChange}
              />
            </View>

            <View style={styles.itemCountContainer}>
              <Text style={styles.sectionTitle}>
                Tất cả inventory items ({filteredAllInventoryItems.length}/
                {allInventoryItems?.length || 0} sản phẩm)
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
            onPress={onManualChangeSubmit}
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
});

export default InventoryModal;
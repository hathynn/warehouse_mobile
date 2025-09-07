import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
// Removed Camera imports - scanning is now handled by separate screen
import { router } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import { ImportOrderStatus, ImportType } from "@/types/importOrder.type";

interface ImportOrderDetailItem {
  id: string;
  productName: string;
  sku: string;
  itemId: string;
  inventoryItemId: string;
  expectedQuantity: number;
  countedQuantity: number;
  expectedMeasurementValue?: number;
  actualMeasurementValue?: number;
  measurementUnit?: string;
  status: ImportOrderStatus | null;
  products: {
    id: number;
    serialNumber: string;
    location: {
      zone: string;
      floor: string;
      row: string;
      line: string;
    };
  }[];
}

interface ImportOrderDetailsTableProps {
  importOrderDetails: ImportOrderDetailItem[];
  onStorageComplete?: () => void; // Callback khi hoàn thành quy trình nhập kho
  importType?: ImportType | null;
  isLoading?: boolean; // Loading state
  importOrderId?: string; // Add importOrderId prop for navigation
  confirmedStorageItems?: Set<string>; // Items that have been scanned and confirmed for storage
  onStorageConfirmed?: (inventoryItemId: string) => void; // Callback khi scan thành công
}

interface LocationFilter {
  zone: string | null;
  floor: string | null;
  row: string | null;
}

const ImportOrderDetailsTable: React.FC<ImportOrderDetailsTableProps> = ({
  importOrderDetails,
  onStorageComplete,
  importType,
  isLoading = false,
  importOrderId,
  confirmedStorageItems = new Set(),
  onStorageConfirmed,
}) => {
  const [locationFilter, setLocationFilter] = useState<LocationFilter>({
    zone: null,
    floor: null,
    row: null,
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  // Removed unused state for modal-based scanning

  // Removed camera permission code as scanning is now handled by separate screen


  // Kiểm tra xem có phải trạng thái READY_TO_STORE không
  const isReadyToStore =
    importOrderDetails.length > 0 &&
    importOrderDetails[0]?.status === ImportOrderStatus.READY_TO_STORE;

  // Kiểm tra xem đã check đủ tất cả items chưa
  const allItemsChecked = isReadyToStore ? 
    (importType === ImportType.RETURN 
      ? importOrderDetails.every(item => confirmedStorageItems.has(item.inventoryItemId)) // RETURN: cần scan hết
      : true // Non-RETURN: luôn ready
    ) : 
    false;

  // Handler để hoàn thành quy trình nhập kho
  const handleCompleteStorage = () => {
    if (onStorageComplete && (!isReadyToStore || allItemsChecked)) {
      onStorageComplete();
    }
  };

  // Handler cho việc scan QR (chỉ cho RETURN type)
  const handleScanItem = (inventoryItemId: string) => {
    // Navigate to separate QR scan screen for storage confirmation
    router.push({
      pathname: "/import/scan-qr-storage-confirmation",
      params: {
        inventoryItemId: inventoryItemId,
        importOrderId: importOrderId || "",
      }
    });
  };

  // Removed handleConfirmItem - không cần button riêng cho từng item với non-RETURN type

  // Removed handleScanSuccess - scanning is now handled by separate screen

  // Extract unique locations from all products
  const availableLocations = useMemo(() => {
    const zones = new Set<string>();
    const floors = new Set<string>();
    const rows = new Set<string>();

    importOrderDetails.forEach((item) => {
      item.products.forEach((product) => {
        const { zone, floor, row } = product.location;
        if (zone && zone !== "Không rõ vị trí") zones.add(zone);
        if (floor && floor !== "Không rõ vị trí") floors.add(floor);
        if (row && row !== "Không rõ vị trí") rows.add(row);
      });
    });

    return {
      zones: Array.from(zones).sort(),
      floors: Array.from(floors).sort(),
      rows: Array.from(rows).sort(),
    };
  }, [importOrderDetails]);

  // Helper function to get primary location for sorting
  const getPrimaryLocation = (item: ImportOrderDetailItem) => {
    if (!item.products || item.products.length === 0) {
      return {
        zone: "Không rõ vị trí",
        floor: "Không rõ vị trí",
        row: "Không rõ vị trí",
        line: "Không rõ vị trí",
      };
    }

    const sortedLocations = [...item.products.map((p) => p.location)].sort(
      (a, b) => {
        const zoneCompare = sortZones(a.zone, b.zone);
        if (zoneCompare !== 0) return zoneCompare;

        const floorCompare = sortFloorRow(a.floor, b.floor);
        if (floorCompare !== 0) return floorCompare;

        const rowCompare = sortFloorRow(a.row, b.row);
        if (rowCompare !== 0) return rowCompare;

        return naturalSort(a.line, b.line);
      }
    );

    return sortedLocations[0]; // lấy vị trí nhỏ nhất (thứ tự alpha + số tăng dần)
  };

  const naturalSort = (a: string, b: string): number => {
    const collator = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: "base",
    });
    return collator.compare(a, b);
  };

  const sortZones = (a: string, b: string): number => {
    return a.localeCompare(b, "vi", { sensitivity: "base" });
  };

  const sortFloorRow = (a: string, b: string): number => {
    const aNum = parseInt(a.match(/\d+/)?.[0] || "0");
    const bNum = parseInt(b.match(/\d+/)?.[0] || "0");

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }

    return naturalSort(a, b);
  };

  //Zone -> Floor -> Row -> line
 const sortedByLocation = useMemo(() => {
  return [...importOrderDetails].sort((a, b) => {
    // Định nghĩa các trạng thái mà bạn muốn sắp xếp theo vị trí
    const statusesToStoreSort = [
      ImportOrderStatus.READY_TO_STORE,
      ImportOrderStatus.STORED,
    ];

    const aHasLocationStatus = statusesToStoreSort.includes(a.status);
    const bHasLocationStatus = statusesToStoreSort.includes(b.status);

    // 1. Ưu tiên các sản phẩm có trạng thái cần sắp xếp vị trí lên trên
    if (aHasLocationStatus !== bHasLocationStatus) {
      return aHasLocationStatus ? -1 : 1; // a lên trước nếu a có trạng thái này
    }

    // 2. Nếu cả hai cùng có trạng thái cần sắp xếp vị trí (hoặc cả hai đều không)
    if (aHasLocationStatus && bHasLocationStatus) {
      // Sắp xếp theo vị trí: Zone -> Floor -> Row -> Line
      const aLocation = getPrimaryLocation(a);
      const bLocation = getPrimaryLocation(b);

      const zoneCompare = sortZones(aLocation.zone, bLocation.zone);
      if (zoneCompare !== 0) return zoneCompare;

      const floorCompare = sortFloorRow(aLocation.floor, bLocation.floor);
      if (floorCompare !== 0) return floorCompare;

      const rowCompare = sortFloorRow(aLocation.row, bLocation.row);
      if (rowCompare !== 0) return rowCompare;

      const lineCompare = naturalSort(aLocation.line, bLocation.line);
      if (lineCompare !== 0) return lineCompare;

      // Fallback: sort by ID or other criteria
      const aId = parseInt(a.id);
      const bId = parseInt(b.id);
      if (!isNaN(aId) && !isNaN(bId)) {
        return aId - bId;
      }
      return naturalSort(a.productName, b.productName);
    }

    // 3. Nếu cả hai item đều không có trạng thái cần sắp xếp vị trí
    // thì sắp xếp theo ID như logic cũ của bạn.
    const aId = parseInt(a.id);
    const bId = parseInt(b.id);
    if (!isNaN(aId) && !isNaN(bId)) {
      return aId - bId;
    }

    // Fallback to product name if ID is not numeric
    return naturalSort(a.productName, b.productName);
  });
}, [importOrderDetails]);

  // Filter the sorted data based on location filters
  const filteredAndSortedData = useMemo(() => {
    if (!locationFilter.zone && !locationFilter.floor && !locationFilter.row) {
      return sortedByLocation;
    }

    return sortedByLocation.filter((item) => {
      return item.products.some((product) => {
        const { zone, floor, row } = product.location;

        const zoneMatch = !locationFilter.zone || zone === locationFilter.zone;
        const floorMatch =
          !locationFilter.floor || floor === locationFilter.floor;
        const rowMatch = !locationFilter.row || row === locationFilter.row;

        return zoneMatch && floorMatch && rowMatch;
      });
    });
  }, [sortedByLocation, locationFilter]);

  const clearFilters = () => {
    setLocationFilter({ zone: null, floor: null, row: null });
  };

  // Check if any filter is active
  const hasActiveFilters =
    locationFilter.zone || locationFilter.floor || locationFilter.row;

  const renderDetailItem = ({ item }: { item: ImportOrderDetailItem }) => {
    const isCompleted =
      item.status === ImportOrderStatus.READY_TO_STORE ||
      item.status === ImportOrderStatus.STORED;

    const progressPercentage = Math.round(
      (item.countedQuantity / item.expectedQuantity) * 100
    );

    let progressColor = "#e63946";
    if (item.countedQuantity > item.expectedQuantity) {
      progressColor = "#ff9500";
    } else if (item.countedQuantity === item.expectedQuantity) {
      progressColor = "#2ecc71";
    }

    // Group products by location and format location string
    const locationGroups = item.products.reduce((acc, product) => {
      const { zone, floor, row, line } = product.location;

      const isUnknown = [zone, floor, row, line].every(
        (v) => v === "Không rõ vị trí"
      );

      const locationKey = isUnknown
        ? "Không rõ vị trí"
        : `${zone} - ${floor} - ${row} - ${line}`;

      if (!acc[locationKey]) acc[locationKey] = 0;
      acc[locationKey]++;
      return acc;
    }, {} as Record<string, number>);

    // Sort location groups by zone -> floor -> row -> line
    const sortedLocationGroups = Object.entries(locationGroups).sort(
      ([a], [b]) => {
        if (a === "Không rõ vị trí") return 1;
        if (b === "Không rõ vị trí") return -1;

        const [zoneA, floorA, rowA, lineA] = a.split(" - ");
        const [zoneB, floorB, rowB, lineB] = b.split(" - ");

        const zoneCompare = sortZones(zoneA, zoneB);
        if (zoneCompare !== 0) return zoneCompare;

        const floorCompare = sortFloorRow(floorA, floorB);
        if (floorCompare !== 0) return floorCompare;

        const rowCompare = sortFloorRow(rowA, rowB);
        if (rowCompare !== 0) return rowCompare;

        return naturalSort(lineA, lineB);
      }
    );

    return (
      <View style={styles.detailCard}>
        <View style={styles.detailHeader}>
          <View style={styles.detailIdContainer}>
            <Text style={styles.detailId}>
              {importType === ImportType.RETURN ? item.inventoryItemId || item.id : item.id}
            </Text>
          </View>
        </View>
        
        {/* Show scan button and checkbox for READY_TO_STORE status in separate row - Only for RETURN type */}
        {isReadyToStore && importType === ImportType.RETURN && (
          <View style={styles.actionRow}>
            {confirmedStorageItems.has(item.inventoryItemId) ? (
              <View style={styles.checkedContainer}>
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                <Text style={styles.checkedText}>Đã kiểm tra</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => handleScanItem(item.inventoryItemId)}
              >
                <Ionicons name="scan" size={20} color="#1677ff" />
                <Text style={styles.scanText}>Quét để xác nhận</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        <View style={styles.detailInfoSection}>
          <Text
            style={styles.detailName}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.productName}
          </Text>
          <Text style={styles.detailSku}>
            {importType === ImportType.RETURN 
              ? `Mã sản phẩm ${item.inventoryItemId || item.itemId}` 
              : `Mã sản phẩm ${item.itemId}`}
          </Text>
        </View>

        {/* Show quantity and progress only when not completed */}
        {!isCompleted && (
          <View style={styles.quantitySection}>
            <View style={styles.quantityRow}>
              <View style={styles.quantityItem}>
                <Text style={styles.quantityLabel}>Số lượng mong đợi:</Text>
                <Text style={styles.quantityValue}>
                  {item.expectedQuantity}
                </Text>
              </View>
              <View style={styles.quantityItem}>
                <Text style={styles.quantityLabel}>Đã kiểm đếm:</Text>
                <Text
                  style={[
                    styles.quantityValue,
                    item.countedQuantity < item.expectedQuantity
                      ? styles.incompleteQuantity
                      : item.countedQuantity > item.expectedQuantity
                      ? styles.overQuantity
                      : styles.completeQuantity,
                  ]}
                >
                  {item.countedQuantity}
                </Text>
              </View>
            </View>

            {/* Show measurement values for return imports */}
            {importType === ImportType.RETURN && (
              <View style={styles.quantityRow}>
                {/* <View style={styles.quantityItem}>
                  <Text style={styles.quantityLabel}>Giá trị đo lường mong đợi:</Text>
                  <Text style={styles.quantityValue}>
                    {item.expectedMeasurementValue || 0}
                    {item.measurementUnit && ` ${item.measurementUnit}`}
                  </Text>
                </View> */}
                <View style={styles.quantityItem}>
                  <Text style={styles.quantityLabel}>Giá trị đo lường kiểm đếm:</Text>
                  <Text
                    style={[
                      styles.quantityValue,
                      (item.actualMeasurementValue || 0) < (item.expectedMeasurementValue || 0)
                        ? styles.incompleteQuantity
                        : (item.actualMeasurementValue || 0) > (item.expectedMeasurementValue || 0)
                        ? styles.overQuantity
                        : styles.completeQuantity,
                    ]}
                  >
                    {item.actualMeasurementValue || 0}
                    {item.measurementUnit && ` ${item.measurementUnit}`}
                  </Text>
                </View>
              </View>
            )}

            {/* Hide progress bar for return imports */}
            {importType !== ImportType.RETURN && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(progressPercentage, 100)}%`,
                        backgroundColor: progressColor,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{progressPercentage}%</Text>
              </View>
            )}
          </View>
        )}

        {/* Show location info only when completed */}
        {isCompleted && sortedLocationGroups.length > 0 && (
          <View style={styles.locationContainer}>
            <View style={styles.locationHeader}>
              <Ionicons name="location" size={16} color="#1677ff" />
              <Text style={styles.locationTitle}>Vị trí sản phẩm</Text>
            </View>

            <View style={styles.locationList}>
              {sortedLocationGroups.map(([location, count]) => (
                <View key={location} style={styles.locationItem}>
                  <Text style={styles.locationText}>{location}</Text>
                  <Text style={styles.locationCount}>({count} sản phẩm)</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Badge đã nhập kho khi được check */}
        {/* {isChecked && isReadyToStore && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#10b981" />
            <Text style={styles.completedText}>Đã nhập kho</Text>
          </View>
        )} */}
      </View>
    );
  };

  // Removed scan QR modal - scanning is now handled by separate screen

  // Render filter modal
  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Lọc theo vị trí</Text>
            <TouchableOpacity
              onPress={() => setShowFilterModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filterOptions}>
            {/* Zone Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Khu vực (Zone)</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  !locationFilter.zone && styles.filterOptionActive,
                ]}
                onPress={() =>
                  setLocationFilter((prev) => ({ ...prev, zone: null }))
                }
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    !locationFilter.zone && styles.filterOptionTextActive,
                  ]}
                >
                  Tất cả
                </Text>
              </TouchableOpacity>
              {availableLocations.zones.map((zone) => (
                <TouchableOpacity
                  key={zone}
                  style={[
                    styles.filterOption,
                    locationFilter.zone === zone && styles.filterOptionActive,
                  ]}
                  onPress={() =>
                    setLocationFilter((prev) => ({ ...prev, zone }))
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      locationFilter.zone === zone &&
                        styles.filterOptionTextActive,
                    ]}
                  >
                    {zone}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Floor Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Tầng (Floor)</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  !locationFilter.floor && styles.filterOptionActive,
                ]}
                onPress={() =>
                  setLocationFilter((prev) => ({ ...prev, floor: null }))
                }
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    !locationFilter.floor && styles.filterOptionTextActive,
                  ]}
                >
                  Tất cả
                </Text>
              </TouchableOpacity>
              {availableLocations.floors.map((floor) => (
                <TouchableOpacity
                  key={floor}
                  style={[
                    styles.filterOption,
                    locationFilter.floor === floor && styles.filterOptionActive,
                  ]}
                  onPress={() =>
                    setLocationFilter((prev) => ({ ...prev, floor }))
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      locationFilter.floor === floor &&
                        styles.filterOptionTextActive,
                    ]}
                  >
                    {floor}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Row Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Hàng (Row)</Text>
              <TouchableOpacity
                style={[
                  styles.filterOption,
                  !locationFilter.row && styles.filterOptionActive,
                ]}
                onPress={() =>
                  setLocationFilter((prev) => ({ ...prev, row: null }))
                }
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    !locationFilter.row && styles.filterOptionTextActive,
                  ]}
                >
                  Tất cả
                </Text>
              </TouchableOpacity>
              {availableLocations.rows.map((row) => (
                <TouchableOpacity
                  key={row}
                  style={[
                    styles.filterOption,
                    locationFilter.row === row && styles.filterOptionActive,
                  ]}
                  onPress={() =>
                    setLocationFilter((prev) => ({ ...prev, row }))
                  }
                >
                  <Text
                    style={[
                      styles.filterOptionText,
                      locationFilter.row === row &&
                        styles.filterOptionTextActive,
                    ]}
                  >
                    {row}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
              <Text style={styles.clearButtonText}>Xóa bộ lọc</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => setShowFilterModal(false)}
            >
              <Text style={styles.applyButtonText}>Áp dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <View style={styles.detailsHeaderContainer}>
        <Text style={styles.cardTitle}>Chi tiết đơn nhập</Text>
        <View style={styles.headerRight}>
          <View style={styles.detailsCountContainer}>
            <Text style={styles.detailsCountText}>
              {filteredAndSortedData.length}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.searchFilterRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <Text style={styles.searchPlaceholder}>Tìm kiếm sản phẩm...</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            hasActiveFilters && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <Ionicons
            name="filter"
            size={18}
            color={hasActiveFilters ? "white" : "#1677ff"}
          />
          {hasActiveFilters && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {
                  [
                    locationFilter.zone,
                    locationFilter.floor,
                    locationFilter.row,
                  ].filter(Boolean).length
                }
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Active filters display */}
      {hasActiveFilters && (
        <View style={styles.activeFiltersContainer}>
          <Text style={styles.activeFiltersTitle}>Bộ lọc đang áp dụng:</Text>
          <View style={styles.activeFiltersList}>
            {locationFilter.zone && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>
                  Zone: {locationFilter.zone}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setLocationFilter((prev) => ({ ...prev, zone: null }))
                  }
                >
                  <Ionicons name="close-circle" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            {locationFilter.floor && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>
                  Floor: {locationFilter.floor}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setLocationFilter((prev) => ({ ...prev, floor: null }))
                  }
                >
                  <Ionicons name="close-circle" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
            {locationFilter.row && (
              <View style={styles.activeFilterTag}>
                <Text style={styles.activeFilterText}>
                  Row: {locationFilter.row}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setLocationFilter((prev) => ({ ...prev, row: null }))
                  }
                >
                  <Ionicons name="close-circle" size={16} color="#666" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1677ff" />
          <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAndSortedData}
          renderItem={renderDetailItem}
          keyExtractor={(item) => item.id.toString()}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.detailSeparator} />}
          contentContainerStyle={styles.detailsList}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào</Text>
              <Text style={styles.emptySubText}>Thử điều chỉnh bộ lọc</Text>
            </View>
          )}
        />
      )}

      {/* Button hoàn thành nhập kho */}
      {isReadyToStore && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              !allItemsChecked && styles.disabledButton
            ]}
            onPress={handleCompleteStorage}
            disabled={!allItemsChecked}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={allItemsChecked ? "white" : "#999"}
            />
            <Text style={[
              styles.completeButtonText,
              !allItemsChecked && styles.disabledButtonText
            ]}>
              {allItemsChecked 
                ? "Xác nhận hoàn thành nhập kho" 
                : (importType === ImportType.RETURN 
                    ? `Kiểm tra sản phẩm (${confirmedStorageItems.size}/${importOrderDetails.length})`
                    : "Xác nhận hoàn thành nhập kho"
                  )
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {renderFilterModal()}
      {/* Removed scan modal - scanning is now handled by separate screen */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  // Header of details section
  detailsHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  detailsCountContainer: {
    backgroundColor: "#1677ff",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  detailsCountText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginRight: 10,
  },
  searchPlaceholder: {
    color: "#999",
    marginLeft: 8,
    fontSize: 14,
  },
  filterButton: {
    backgroundColor: "#e6f7ff",
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#1677ff",
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#e63946",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },

  // Active filters
  activeFiltersContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  activeFiltersTitle: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  activeFiltersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  activeFilterTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  activeFilterText: {
    fontSize: 12,
    color: "#333",
    marginRight: 4,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  filterOptions: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
  },
  filterOptionActive: {
    backgroundColor: "#1677ff",
  },
  filterOptionText: {
    fontSize: 14,
    color: "#333",
  },
  filterOptionTextActive: {
    color: "white",
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "column",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    gap: 12,
  },
  clearButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    alignItems: "center",
  },
  clearButtonText: {
    color: "#666",
    fontWeight: "500",
  },
  applyButton: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#1677ff",
    alignItems: "center",
  },
  applyButtonText: {
    color: "white",
    fontWeight: "500",
  },

  // Loading state
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },

  detailsList: {
    paddingTop: 8,
  },

  // Detail item styles (keeping existing styles)
  detailCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  detailIdContainer: {
    backgroundColor: "#e6f7ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  detailId: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1677ff",
  },
  detailInfoSection: {
    marginBottom: 12,
  },
  detailName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  detailSku: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  // Quantity section
  quantitySection: {
    marginBottom: 12,
  },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  quantityItem: {
    flexDirection: "column",
  },
  quantityLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  incompleteQuantity: {
    color: "#e63946",
  },
  completeQuantity: {
    color: "#2ecc71",
  },
  overQuantity: {
    color: "#ff9500",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBackground: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    flex: 1,
    marginRight: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "bold",
    width: 40,
    textAlign: "right",
  },

  // Location container (when completed)
  locationContainer: {
    marginTop: 8,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
  },
  locationHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 6,
  },
  locationList: {
    gap: 6,
  },
  locationItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  locationText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  locationCount: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },

  // Separators
  detailSeparator: {
    height: 8,
    backgroundColor: "transparent",
  },

  // Thêm các styles này vào StyleSheet.create của bạn

  // Header right container
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },


  // Action container cho button hoàn thành
  actionContainer: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 16,
  },
  completeButton: {
    backgroundColor: "#1677ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  completeButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Action buttons styles
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 8,
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e6f7ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#1677ff",
  },
  scanText: {
    color: "#1677ff",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 8,
  },
  scanButtonText: {
    color: "#1677ff",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  checkedContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  checkedText: {
    color: "#10b981",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },

  // Scan modal styles
  scanModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  scanModalContent: {
    flex: 1,
  },
  scanModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
  },
  scanModalTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  camera: {
    flex: 1,
  },
  scanInstructions: {
    padding: 20,
    alignItems: "center",
  },
  scanInstructionText: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
  },

  // Disabled button styles
  disabledButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  disabledButtonText: {
    color: "#999",
  },
});

export default ImportOrderDetailsTable;

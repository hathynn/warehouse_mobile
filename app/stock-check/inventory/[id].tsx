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
import { InventoryItem } from "@/types/inventoryItem.type";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";
import useStockCheckDetail from "@/services/useStockCheckDetailService";
import { StockCheckDetailType } from "@/types/stockCheckDetail.type";

interface RouteParams extends Record<string, string | undefined> {
  id: string; // stockCheckId
  itemCode: string;
  stockCheckDetailId: string;
}

// Function to format location string from English to Vietnamese
const formatLocationString = (locationStr: string): string => {
  if (!locationStr) return locationStr;

  return locationStr
    .replace(/Zone:/g, 'Khu:')
    .replace(/Floor:/g, 'Tầng:')
    .replace(/Row:/g, 'Dãy:')
    .replace(/Line:/g, 'Hàng:');
};

const StockCheckInventoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<RouteParams>();
  const { id: stockCheckId, itemCode, stockCheckDetailId } = params;

  // Debug logging for parameters
  console.log(`📋 StockCheckInventory params:`, {
    stockCheckId,
    itemCode,
    stockCheckDetailId,
  });

  const [itemData, setItemData] = useState<any | null>(null);
  const [stockCheckDetailData, setStockCheckDetailData] = useState<StockCheckDetailType | null>(null);

  // Main screen states
  const [selectedInventoryItems, setSelectedInventoryItems] = useState<InventoryItem[]>([]);
  const [searchText, setSearchText] = useState("");
  const [itemUnitType, setItemUnitType] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // Services
  const { fetchInventoryItemById, updateInventoryItem } = useInventoryService();
  const { getItemDetailById } = useItemService();
  const { trackInventoryItem, resetTracking, fetchStockCheckDetails } = useStockCheckDetail();

  // Fetch item data and inventory items
  useEffect(() => {
    const fetchData = async () => {
      if (!itemCode || !stockCheckDetailId) return;

      setLoading(true);
      try {
        // Fetch all stock check details to find the specific one
        const stockCheckDetails = await fetchStockCheckDetails(stockCheckId);
        console.log('All stock check details:', stockCheckDetails);
        
        // Find the specific detail by stockCheckDetailId
        const stockCheckDetail = stockCheckDetails.find(
          (detail: StockCheckDetailType) => detail.id?.toString() === stockCheckDetailId
        );
        console.log('Found stock check detail:', stockCheckDetail);
        
        if (!stockCheckDetail) {
          throw new Error('Không tìm thấy stock check detail');
        }
        
        setStockCheckDetailData(stockCheckDetail);

        // Fetch item details for measurement unit
        const itemDetails = await getItemDetailById(itemCode);
        console.log('Item details:', itemDetails);
        setItemData(itemDetails);

        if (itemDetails?.measurementUnit) {
          setItemUnitType(itemDetails.measurementUnit);
        } else {
          setItemUnitType("đơn vị");
        }

        // Get inventory items from checkedInventoryItemIds
        const checkedInventoryItemIds = stockCheckDetail?.checkedInventoryItemIds || [];
        console.log('Checked inventory item IDs:', checkedInventoryItemIds);
        
        if (Array.isArray(checkedInventoryItemIds) && checkedInventoryItemIds.length > 0) {
          // If checkedInventoryItemIds contains objects with inventoryItemId
          const inventoryPromises = checkedInventoryItemIds.map((item: any) => {
            const inventoryItemId = typeof item === 'string' ? item : item.inventoryItemId;
            return fetchInventoryItemById(inventoryItemId).catch((err) => {
              console.log(`Failed to fetch inventory item ${inventoryItemId}:`, err);
              return null;
            });
          });
          
          const inventoryResults = await Promise.all(inventoryPromises);
          const validInventoryItems = inventoryResults.filter(item => item !== null);
          
          console.log('Fetched checked inventory items:', validInventoryItems);
          setSelectedInventoryItems(validInventoryItems);
        } else {
          console.log('No checked inventory items found');
          setSelectedInventoryItems([]);
        }
        
      } catch (error) {
        console.log("❌ Error fetching data:", error);
        Alert.alert("Lỗi", "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [itemCode, stockCheckDetailId]);

  // Filter inventory items based on search
  const filteredInventoryItems = selectedInventoryItems.filter(item =>
    item.id.toLowerCase().includes(searchText.toLowerCase()) ||
    (item.storedLocationName && formatLocationString(item.storedLocationName).toLowerCase().includes(searchText.toLowerCase()))
  );

  // Handle QR scan navigation
  const handleQRScan = () => {
    router.push(`/stock-check/scan-qr?stockCheckId=${stockCheckId}&stockCheckDetailId=${stockCheckDetailId}&returnToModal=true&itemCode=${itemCode}`);
  };

  // Handle reset tracking (Thanh lý)
  const handleResetTracking = async (inventoryItemId: string) => {
    if (!stockCheckDetailId) {
      Alert.alert("Lỗi", "Không tìm thấy stock check detail ID");
      return;
    }

    Alert.alert(
      "Xác nhận thanh lý",
      `Bạn có chắc chắn muốn thanh lý sản phẩm: ${inventoryItemId}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thanh lý",
          style: "destructive",
          onPress: async () => {
            try {
              // Update inventory item status to NEED_LIQUID
              const currentItem = await fetchInventoryItemById(inventoryItemId);
              if (currentItem) {
                await updateInventoryItem({
                  ...currentItem,
                  status: "NEED_LIQUID",
                });
              }

              // Reset tracking
              await resetTracking({
                stockCheckDetailId: parseInt(stockCheckDetailId),
                inventoryItemId: inventoryItemId,
              });

              Alert.alert("Thành công", "Đã thanh lý item thành công!");
              
              // Refresh data
              // You may need to refresh the inventory items here
              
            } catch (error) {
              console.log("❌ Error resetting tracking:", error);
              Alert.alert("Lỗi", "Không thể thanh lý item. Vui lòng thử lại!");
            }
          },
        },
      ]
    );
  };


  const renderInventoryItem = ({ item }: { item: InventoryItem }) => {
    // Check if this item is in checkedInventoryItemIds (it should be since we're getting data from there)
    const isTrackedForStockCheck = stockCheckDetailData?.checkedInventoryItemIds?.some((checkedItem: any) => {
      const checkedItemId = typeof checkedItem === 'string' ? checkedItem : checkedItem.inventoryItemId;
      return checkedItemId === item.id;
    }) || false;
    
    // Get measurement value from checkedInventoryItemIds if available
    const checkedItem = stockCheckDetailData?.checkedInventoryItemIds?.find((checkedItem: any) => {
      const checkedItemId = typeof checkedItem === 'string' ? checkedItem : checkedItem.inventoryItemId;
      return checkedItemId === item.id;
    });
    
    const measurementValueFromCheck = typeof checkedItem === 'object' && checkedItem?.measurementValue 
      ? checkedItem.measurementValue 
      : item.measurementValue || 0;
    
    // Get status from checkedItem if available
    const statusFromCheck = typeof checkedItem === 'object' && checkedItem?.status 
      ? checkedItem.status 
      : item.status || "AVAILABLE";

    return (
      <View key={item.id} style={styles.inventoryItemContainer}>
        <View style={styles.inventoryItemRow}>
          <View style={styles.inventoryItemContent}>
            <Text style={styles.inventoryItemId}>{item.id}</Text>
            <Text style={styles.inventoryItemSubtext}>
              Vị trí: {formatLocationString(item.storedLocationName || "Không có vị trí")}
            </Text>
            <Text style={styles.inventoryItemSubtext}>
              Giá trị đo lường: {measurementValueFromCheck} {itemUnitType || "đơn vị"}
            </Text>
            <Text style={styles.inventoryItemSubtext}>
              Trạng thái: {statusFromCheck === "NEED_LIQUID" ? "Cần thanh lý" : statusFromCheck === "AVAILABLE" ? "Có sẵn" : statusFromCheck}
            </Text>
          </View>

          {/* Show tracking status */}
          {/* {isTrackedForStockCheck && (
            <View style={styles.trackingStatusContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#28a745" />
              <Text style={styles.trackingStatusText}>
                Đã kiểm
              </Text>
            </View>
          )} */}
        </View>

        {/* <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.autoChangeActionButton]}
            onPress={() => handleResetTracking(item.id)}
          >
            <Ionicons name="trash-outline" size={14} color="white" />
            <Text style={styles.actionButtonText}>Thanh lý</Text>
          </TouchableOpacity>
        </View> */}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1677ff" />
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Danh sách hàng tồn kho đã kiểm - 
              Mã hàng #{itemCode}</Text>
          </View>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <RNTextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo ID hoặc vị trí..."
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Item count */}
        <View style={styles.itemCountContainer}>
          <Text style={styles.sectionTitle}>
            Danh sách sản phẩm ({filteredInventoryItems.length})
          </Text>
        </View>

        {/* QR Scan button */}
        <View style={styles.scanButtonContainer}>
          <TouchableOpacity style={styles.globalScanButton} onPress={handleQRScan}>
            <Ionicons name="qr-code" size={24} color="#fff" />
            <Text style={styles.globalScanButtonText}>Quét QR</Text>
          </TouchableOpacity>
        </View>

        {/* Inventory list */}
        <View style={styles.listContainer}>
          <FlatList
            data={filteredInventoryItems}
            renderItem={renderInventoryItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.listContentContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.loadingText}>Không có sản phẩm nào</Text>
              </View>
            }
          />
        </View>
      </View>
    </TouchableWithoutFeedback>
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
  scanButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  globalScanButton: {
    backgroundColor: "#1677ff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  globalScanButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  listContainer: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  listContentContainer: {
    paddingBottom: 20,
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
  emptyContainer: {
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
  },
  trackingStatusText: {
    color: "#28a745",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  actionButtonsRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  actionButton: {
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
  actionButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
});

export default StockCheckInventoryScreen;
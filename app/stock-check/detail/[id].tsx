import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  TextInput,
} from "react-native";
import { Camera } from "expo-camera";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import useStockCheck from "@/services/useStockCheckService";
import useStockCheckDetail from "@/services/useStockCheckDetailService";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";
import usePaperService from "@/services/usePaperService";
import { router , useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { StockCheckStatus } from "@/types/stockCheck.type";
import {
  StockCheckDetailStatus,
  StockCheckDetailType,
} from "@/types/stockCheckDetail.type";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StyledButton from "@/components/ui/StyledButton";
import StatusBadge from "@/components/StatusBadge";
import { InventoryItem } from "@/types/inventoryItem.type";
import { extractItemIdFromQR } from "@/utils/qrUtils";
// import InventoryModal from "@/components/InventoryModal";

interface RouteParams {
  id: string;
  openModal?: string;
  itemCode?: string;
}

let globalPendingItemCode = "";
let globalShouldReopenModal = false;

const StockCheckDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { openModal, itemCode } = useLocalSearchParams<{
    openModal?: string;
    itemCode?: string;
  }>();
  const dispatch = useDispatch();

  const stockCheckTypeMap = {
    SPOT_CHECK: "Kiểm tra theo yêu cầu",
    PERIODIC: "Kiểm tra định kỳ",
  };

  const { fetchInventoryItemById, updateInventoryItem } = useInventoryService();

  const { getItemDetailById } = useItemService();
  const { getPaperById } = usePaperService();

  // Paper state
  const [paper, setPaper] = useState<any>(null);
  const [paperLoading, setPaperLoading] = useState(false);
  
  // Search states
  const [searchText, setSearchText] = useState("");
  const [filteredDetails, setFilteredDetails] = useState<any[]>([]);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  // Modal states
  // const [inventoryModalVisible, setInventoryModalVisible] = useState(false);
  // const [selectedInventoryItems, setSelectedInventoryItems] = useState<
  //   InventoryItem[]
  // >([]);
  // const [selectedItemCode, setSelectedItemCode] = useState("");
  // const [selectedStockCheckDetailId, setSelectedStockCheckDetailId] = useState<
  //   number | null
  // >(null);
  // const [searchText, setSearchText] = useState("");
  // const [itemUnitType, setItemUnitType] = useState<string>("");
  // const [checkedInventoryItemIds, setCheckedInventoryItemIds] = useState<
  //   string[]
  // >([]);

  // const [shouldReopenModal, setShouldReopenModal] = useState(false);
  // const [pendingItemCode, setPendingItemCode] = useState<string>("");

  // Track loading state
  // const [trackLoading, setTrackLoading] = useState<string | null>(null);
  // const [inventoryLoading, setInventoryLoading] = useState(false);

  const {
    loading: loadingStockCheck,
    fetchStockCheckById,
    updateStockCheckStatus,
    confirmCounted,
  } = useStockCheck();

  const {
    loading: loadingDetails,
    stockCheckDetails,
    fetchStockCheckDetails,
    trackInventoryItem,
    resetTracking,
  } = useStockCheckDetail();

  const [stockCheck, setStockCheck] = useState<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      if (id) {
        // Fetch stock check info
        fetchStockCheckById(id).then(setStockCheck);

        // Fetch stock check details
        fetchStockCheckDetails(id);
      }
    }, [id])
  );

  const handleSearchByText = useCallback((text: string) => {
    setSearchText(text);
    if (!text.trim()) {
      setFilteredDetails([]);
      return;
    }
    
    // Debug: Log search data
    console.log("🔍 Search text:", text);
    console.log("🔍 Available items:", stockCheckDetails.map(d => d.itemId));
    
    // Filter stockCheckDetails by itemId (case insensitive)
    const filtered = stockCheckDetails.filter((detail) => 
      detail.itemId?.toLowerCase().includes(text.toLowerCase())
    );
    
    console.log("🔍 Filtered results:", filtered.map(d => d.itemId));
    setFilteredDetails(filtered);
  }, [stockCheckDetails]);

  // Handle QR search result when screen focuses
  useFocusEffect(
    React.useCallback(() => {
      // Check for search result from QR scanning
      const qrSearchResult = (global as any).__QR_SEARCH_RESULT__;
      if (qrSearchResult) {
        console.log("🔍 QR Search result received:", qrSearchResult);
        const itemId = extractItemIdFromQR(qrSearchResult);
        if (itemId) {
          console.log("📱 Extracted itemId:", itemId);
          console.log("📱 stockCheckDetails length:", stockCheckDetails.length);
          
          // Wait for data to load if needed
          if (stockCheckDetails.length === 0) {
            console.log("⏳ Waiting for stockCheckDetails to load...");
            setTimeout(() => {
              console.log("📱 Retry search after delay");
              setSearchText(itemId);
              handleSearchByText(itemId);
            }, 1000);
          } else {
            setSearchText(itemId);
            handleSearchByText(itemId);
          }
        } else {
          Alert.alert("Lỗi", "Không thể trích xuất mã hàng từ QR code");
        }
        // Clear the global flag
        (global as any).__QR_SEARCH_RESULT__ = null;
      }
    }, [stockCheckDetails, handleSearchByText])
  );

  // Comment out paper fetching as signing is no longer needed
  // useEffect(() => {
  //   if (
  //     stockCheck?.paperId &&
  //     stockCheck?.status === StockCheckStatus.COMPLETED
  //   ) {
  //     console.log("🔍 Fetching paper with ID:", stockCheck.paperId);
  //     setPaperLoading(true);
  //     getPaperById(stockCheck.paperId)
  //       .then((data: any) => {
  //         console.log("✅ Paper data received:", data);
  //         setPaper(data);
  //       })
  //       .catch((error) => {
  //         console.log("❌ Lỗi lấy chứng từ:", error);
  //         setPaper(null);
  //       })
  //       .finally(() => setPaperLoading(false));
  //   }
  // }, [stockCheck?.paperId, stockCheck?.status]);

  // Add a ref to prevent multiple modal openings
  // const modalReopenProcessed = useRef(false);
  // useEffect(() => {
  //   if (openModal === "true" && itemCode) {
  //     // console.log(`🔍 QR return detected: ${itemCode}`);
  //     // console.log(`🔍 modalReopenProcessed.current: ${modalReopenProcessed.current}`);

  //     // RESET the ref first to allow reprocessing
  //     modalReopenProcessed.current = false;

  //     // Set GLOBAL variables thay vì state
  //     // console.log(`🔄 Setting global variables before clearing URL...`);
  //     globalPendingItemCode = itemCode;
  //     globalShouldReopenModal = true;

  //     // Force re-render by setting a dummy state
  //     setSearchText((prev) => prev); // Trigger re-render

  //     // console.log(`✅ Global vars set: pendingItemCode=${globalPendingItemCode}, shouldReopenModal=${globalShouldReopenModal}`);

  //     // Clear URL immediately
  //     router.replace(`/stock-check/detail/${id}`);
  //   }
  // }, [openModal, itemCode, id]);

  // useEffect(() => {
  //   console.log(`🔍 Modal reopen check:`, {
  //     shouldReopenModal,
  //     pendingItemCode,
  //     stockCheckDetailsLength: stockCheckDetails.length,
  //     modalReopenProcessed: modalReopenProcessed.current,
  //   });

  //   if (
  //     shouldReopenModal &&
  //     pendingItemCode &&
  //     stockCheckDetails.length > 0 &&
  //     !modalReopenProcessed.current
  //   ) {
  //     // console.log(
  //     //   `🔄 ✅ ALL CONDITIONS MET - Attempting to reopen modal for: ${pendingItemCode}`
  //     // );
  //     modalReopenProcessed.current = true;

  //     // Find the matching stock check detail
  //     const targetDetail = stockCheckDetails.find(
  //       (detail) => detail.itemId === pendingItemCode
  //     );

  //     if (targetDetail) {
  //       // console.log(`✅ Found matching detail, reopening modal:`, targetDetail);

  //       // Use setTimeout to ensure UI is fully updated
  //       setTimeout(async () => {
  //         try {
  //           // console.log(`🔄 Setting modal state...`);

  //           // Set modal state
  //           setSelectedItemCode(targetDetail.itemId || "");
  //           setSelectedStockCheckDetailId(targetDetail.id);
  //           setCheckedInventoryItemIds(
  //             targetDetail.checkedInventoryItemIds || []
  //           );
  //           setSearchText("");
  //           setItemUnitType("");
  //           setInventoryLoading(true);

  //           // console.log(
  //           //   `🔄 Loading data for ${
  //           //     targetDetail.inventoryItemIds?.length || 0
  //           //   } inventory items`
  //           // );

  //           // Fetch data in parallel
  //           const [inventoryItems, itemDetails] = await Promise.all([
  //             Promise.all(
  //               (targetDetail.inventoryItemIds || []).map(
  //                 async (inventoryItemId: string) => {
  //                   try {
  //                     const item = await fetchInventoryItemById(
  //                       inventoryItemId
  //                     );
  //                     console.log(
  //                       `✅ Fetched inventory item: ${inventoryItemId}`
  //                     );
  //                     return item;
  //                   } catch (error) {
  //                     console.log(
  //                       `❌ Error fetching inventory item ${inventoryItemId}:`,
  //                       error
  //                     );
  //                     return null;
  //                   }
  //                 }
  //               )
  //             ),
  //             targetDetail.itemId
  //               ? getItemDetailById(targetDetail.itemId)
  //               : Promise.resolve(null),
  //           ]);

  //           const validInventoryItems = inventoryItems.filter(
  //             (item) => item !== null
  //           );
  //           setSelectedInventoryItems(validInventoryItems);

  //           if (itemDetails?.measurementUnit) {
  //             setItemUnitType(itemDetails.measurementUnit);
  //           } else {
  //             setItemUnitType("đơn vị");
  //           }

  //           console.log(
  //             `✅ Data loaded, opening modal with ${validInventoryItems.length} items`
  //           );
  //           // console.log(`🔄 About to set inventoryModalVisible to true`);

  //           // Open modal after data is loaded
  //           setInventoryModalVisible(true);

  //           // console.log(`✅ Modal should be open now!`);
  //         } catch (error) {
  //           console.log("❌ Error loading modal data:", error);
  //           setSelectedInventoryItems([]);
  //           setItemUnitType("đơn vị");
  //           modalReopenProcessed.current = false; // Reset on error
  //         } finally {
  //           setInventoryLoading(false);
  //           // Reset flags
  //           setShouldReopenModal(false);
  //           setPendingItemCode("");
  //         }
  //       }, 200);
  //     } else {
  //       console.warn(
  //         `❌ No matching detail found for itemCode: ${pendingItemCode}`
  //       );
  //       // Reset flags if no match found
  //       setShouldReopenModal(false);
  //       setPendingItemCode("");
  //       modalReopenProcessed.current = false;
  //     }
  //   } else {
  //     // Log lý do tại sao không trigger
  //     if (!shouldReopenModal) console.log(`🚫 shouldReopenModal = false`);
  //     if (!pendingItemCode) console.log(`🚫 pendingItemCode is empty`);
  //     if (stockCheckDetails.length === 0)
  //       console.log(`🚫 stockCheckDetails not loaded yet`);
  //     if (modalReopenProcessed.current)
  //       console.log(`🚫 modalReopenProcessed already true`);
  //   }
  // }, [shouldReopenModal, pendingItemCode, stockCheckDetails.length]);

  // useEffect(() => {
  //   console.log(`🔍 pendingItemCode changed to: ${pendingItemCode}`);
  // }, [pendingItemCode]);

  // useEffect(() => {
  //   console.log(`🔍 Modal reopen check:`, {
  //     globalShouldReopenModal,
  //     globalPendingItemCode,
  //     stockCheckDetailsLength: stockCheckDetails.length,
  //     modalReopenProcessed: modalReopenProcessed.current,
  //   });

  //   if (
  //     globalShouldReopenModal &&
  //     globalPendingItemCode &&
  //     stockCheckDetails.length > 0 &&
  //     !modalReopenProcessed.current
  //   ) {
  //     console.log(
  //       `🔄 ✅ ALL CONDITIONS MET - Attempting to reopen modal for: ${globalPendingItemCode}`
  //     );
  //     modalReopenProcessed.current = true;

  //     // Find the matching stock check detail
  //     const targetDetail = stockCheckDetails.find(
  //       (detail) => detail.itemId === globalPendingItemCode
  //     );

  //     if (targetDetail) {
  //       console.log(`✅ Found matching detail, reopening modal:`, targetDetail);

  //       // Use setTimeout to ensure UI is fully updated
  //       setTimeout(async () => {
  //         try {
  //           console.log(`🔄 Setting modal state...`);

  //           // Set modal state
  //           setSelectedItemCode(targetDetail.itemId || "");
  //           setSelectedStockCheckDetailId(targetDetail.id);
  //           setCheckedInventoryItemIds(
  //             targetDetail.checkedInventoryItemIds || []
  //           );
  //           setSearchText("");
  //           setItemUnitType("");
  //           setInventoryLoading(true);

  //           console.log(
  //             `🔄 Loading data for ${
  //               targetDetail.inventoryItemIds?.length || 0
  //             } inventory items`
  //           );

  //           // Fetch data in parallel
  //           const [inventoryItems, itemDetails] = await Promise.all([
  //             Promise.all(
  //               (targetDetail.inventoryItemIds || []).map(
  //                 async (inventoryItemId: string) => {
  //                   try {
  //                     const item = await fetchInventoryItemById(
  //                       inventoryItemId
  //                     );
  //                     console.log(
  //                       `✅ Fetched inventory item: ${inventoryItemId}`
  //                     );
  //                     return item;
  //                   } catch (error) {
  //                     console.log(
  //                       `❌ Error fetching inventory item ${inventoryItemId}:`,
  //                       error
  //                     );
  //                     return null;
  //                   }
  //                 }
  //               )
  //             ),
  //             targetDetail.itemId
  //               ? getItemDetailById(targetDetail.itemId)
  //               : Promise.resolve(null),
  //           ]);

  //           const validInventoryItems = inventoryItems.filter(
  //             (item) => item !== null
  //           );
  //           setSelectedInventoryItems(validInventoryItems);

  //           if (itemDetails?.measurementUnit) {
  //             setItemUnitType(itemDetails.measurementUnit);
  //           } else {
  //             setItemUnitType("đơn vị");
  //           }

  //           console.log(
  //             `✅ Data loaded, opening modal with ${validInventoryItems.length} items`
  //           );
  //           console.log(`🔄 About to set inventoryModalVisible to true`);

  //           // Open modal after data is loaded
  //           setInventoryModalVisible(true);

  //           console.log(`✅ Modal should be open now!`);
  //         } catch (error) {
  //           console.log("❌ Error loading modal data:", error);
  //           setSelectedInventoryItems([]);
  //           setItemUnitType("đơn vị");
  //           modalReopenProcessed.current = false; // Reset on error
  //         } finally {
  //           setInventoryLoading(false);
  //           // Reset global flags
  //           globalShouldReopenModal = false;
  //           globalPendingItemCode = "";
  //         }
  //       }, 300); // Tăng delay lên 300ms
  //     } else {
  //       console.warn(
  //         `❌ No matching detail found for itemCode: ${globalPendingItemCode}`
  //       );
  //       // Reset flags if no match found
  //       globalShouldReopenModal = false;
  //       globalPendingItemCode = "";
  //       modalReopenProcessed.current = false;
  //     }
  //   }
  // }, [stockCheckDetails.length]);
  // Reset the ref when modal is closed
  // useEffect(() => {
  //   if (!inventoryModalVisible) {
  //     modalReopenProcessed.current = false;
  //     setShouldReopenModal(false);
  //     setPendingItemCode("");
  //   }
  // }, [inventoryModalVisible]);

  // Debug logging
  useEffect(() => {
    console.log("🔍 Debug params:", {
      openModal,
      itemCode,
      stockCheckDetailsLength: stockCheckDetails.length,
    });
  }, [openModal, itemCode, stockCheckDetails.length]);

  if (loadingStockCheck || loadingDetails) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1677ff" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  const handleStartStockCheck = async () => {
    try {
      // Sử dụng updateStockCheckStatus để chuyển từ NOT_STARTED sang IN_PROGRESS
      const result = await updateStockCheckStatus(
        id,
        StockCheckStatus.IN_PROGRESS
      );
      if (result) {
        console.log("Đã bắt đầu kiểm đếm thành công");
        // Refresh data
        fetchStockCheckById(id).then(setStockCheck);
      }
    } catch (error) {
      console.log("Lỗi khi bắt đầu kiểm đếm:", error);
      Alert.alert("Lỗi", "Không thể bắt đầu kiểm đếm. Vui lòng thử lại!");
    }
  };

  // Complete counting and finish stock check process
  const handleCompletecounting = async () => {
    try {
      console.log("🔄 Completing stock check process...");

      // Show confirmation alert
      Alert.alert(
        "Xác nhận kiểm kho",
        "Bạn xác nhận những thông tin kiểm kho trên là đúng?",
        [
          {
            text: "Hủy",
            style: "cancel"
          },
          {
            text: "Xác nhận",
            onPress: async () => {
              try {
                // Update stock check status to COUNTED
                const result = await updateStockCheckStatus(id, StockCheckStatus.COUNTED);

                if (result) {
                  console.log("✅ Đã hoàn tất kiểm kho thành công");
                  // Refresh data to show updated status
                  const updatedStockCheck = await fetchStockCheckById(id);
                  setStockCheck(updatedStockCheck);

                  Alert.alert(
                    "Thành công", 
                    "Đã hoàn tất kiểm kho thành công!",
                    [
                      {
                        text: "OK",
                        onPress: () => {
                          // Navigate back to stock check list
                          router.push("/(tabs)/stock-check");
                        }
                      }
                    ]
                  );
                }
              } catch (error) {
                console.log("❌ Lỗi khi hoàn tất kiểm kho:", error);
                Alert.alert("Lỗi", "Không thể hoàn tất kiểm kho. Vui lòng thử lại!");
              }
            }
          }
        ]
      );
    } catch (error) {
      console.log("❌ Lỗi khi hoàn tất kiểm kho:", error);
      Alert.alert("Lỗi", "Không thể hoàn tất kiểm kho. Vui lòng thử lại!");
    }
  };

  // Search and scan functions

  const handleScanQR = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Lỗi", "Cần cấp quyền camera để quét QR");
      return;
    }

    // Navigate to existing scan QR screen with search mode
    router.push({
      pathname: "/stock-check/scan-qr",
      params: {
        stockCheckId: id,
        stockCheckDetailId: "search", // Special flag for search mode
        mode: "search"
      }
    });
  };

  // Removed handleQRSearchResult - now using global state and useFocusEffect

  // Function to refresh inventory items
  // const refreshInventoryItems = async () => {
  //   if (!selectedStockCheckDetailId) return;

  //   try {
  //     console.log(
  //       `🔄 Refreshing inventory items for stockCheckDetailId: ${selectedStockCheckDetailId}`
  //     );

  //     // Tìm detail tương ứng và sử dụng inventoryItemIds
  //     const currentDetail = stockCheckDetails.find(
  //       (d) => d.id === selectedStockCheckDetailId
  //     );
  //     if (!currentDetail || !currentDetail.inventoryItemIds) {
  //       console.warn("⚠️ Không tìm thấy detail hoặc inventoryItemIds");
  //       return;
  //     }

  //     // Fetch chi tiết từng inventory item
  //     const inventoryItems = await Promise.all(
  //       currentDetail.inventoryItemIds.map(async (inventoryItemId: string) => {
  //         try {
  //           const inventoryItem = await fetchInventoryItemById(inventoryItemId);
  //           return inventoryItem;
  //         } catch (error) {
  //           console.log(
  //             `❌ Error fetching inventory item ${inventoryItemId}:`,
  //             error
  //           );
  //           return null;
  //         }
  //       })
  //     );

  //     const validInventoryItems = inventoryItems.filter(
  //       (item) => item !== null
  //     );
  //     setSelectedInventoryItems(validInventoryItems);
  //     console.log(`✅ Refreshed ${validInventoryItems.length} inventory items`);
  //   } catch (error) {
  //     console.log("❌ Error refreshing inventory items:", error);
  //   }
  // };

  // Handle track inventory item
  // const handleTrackInventoryItem = async (inventoryItemId: string) => {
  //   if (!selectedStockCheckDetailId) return;

  //   try {
  //     setTrackLoading(inventoryItemId);

  //     Alert.alert(
  //       "Xác nhận tracking",
  //       `Bạn có chắc chắn muốn track inventory item: ${inventoryItemId}?`,
  //       [
  //         {
  //           text: "Hủy",
  //           style: "cancel",
  //           onPress: () => setTrackLoading(null),
  //         },
  //         {
  //           text: "Đồng ý",
  //           onPress: async () => {
  //             try {
  //               console.log(`🔄 Tracking inventory item: ${inventoryItemId}`);

  //               await trackInventoryItem({
  //                 stockCheckDetailId: selectedStockCheckDetailId,
  //                 inventoryItemId: inventoryItemId,
  //               });

  //               console.log("✅ Track thành công");

  //               // Refresh data
  //               await fetchStockCheckDetails(id);
  //               await refreshInventoryItems();

  //               Alert.alert(
  //                 "Thành công",
  //                 "Đã track inventory item thành công!"
  //               );
  //             } catch (error) {
  //               console.log("❌ Error tracking:", error);
  //               Alert.alert(
  //                 "Lỗi",
  //                 "Không thể track inventory item. Vui lòng thử lại!"
  //               );
  //             } finally {
  //               setTrackLoading(null);
  //             }
  //           },
  //         },
  //       ]
  //     );
  //   } catch (error) {
  //     console.log("❌ Error in handleTrackInventoryItem:", error);
  //     setTrackLoading(null);
  //   }
  // };

  // Handle row press - navigate to inventory screen
  const handleRowPress = async (detail: any) => {
    if (!detail.id) {
      console.log("❌ Stock check detail ID not found");
      return;
    }

    // Navigate to inventory screen
    console.log('Navigate to:', `/stock-check/inventory/${stockCheck?.id}?itemCode=${detail.itemId}&stockCheckDetailId=${detail.id}`);
    router.push(`/stock-check/inventory/${stockCheck?.id}?itemCode=${detail.itemId}&stockCheckDetailId=${detail.id}` as any);
  };

  // const handleCloseModal = () => {
  //   setInventoryModalVisible(false);
  //   setSelectedInventoryItems([]);
  //   setSearchText("");
  //   setItemUnitType("");
  //   setCheckedInventoryItemIds([]);
  // };

  // Handle QR scan navigation for stock check
  // const handleQRScanPress = () => {
  //   setInventoryModalVisible(false);
  //   router.push(
  //     `/stock-check/scan-qr?stockCheckId=${stockCheck?.id}&stockCheckDetailId=${selectedStockCheckDetailId}&returnToModal=true&itemCode=${selectedItemCode}`
  //   );
  // };

  // Handle reset tracking (Thanh lý button)
  // const handleResetTracking = async (inventoryItemId: string) => {
  //   if (!selectedStockCheckDetailId) {
  //     Alert.alert("Lỗi", "Không tìm thấy stock check detail ID");
  //     return;
  //   }

  //   Alert.alert(
  //     "Xác nhận thanh lý",
  //     `Bạn có chắc chắn muốn thanh lý sản phẩm: ${inventoryItemId}?`,
  //     [
  //       {
  //         text: "Hủy",
  //         style: "cancel",
  //       },
  //       {
  //         text: "Thanh lý",
  //         style: "destructive",
  //         onPress: async () => {
  //           try {
  //             // First get the current inventory item
  //             const currentItem = await fetchInventoryItemById(inventoryItemId);
  //             if (!currentItem) {
  //               Alert.alert("Lỗi", "Không tìm thấy sản phẩm");
  //               return;
  //             }

  //             // Update inventory item status to NEED_LIQUID
  //             await updateInventoryItem({
  //               ...currentItem,
  //               status: "NEED_LIQUID",
  //             });

  //             // Then reset tracking
  //             await resetTracking({
  //               stockCheckDetailId: selectedStockCheckDetailId,
  //               inventoryItemId: inventoryItemId,
  //             });

  //             Alert.alert("Thành công", "Đã thanh lý item thành công!");

  //             // Refresh data
  //             await fetchStockCheckDetails(id);
  //             await refreshInventoryItems();

  //             // Update checked inventory item IDs
  //             setCheckedInventoryItemIds((prev) =>
  //               prev.filter((id) => id !== inventoryItemId)
  //             );
  //           } catch (error) {
  //             console.log("❌ Error resetting tracking:", error);
  //             Alert.alert("Lỗi", "Không thể thanh lý item. Vui lòng thử lại!");
  //           }
  //         },
  //       },
  //     ]
  //   );
  // };

  // Handle mark as unavailable (Không tìm thấy sản phẩm button)
  // const handleMarkAsUnavailable = async (inventoryItemId: string) => {
  //   Alert.alert(
  //     "Xác nhận không tìm thấy",
  //     `Bạn có chắc chắn không tìm thấy sản phẩm: ${inventoryItemId}?`,
  //     [
  //       {
  //         text: "Hủy",
  //         style: "cancel",
  //       },
  //       {
  //         text: "Xác nhận",
  //         style: "destructive",
  //         onPress: async () => {
  //           try {
  //             // Get the current inventory item
  //             const currentItem = await fetchInventoryItemById(inventoryItemId);
  //             if (!currentItem) {
  //               Alert.alert("Lỗi", "Không tìm thấy sản phẩm");
  //               return;
  //             }

  //             // Update inventory item status to UNAVAILABLE
  //             await updateInventoryItem({
  //               ...currentItem,
  //               status: "UNAVAILABLE",
  //             });

  //             Alert.alert("Thành công", "Đã đánh dấu sản phẩm không tìm thấy!");

  //             // Refresh data
  //             await refreshInventoryItems();
  //           } catch (error) {
  //             console.log("❌ Error marking as unavailable:", error);
  //             Alert.alert("Lỗi", "Không thể cập nhật trạng thái sản phẩm. Vui lòng thử lại!");
  //           }
  //         },
  //       },
  //     ]
  //   );
  // };

  // Comment out signature section for stock check
  // const renderSignatureSection = () => {
  //   if (
  //     stockCheck?.status !== StockCheckStatus.COMPLETED ||
  //     !stockCheck?.paperId
  //   )
  //     return null;

  //   return (
  //     <View style={styles.signatureContainer}>
  //       <View style={styles.signatureRowWrapper}>
  //         <View style={styles.signatureItemHorizontal}>
  //           <Text style={styles.signatureLabelHorizontal}>Người kiểm đếm</Text>
            
  //           <View style={styles.signatureImageContainerHorizontal}>
  //             {paper?.signProviderUrl ? (
  //               <Image
  //                 source={{ uri: paper.signProviderUrl }}
  //                 style={styles.signatureImageHorizontal}
  //                 resizeMode="contain"
  //               />
  //             ) : (
  //               <View style={styles.noSignatureHorizontal}>
  //                 <Ionicons
  //                   name="document-text-outline"
  //                   size={30}
  //                   color="#ccc"
  //                 />
  //                 <Text style={styles.noSignatureTextHorizontal}>
  //                   Chưa có chữ ký
  //                 </Text>
  //               </View>
  //             )}
  //           </View>

  //           <Text style={styles.signatureNameHorizontal}>
  //             {paper?.signProviderName || "Chưa rõ"}
  //           </Text>
  //         </View>

  //         <View style={styles.signatureItemHorizontal}>
  //           <Text style={styles.signatureLabelHorizontal}>Người phê duyệt</Text>
            
  //           <View style={styles.signatureImageContainerHorizontal}>
  //             {paper?.signReceiverUrl ? (
  //               <Image
  //                 source={{ uri: paper.signReceiverUrl }}
  //                 style={styles.signatureImageHorizontal}
  //                 resizeMode="contain"
  //               />
  //             ) : (
  //               <View style={styles.noSignatureHorizontal}>
  //                 <Ionicons
  //                   name="document-text-outline"
  //                   size={30}
  //                   color="#ccc"
  //                 />
  //                 <Text style={styles.noSignatureTextHorizontal}>
  //                   Chưa có chữ ký
  //                 </Text>
  //               </View>
  //             )}
  //           </View>
  //           <Text style={styles.signatureNameHorizontal}>
  //             {paper?.signReceiverName || "Chưa rõ"}
  //           </Text>
  //         </View>
  //       </View>
  //     </View>
  //   );
  // };

const renderActionButton = () => {
  if (!stockCheck) return null;
  const status = stockCheck.status;

  switch (status) {
    case StockCheckStatus.NOT_STARTED:
      return (
        <View style={styles.actionButtonContainer}>
          <StyledButton
            title="Bắt đầu kiểm đếm"
            onPress={handleStartStockCheck}
            style={{ marginTop: 12 }}
          />
        </View>
      );

    case StockCheckStatus.IN_PROGRESS:
      return (
        <View style={styles.actionButtonContainer}>
          <StyledButton
            title="Xác nhận kiểm kho"
            onPress={handleCompletecounting}
            style={{ marginTop: 12 }}
          />
        </View>
      );
      
    // case StockCheckStatus.COMPLETED:
    //   return (
    //     <View style={styles.actionButtonContainer}>
    //       <View style={styles.completedMessageContainer}>
    //         <Ionicons name="checkmark-circle" size={24} color="#28a745" />
    //         <Text style={styles.completedMessage}>
    //           Đã hoàn tất kiểm kho
    //         </Text>
    //       </View>
    //     </View>
    //   );

      
    default:
      return null;
  }
};

  // if (__DEV__) {
  //   console.warn = () => {};
  //   console.log = () => {};
  // }

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
          Phiếu kiểm kho {id}
        </Text>
      </View>

      <ScrollView style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Thông tin chi tiết phiếu kiểm kho
          </Text>

          <View style={styles.row}>
            <Text style={styles.label}>Mã phiếu</Text>
            <View style={styles.badgeBlue}>
              <Text style={styles.badgeText}>{stockCheck?.id}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày tạo</Text>
            <Text style={styles.value}>
              {stockCheck?.createdDate
                ? new Date(stockCheck?.createdDate).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày kiểm đếm</Text>
            <Text style={styles.value}>
              {stockCheck?.countingDate
                ? new Date(stockCheck?.countingDate).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                : "--"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Ngày kiểm xong dự kiến</Text>
            <Text style={styles.value}>
              {stockCheck?.countingDate
                ? new Date(stockCheck?.expectedCompletedDate).toLocaleString(
                    "vi-VN",
                    {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }
                  )
                : "--"}
            </Text>
          </View>

          {/* <View style={styles.row}>
            <Text style={styles.label}>Giờ kiểm đếm</Text>
            <Text style={styles.value}>
              {stockCheck?.countingTime || "--"}
            </Text>
          </View> */}

          <View style={styles.row}>
            <Text style={styles.label}>Lý do kiểm kho</Text>
            <Text style={styles.value}>
              {stockCheck?.stockCheckReason || "Không có"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Loại kiểm kho</Text>
            <Text style={styles.value}>
              {stockCheckTypeMap[stockCheck?.type] || "Không có"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Tình trạng</Text>
            <Text style={styles.valueRed}>
              <StatusBadge
                status={stockCheck?.status || "UNKNOWN"}
                flow="import"
              />
            </Text>
          </View>
        </View>

        {/* Search Section */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchTitle}>Tìm kiếm sản phẩm</Text>
          <View style={styles.searchInputContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Nhập mã hàng để tìm kiếm..."
              value={searchText}
              onChangeText={handleSearchByText}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.scanQRButton}
              onPress={handleScanQR}
            >
              <Ionicons name="qr-code" size={20} color="#1677ff" />
              <Text style={styles.scanQRButtonText}>Quét QR</Text>
            </TouchableOpacity>
          </View>
          {searchText && filteredDetails.length > 0 && (
            <Text style={styles.searchResultText}>
              Tìm thấy {filteredDetails.length} sản phẩm
            </Text>
          )}
          {searchText && filteredDetails.length === 0 && (
            <Text style={styles.searchResultText}>
              Không tìm thấy sản phẩm nào
            </Text>
          )}
        </View>

        <View style={styles.tableContainer}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.cellCode]}>Mã hàng</Text>
            <Text style={[styles.cellAlignRight]}>Tổng kiểm đếm</Text>
            <Text style={[styles.cellAlignRight]}>Tổng giá trị đo lường</Text>
            {[
              StockCheckStatus.NOT_STARTED,
              StockCheckStatus.IN_PROGRESS,
            ].includes(stockCheck?.status as StockCheckStatus) && (
              <Text style={styles.scanHeader}></Text>
            )}
          </View>

          <ScrollView
            style={styles.scrollableTableContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {(filteredDetails.length > 0 ? filteredDetails : stockCheckDetails).map(
              (detail: StockCheckDetailType, index: number) => {
                const isCompleted =
                  detail.status === StockCheckDetailStatus.COMPLETED || 
                  detail.quantity === detail.actualQuantity;
                const isLastItem = index === stockCheckDetails.length - 1;

                return (
                  <View key={detail.id}>
                    <TouchableOpacity
                      style={styles.tableRow}
                      onPress={() => handleRowPress(detail)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.cellCode]}>{detail.itemId}</Text>
                      <Text style={[styles.cellAlignRight]}>
                        {detail.checkedInventoryItemIds?.length || 0}
                      </Text>
                      <Text style={[styles.cellAlignRight]}>
                        {detail.checkedInventoryItemIds?.reduce((sum: number, item: any) => sum + (item.measurementValue || 0), 0) || 0}
                      </Text>

                      {[
                        StockCheckStatus.NOT_STARTED,
                        StockCheckStatus.IN_PROGRESS,
                      ].includes(stockCheck?.status as StockCheckStatus) && (
                        <View style={styles.scanCell}>
                          <TouchableOpacity
                            style={[
                              styles.scanButton,
                              isCompleted && styles.scanButtonDisabled,
                            ]}
                            disabled={isCompleted}
                            onPress={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/stock-check/scan-qr?stockCheckId=${stockCheck?.id}&stockCheckDetailId=${detail.id}`
                              );
                            }}
                          >
                            {isCompleted ? (
                              <Text style={styles.scanText}>
                                {detail.status === StockCheckDetailStatus.COMPLETED ? "Hoàn tất" : "Đã đủ"}
                              </Text>
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
              }
            )}
          </ScrollView>
        </View>

        <View style={styles.actionButtonContainer}>{renderActionButton()}</View>
        {/* {renderSignatureSection()} */}
      </ScrollView>

      {/* <InventoryModal
        visible={inventoryModalVisible}
        onClose={handleCloseModal}
        selectedItemCode={selectedItemCode}
        selectedInventoryItems={selectedInventoryItems}
        itemUnitType={itemUnitType}
        inventoryLoading={inventoryLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        stockCheck={stockCheck} // Pass stockCheck instead of exportRequest
        // checkedInventoryItemIds={checkedInventoryItemIds} // Pass checked inventory item IDs
        onQRScanPress={handleQRScanPress} // QR scan navigation for stock check
        onResetTracking={handleResetTracking} // Reset tracking (Thanh lý) function
        onMarkAsUnavailable={handleMarkAsUnavailable} // Mark as unavailable function
        // Remove export-specific props that aren't needed for stock check
      /> */}
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
  textGreen: {
    color: "#28a745",
    fontWeight: "600",
  },
  textRed: {
    color: "#dc3545",
    fontWeight: "600",
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
    // marginBottom: 20,
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
    marginBottom: 10,
    marginTop:18,
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
  
  waitingMessageContainer: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    marginTop: 12,
  },
  waitingMessage: {
    fontSize: 14,
    color: '#0369a1',
    textAlign: 'center',
    fontWeight: '500',
  },
  completedMessageContainer: {
    backgroundColor: '#f0f8f4',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#28a745',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedMessage: {
    fontSize: 14,
    color: '#28a745',
    textAlign: 'center',
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Search styles
  searchContainer: {
    backgroundColor: "white",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
  },
  scanQRButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e6f7ff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1677ff",
    gap: 6,
  },
  scanQRButtonText: {
    color: "#1677ff",
    fontSize: 14,
    fontWeight: "500",
  },
  searchResultText: {
    marginTop: 8,
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },

});

export default StockCheckDetailScreen;

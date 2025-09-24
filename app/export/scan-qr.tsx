import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/redux/store";
import { setScannedNewItemForMultiSelect } from "@/redux/exportRequestDetailSlice";
import { Button } from "tamagui";
import { useIsFocused } from "@react-navigation/native";
import { Audio } from "expo-av";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import useExportRequest from "@/services/useExportRequestService";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";


export default function ScanQrScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();

  console.log(`📱 QR Scan screen loaded with params:`, { id });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const isFocused = useIsFocused();
  const { updateActualQuantity, fetchExportRequestDetailById } = useExportRequestDetail();
  const { exportRequest, fetchExportRequestById } = useExportRequest();
  const { fetchInventoryItemById, fetchInventoryItemsByExportRequestDetailId } = useInventoryService();
  const { getItemDetailById } = useItemService();
  const [scanningEnabled, setScanningEnabled] = useState(true);
  const [alertShowing, setAlertShowing] = useState(false);

  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );
  const [scannedItemCode, setScannedItemCode] = useState<string>("");
  const [currentTargetItemId, setCurrentTargetItemId] = useState<string | null>(null);

  // Import Redux actions and dispatch
  const dispatch = useDispatch();

  // Enhanced debounce mechanism and processing tracking
  const lastScanTimeRef = useRef<number>(0);
  const currentlyProcessingRef = useRef<string | null>(null);
  const lastProcessedQRRef = useRef<string | null>(null);
  const SCAN_DEBOUNCE_MS = 2000;
  const SUCCESS_COOLDOWN_MS = 3000;
  const [itemIdForNavigation] = useState<string>("");

  const scanMappings = useSelector(
    (state: RootState) => state.exportRequestDetail.scanMappings
  );

  const [audioPlayer, setAudioPlayer] = useState<any>(null);

  useEffect(() => {
    const loadBeep = async () => {
      try {
        const player = await Audio.Sound.createAsync(
          require("@/assets/beep-07a.mp3")
        );
        setAudioPlayer(player.sound);
      } catch (error) {
        console.warn("🔇 Không thể tải âm thanh:", error);
      }
    };

    loadBeep();

    return () => {
      // Cleanup will be handled by component unmount
    };
  }, []);

  const playBeep = async () => {
    try {
      if (audioPlayer) {
        await audioPlayer.replayAsync();
      }
    } catch (err) {
      console.warn("🔇 Không thể phát âm:", err);
    }
  };

  const exportDetails = useSelector(
    (state: RootState) => state.exportRequestDetail.details
  );

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // Fetch export request data when component mounts
  useEffect(() => {
    if (id && exportRequest === null) {
      fetchExportRequestById(id);
    }
  }, [id]);

  // Reset scanning state when screen is focused
  useEffect(() => {
    if (isFocused) {
      console.log("🔄 Screen focused, resetting scan state");
      setIsProcessing(false);
      setScanningEnabled(true);
      setErrorMessage(null);
      setLastScannedProduct(null);
      setAlertShowing(false);
      lastScanTimeRef.current = 0;
      currentlyProcessingRef.current = null;
      lastProcessedQRRef.current = null;
    }
  }, [isFocused]);

 const handleBarCodeScanned = async ({ data }: { data: string }) => {
  // Removed console.log disabling in development mode to allow debugging

  const currentTime = Date.now();
  const rawInventoryItemId = data.trim().toUpperCase(); // Always convert to uppercase
  const inventoryItemId = rawInventoryItemId; // Use uppercase consistently

  console.log(`📱 Scanning QR: ${inventoryItemId}`);
  console.log(`📋 Previously scanned: ${JSON.stringify(scannedIds)}`);
  console.log(
    `🔍 Current state - scanningEnabled: ${scanningEnabled}, isProcessing: ${isProcessing}`
  );
  console.log(`🔍 Currently processing: ${currentlyProcessingRef.current}`);

  // Check if this exact QR is already being processed
  if (currentlyProcessingRef.current === inventoryItemId) {
    console.log(`🚫 Already processing this QR: ${inventoryItemId}`);
    return;
  }

  // Check if this is the same QR that was just processed successfully
  if (lastProcessedQRRef.current === inventoryItemId) {
    const timeSinceLastProcess = currentTime - lastScanTimeRef.current;
    if (timeSinceLastProcess < SUCCESS_COOLDOWN_MS) {
      console.log(
        `🚫 Cooldown active for recently processed QR: ${inventoryItemId} (${timeSinceLastProcess}ms)`
      );
      return;
    }
  }

  // Enhanced debounce check
  if (currentTime - lastScanTimeRef.current < SCAN_DEBOUNCE_MS) {
    console.log(
      `🚫 Debounce: Too soon since last scan (${currentTime - lastScanTimeRef.current
      }ms)`
    );
    return;
  }

  // Check scanning state
  if (!scanningEnabled || isProcessing || alertShowing) {
    console.log("🚫 Scan disabled, processing, or alert showing, ignoring scan");
    return;
  }

  // Check duplicate scan
  if (scannedIds.includes(inventoryItemId)) {
    console.log("🚫 Already scanned this QR:", inventoryItemId);
    setErrorMessage("Sản phẩm này đã được quét trước đó!");

    // Temporarily disable scanning to prevent spam
    setScanningEnabled(false);
    setTimeout(() => {
      setErrorMessage(null);
      setScanningEnabled(true);
    }, 3000);
    return;
  }

  // IMMEDIATELY disable scanning and set processing state
  setScanningEnabled(false);
  setIsProcessing(true);
  currentlyProcessingRef.current = inventoryItemId.toUpperCase();
  lastScanTimeRef.current = currentTime;

  console.log(`🔒 Processing started for: ${inventoryItemId}`);

  // Clear previous messages
  setErrorMessage(null);
  setLastScannedProduct(null);

  try {
    console.log("📦 Raw QR data:", data);
    console.log("🔍 inventoryItemId:", inventoryItemId);

    // Get inventory item data to validate itemId first
    const inventoryItemData = await fetchInventoryItemById(inventoryItemId);
    if (!inventoryItemData) {
      throw new Error("Không tìm thấy hàng tồn kho với mã đã quét");
    }

    // Normal scan mode: Check scan mappings
    console.log("🔍 All scanMappings:", scanMappings.map(m => m.inventoryItemId.toUpperCase()));
    console.log("🔍 Looking for inventoryItemId:", inventoryItemId);

    const mapping = scanMappings.find(
      (m) => m.inventoryItemId.toUpperCase() === inventoryItemId.toUpperCase()
    );

    console.log("🔍 Mapping found:", mapping);
    if (!mapping) {
      // Validate itemId before allowing INTERNAL multi-select
      const matchingExportDetail = exportDetails.find(
        (detail: any) => detail.itemId === inventoryItemData.itemId
      );

      if (!matchingExportDetail) {
        throw new Error(`Chỉ được phép quét inventory item của mã hàng trong danh sách xuất`);
      }

      // NEW: Handle case where inventoryItemId is not in scanMappings (INTERNAL only)
      if (exportRequest?.type === "INTERNAL") {
        await handleInternalMultiSelectMode(inventoryItemId);
        return;
      } else {
        throw new Error("Không tìm thấy sản phẩm tương ứng với mã QR");
      }
    }

    // Validate that scanned inventory item belongs to the expected itemId
    const exportRequestDetailId = mapping.exportRequestDetailId;
    const inventoryItemIdForApi = mapping.inventoryItemId.toUpperCase();
    const matched = exportDetails.find((d) => d.id === exportRequestDetailId);

    if (!matched) {
      throw new Error("Không tìm thấy sản phẩm tương ứng với mã QR.");
    }

    // Validate itemId match - only allow scanning inventory items of the correct itemId
    if (inventoryItemData.itemId !== matched.itemId) {
      throw new Error(`Chỉ được phép quét inventory item của mã hàng ${matched.itemId}`);
    }

    // If we have a specific target item set from alert, only allow scanning for that item
    if (currentTargetItemId && matched.itemId !== currentTargetItemId) {
      throw new Error(`Hiện tại đang quét mã hàng ${currentTargetItemId}. Vui lòng quét inventory item của mã hàng ${currentTargetItemId}.`);
    }

    console.log("🔄 Call API với:", {
      exportRequestDetailId,
      inventoryItemIdForApi,
    });

    // Normal mode: Update actual quantity
    console.log("🔄 About to call updateActualQuantity");
    let success = false;
    try {
      success = await updateActualQuantity(
        exportRequestDetailId,
        inventoryItemIdForApi
      );
      console.log("✅ updateActualQuantity returned:", success);
    } catch (apiError) {
      console.log("❌ updateActualQuantity threw error:", apiError);
      throw apiError;
    }

    if (!success) throw new Error("Lỗi cập nhật số lượng");

    // Success - add to scannedIds and track measurement values
    setScannedIds((prev) => {
      if (!prev.includes(inventoryItemId)) {
        const newIds = [...prev, inventoryItemId];
        console.log(
          `📝 Added to scannedIds after success: ${JSON.stringify(newIds)}`
        );
        return newIds;
      }
      return prev;
    });

    // Mark this QR as successfully processed
    lastProcessedQRRef.current = inventoryItemId;

    // Store itemCode for back navigation
    setScannedItemCode(matched.itemId);

    await playBeep();
    
    // Check alert conditions based on export type (AFTER API call)
    let shouldShowAlert = false;
    
    if (exportRequest?.type === "SELLING") {
      // For SELLING: check if we've reached the expected quantity (after +1 from this scan)
      const newActualQuantity = matched.actualQuantity + 1;
      shouldShowAlert = newActualQuantity >= matched.quantity;
      console.log(`🔔 SELLING alert check: actualQuantity(${matched.actualQuantity}) + 1 = ${newActualQuantity} >= expectedQuantity(${matched.quantity}) = ${shouldShowAlert}`);
    } else if (exportRequest?.type === "INTERNAL") {
      // For INTERNAL: fetch fresh data to check if status became COMPLETED after this scan
      try {
        const freshExportDetail = await fetchExportRequestDetailById(Number(exportRequestDetailId));
        console.log(`🔔 INTERNAL fresh status check: ${freshExportDetail?.status}`);
        console.log(`🔔 INTERNAL fresh export detail:`, freshExportDetail);
        console.log(`🔔 INTERNAL original matched status: ${matched.status}`);
        
        // Check if status indicates completion (COMPLETED from enum)
        // Note: If API returns "MATCH", it will be logged but not trigger alert due to TypeScript constraints
        if (freshExportDetail && freshExportDetail.status === "COMPLETED") {
          shouldShowAlert = true;
          console.log(`🔔 INTERNAL: Setting alert to true because status is COMPLETED`);
        } else {
          console.log(`🔔 INTERNAL: Status is not COMPLETED, current status: ${freshExportDetail?.status}`);
          // For debugging: check if API actually returns "MATCH"
          if ((freshExportDetail as any)?.status === "MATCH" || (freshExportDetail as any)?.status === "EXCEED") {
            console.log(`🔔 INTERNAL: API returned "${(freshExportDetail as any)?.status}" status - showing completion alert`);
            shouldShowAlert = true;
          }
        }
      } catch (error) {
        console.log("❌ Error fetching fresh export detail for INTERNAL check:", error);
        // Fall back to checking if we've reached the expected quantity
        const newActualQuantity = matched.actualQuantity + 1;
        shouldShowAlert = newActualQuantity >= matched.quantity;
        console.log(`🔔 INTERNAL fallback alert check: actualQuantity(${matched.actualQuantity}) + 1 = ${newActualQuantity} >= expectedQuantity(${matched.quantity}) = ${shouldShowAlert}`);
      }
    }
    
    console.log(`🔔 Final shouldShowAlert decision: ${shouldShowAlert} for export type: ${exportRequest?.type}`);

    // Clear current target if this item is now complete
    if (shouldShowAlert && currentTargetItemId === matched.itemId) {
      console.log(`🔓 Clearing currentTargetItemId as item ${currentTargetItemId} is now complete`);
      setCurrentTargetItemId(null);
    }

    if (shouldShowAlert) {
      try {
        // FIXED: Fetch fresh export request data to get updated actualQuantity/status for all items
        console.log("🔄 Fetching fresh export request data for completion check");
        await fetchExportRequestById(id);
        
        // Wait a bit for Redux state to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Find items that need more scanning based on export type using fresh data
        let insufficientItems: any[] = [];
        
        if (exportRequest?.type === "SELLING") {
          // For SELLING: find items with insufficient quantity
          insufficientItems = exportDetails.filter(
            (detail: any) => {
              // For the current item that was just scanned, it should now have updated actualQuantity
              // For other items, check current actualQuantity
              return detail.actualQuantity < detail.quantity;
            }
          );
        } else if (exportRequest?.type === "INTERNAL") {
          // For INTERNAL: need to fetch fresh status for all items
          const freshStatusPromises = exportDetails.map(async (detail: any) => {
            try {
              const freshDetail = await fetchExportRequestDetailById(Number(detail.id));
              return {
                ...detail,
                status: freshDetail?.status || detail.status
              };
            } catch (error) {
              console.log(`❌ Error fetching fresh status for detail ${detail.id}:`, error);
              return detail; // Return original if fetch fails
            }
          });
          
          const freshStatusItems = await Promise.all(freshStatusPromises);
          
          insufficientItems = freshStatusItems.filter(
            (detail: any) => {
              // Check for COMPLETED, MATCH, or EXCEED status
              const isCompleted = detail.status === "COMPLETED" || 
                                 (detail as any).status === "MATCH" || 
                                 (detail as any).status === "EXCEED";
              return !isCompleted;
            }
          );
        }

        console.log(`🔍 Fresh check found ${insufficientItems.length} insufficient items:`, 
          insufficientItems.map(item => ({
            id: item.id,
            itemId: item.itemId,
            status: item.status,
            actualQuantity: item.actualQuantity,
            quantity: item.quantity
          }))
        );

        if (insufficientItems.length > 0) {
          const nextItem = insufficientItems[0];
          console.log(`🔄 Next item to navigate to:`, {
            id: nextItem.id,
            itemId: nextItem.itemId,
            status: nextItem.status,
            actualQuantity: nextItem.actualQuantity,
            quantity: nextItem.quantity
          });
          setAlertShowing(true);
          setScanningEnabled(false);
          
          const alertTitle = exportRequest?.type === "SELLING" ? "Hoàn thành quét mã hàng" : "Mã hàng đã đủ";
          const alertMessage = exportRequest?.type === "SELLING" 
            ? `Đã quét đủ số lượng của mã hàng ${matched.itemId}. Bạn có muốn tiếp tục kiểm đếm mã hàng tiếp theo?`
            : `Mã hàng ${matched.itemId} đã quét đủ số lượng. Bạn có muốn tiếp tục kiểm đếm mã hàng tiếp theo?`;
          
          Alert.alert(
            alertTitle,
            alertMessage,
            [
              {
                text: "Hủy",
                style: "cancel",
                onPress: () => {
                  setAlertShowing(false);
                  // Navigate back to main export detail screen
                  router.replace(`/export/export-detail/${id}`);
                }
              },
              {
                text: "Xác nhận",
                onPress: () => {
                  setAlertShowing(false);
                  console.log(`🔄 Alert confirm pressed - continuing scan for next item:`, {
                    nextItemId: nextItem.id,
                    itemCode: nextItem.itemId,
                    exportRequestId: id
                  });

                  // Set the target item ID to focus on the next item
                  setCurrentTargetItemId(nextItem.itemId);

                  // Re-enable scanning
                  setTimeout(() => {
                    setScanningEnabled(true);
                    console.log(`🔄 Scanning enabled for next item: ${nextItem.itemId}`);
                  }, 100);
                }
              }
            ]
          );
          return;
        } else {
          // All items are complete - clear target and navigate back to main screen
          console.log(`✅ All items are complete - showing completion alert`);
          setCurrentTargetItemId(null);
          setAlertShowing(true);
          setScanningEnabled(false);

          const completionMessage = exportRequest?.type === "SELLING"
            ? "Tất cả sản phẩm đã được quét đủ số lượng."
            : "Tất cả sản phẩm đã hoàn thành kiểm tra.";

          Alert.alert(
            "Hoàn thành",
            completionMessage,
            [
              {
                text: "OK",
                onPress: () => {
                  setAlertShowing(false);
                  router.replace(`/export/export-detail/${id}`);
                }
              }
            ]
          );
          return;
        }
      } catch (freshDataError) {
        console.log("❌ Error fetching fresh data for completion check:", freshDataError);
        // Fallback to original logic if API calls fail
        let insufficientItems: any[] = [];
        
        if (exportRequest?.type === "SELLING") {
          // For SELLING: find items with insufficient quantity
          insufficientItems = exportDetails.filter(
            (detail: any) => detail.actualQuantity < detail.quantity && detail.id !== exportRequestDetailId
          );
        } else if (exportRequest?.type === "INTERNAL") {
          // For INTERNAL: find items that are not COMPLETED status
          insufficientItems = exportDetails.filter(
            (detail: any) => detail.status !== "COMPLETED" && detail.id !== exportRequestDetailId
          );
        }

        console.log(`🔍 Fallback found ${insufficientItems.length} insufficient items`);
        
        if (insufficientItems.length > 0) {
          // Show continue alert with fallback logic
          const nextItem = insufficientItems[0];
          setAlertShowing(true);
          setScanningEnabled(false);
          
          const alertTitle = exportRequest?.type === "SELLING" ? "Hoàn thành quét mã hàng" : "Mã hàng đã đủ";
          const alertMessage = exportRequest?.type === "SELLING" 
            ? `Đã quét đủ số lượng của mã hàng ${matched.itemId}. Bạn có muốn tiếp tục kiểm đếm mã hàng tiếp theo?`
            : `Mã hàng ${matched.itemId} đã quét đủ số lượng. Bạn có muốn tiếp tục kiểm đếm mã hàng tiếp theo?`;
          
          Alert.alert(
            alertTitle,
            alertMessage,
            [
              {
                text: "Hủy",
                style: "cancel",
                onPress: () => {
                  setAlertShowing(false);
                  router.replace(`/export/export-detail/${id}`);
                }
              },
              {
                text: "Xác nhận",
                onPress: () => {
                  setAlertShowing(false);
                  setCurrentTargetItemId(nextItem.itemId);
                  setTimeout(() => {
                    setScanningEnabled(true);
                  }, 100);
                }
              }
            ]
          );
          return;
        } else {
          // Show completion alert
          console.log(`✅ Fallback: All items are complete`);
          setCurrentTargetItemId(null);
          setAlertShowing(true);
          setScanningEnabled(false);

          const completionMessage = exportRequest?.type === "SELLING"
            ? "Tất cả sản phẩm đã được quét đủ số lượng."
            : "Tất cả sản phẩm đã hoàn thành kiểm tra.";

          Alert.alert(
            "Hoàn thành",
            completionMessage,
            [
              {
                text: "OK",
                onPress: () => {
                  setAlertShowing(false);
                  router.replace(`/export/export-detail/${id}`);
                }
              }
            ]
          );
          return;
        }
      }
    }
    
    // For both SELLING and INTERNAL types, show scanned quantity in success message
    if (exportRequest?.type === "SELLING" || exportRequest?.type === "INTERNAL") {
      // Use actual quantity from matched export detail (updated after API call)
      const currentActualQuantity = matched.actualQuantity + 1; // +1 for current scan
      const expectedQuantity = matched.quantity;

      // Only show measurement info for INTERNAL exports
      if (exportRequest?.type === "INTERNAL") {
        // Fetch fresh export detail data to get updated measurement values
        fetchExportRequestDetailById(Number(exportRequestDetailId)).then(freshExportDetail => {
          if (freshExportDetail) {
            const expectedMeasurement = freshExportDetail.measurementValue || 0;
            const actualMeasurement = freshExportDetail.actualMeasurementValue || 0;
            
            // Get item details to fetch measurement unit
            getItemDetailById(matched.itemId).then(itemDetails => {
              const unit = itemDetails?.measurementUnit || '';
              
              setLastScannedProduct({
                ...matched,
                actualQuantity: freshExportDetail.actualQuantity, // Use fresh data
                message: `Đã quét ${freshExportDetail.actualQuantity}/${expectedQuantity} - ${matched.itemId}`,
                measurementInfo: `Giá trị cần xuất: ${expectedMeasurement}${unit ? ' ' + unit : ''} | Giá trị đã quét: ${actualMeasurement}${unit ? ' ' + unit : ''}`
              });
            }).catch(() => {
              // Fallback without unit if fetch fails
              setLastScannedProduct({
                ...matched,
                actualQuantity: freshExportDetail.actualQuantity, // Use fresh data
                message: `Đã quét ${freshExportDetail.actualQuantity}/${expectedQuantity} - ${matched.itemId}`,
                measurementInfo: `Giá trị cần xuất: ${expectedMeasurement} | Giá trị đã quét: ${actualMeasurement}`
              });
            });
          } else {
            // Fallback to original data if fetch fails
            const expectedMeasurement = matched.measurementValue || 0;
            const actualMeasurement = matched.actualMeasurementValue || 0;
            
            setLastScannedProduct({
              ...matched,
              message: `Đã quét ${currentActualQuantity}/${expectedQuantity} - ${matched.itemId}`,
              measurementInfo: `Giá trị cần xuất: ${expectedMeasurement} | Giá trị đã quét: ${actualMeasurement}`
            });
          }
        }).catch(() => {
          // Fallback to original data if fetch fails
          const expectedMeasurement = matched.measurementValue || 0;
          const actualMeasurement = matched.actualMeasurementValue || 0;
          
          setLastScannedProduct({
            ...matched,
            message: `Đã quét ${currentActualQuantity}/${expectedQuantity} - ${matched.itemId}`,
            measurementInfo: `Giá trị cần xuất: ${expectedMeasurement} | Giá trị đã quét: ${actualMeasurement}`
          });
        });
      } else {
        // For SELLING type, only show quantity without measurement info
        setLastScannedProduct({
          ...matched,
          message: `Đã quét ${currentActualQuantity}/${expectedQuantity} - ${matched.itemId}`
        });
      }
    } else {
      setLastScannedProduct(matched);
    }

    // Clear success message after longer duration
    setTimeout(() => {
      setLastScannedProduct(null);
      // Remove auto-navigation, only back button will navigate to modal
    }, 2000);

    console.log("✅ Scan successful for:", inventoryItemId);
  } catch (err: any) {
    console.log("❌ Scan error:", err);

    const message =
      err?.response?.data?.message || err?.message || "Lỗi không xác định";
    let displayMessage = "QR không hợp lệ.";

    if (message.toLowerCase().includes("has been tracked")) {
      displayMessage = "Sản phẩm này đã được quét trước đó!";
      // If API says already tracked, add to scannedIds and track measurement
      setScannedIds((prev) => {
        if (!prev.includes(inventoryItemId)) {
          const newIds = [...prev, inventoryItemId];
          console.log(
            `🔄 API says already tracked, adding to scannedIds: ${JSON.stringify(
              newIds
            )}`
          );
          return newIds;
        }
        return prev;
      });
      
      
      lastProcessedQRRef.current = inventoryItemId;
    } else if (message.toLowerCase().includes("not stable")) {
      displayMessage = "Sản phẩm không hợp lệ.";
    } else if (message.toLowerCase().includes("no matching inventory item found")) {
      displayMessage = "Không tìm thấy sản phẩm với giá trị phù hợp";
      // Call updateActualQuantity with the reset tracking inventoryItemId
      try {
        console.log("🔄 Calling updateActualQuantity for no matching inventory item with inventoryItemId:", inventoryItemId);
        // Try to find mapping again to get exportRequestDetailId
        const mapping = scanMappings.find(
          (m) => m.inventoryItemId.toUpperCase() === inventoryItemId.toUpperCase()
        );
        if (mapping) {
          await updateActualQuantity(mapping.exportRequestDetailId, inventoryItemId);
        }
      } catch (updateError) {
        console.log("❌ Error calling updateActualQuantity for no matching item:", updateError);
      }
    } else {
      displayMessage = `${message}`;
    }

    setErrorMessage(displayMessage);

    // Clear error message after 4s
    setTimeout(() => setErrorMessage(null), 4000);
  } finally {
    // Clear the currently processing ref
    currentlyProcessingRef.current = null;
    console.log("🔓 Cleared processing ref");

    setIsProcessing(false);

    // Re-enable scanning after longer delay
    setTimeout(() => {
      setScanningEnabled(true);
      console.log("✅ Scanning re-enabled");
    }, 2500);
  }
};

  const handleRetry = () => {
    console.log("🔄 Retry button pressed, resetting state");
    setErrorMessage(null);
    setLastScannedProduct(null);
    setIsProcessing(false);
    lastScanTimeRef.current = 0;
    currentlyProcessingRef.current = null;
    lastProcessedQRRef.current = null;

    setTimeout(() => {
      setScanningEnabled(true);
      setCameraKey((prev) => prev + 1);
      console.log("✅ Retry complete, scanning re-enabled");
    }, 300);
  };


  // NEW: Handle INTERNAL multi-select mode with confirmation alert
  const handleInternalMultiSelectMode = async (inventoryItemId: string) => {
    try {
      console.log(`🔍 INTERNAL mode: Item not in mappings, checking itemId validation: ${inventoryItemId}`);
      
      // Get inventory item data to check itemId
      const inventoryItemData = await fetchInventoryItemById(inventoryItemId);
      if (!inventoryItemData) {
        throw new Error("Mã QR không hợp lệ hoặc không tồn tại trong hệ thống");
      }

      // Check if any export request detail has the same itemId
      const matchingExportDetail = exportDetails.find(
        (detail: any) => detail.itemId === inventoryItemData.itemId
      );

      if (!matchingExportDetail) {
        throw new Error("Không thể đổi sản phẩm có khác mã hàng");
      }

      console.log(`✅ INTERNAL multi-select: Item ${inventoryItemId} validated`);
      
      // Get list of all inventory items for this export request detail
      const allInventoryItems = await fetchInventoryItemsByExportRequestDetailId(Number(matchingExportDetail.id));
      
      console.log(`📋 Found ${allInventoryItems.length} items for replacement`);
      
      // Disable scanning while alert is shown
      setScanningEnabled(false);
      setAlertShowing(true);
      
      // Show confirmation alert
      Alert.alert(
        "Xác nhận thay đổi",
        `Mã hàng tồn kho ${inventoryItemId} không có trong phiếu xuất này.\n\nBạn có muốn đổi mã hàng này với mã hàng trong phiếu xuất?`,
        [
          {
            text: "Hủy",
            style: "cancel",
            onPress: () => {
              // Re-enable scanning when user cancels
              setAlertShowing(false);
              setScanningEnabled(true);
              setIsProcessing(false);
              currentlyProcessingRef.current = null;
            }
          },
          {
            text: "Xác nhận",
            onPress: () => {
              // Store scanned item in Redux and navigate to export-inventory with multi-select
              console.log(`🔄 INTERNAL multi-select: Storing scanned item ${inventoryItemId} in Redux`);
              dispatch(setScannedNewItemForMultiSelect(inventoryItemId));
              
              // Re-enable scanning before navigation in case user comes back
              setAlertShowing(false);
              setScanningEnabled(true);
              setIsProcessing(false);
              currentlyProcessingRef.current = null;
              
              setTimeout(() => {
                console.log(`🔄 INTERNAL multi-select: Navigating to export-inventory with ${allInventoryItems.length} items`);
                router.replace({
                  pathname: '/export/export-inventory/[id]',
                  params: {
                    id: matchingExportDetail.id,
                    itemCode: inventoryItemData.itemId,
                    exportRequestDetailId: matchingExportDetail.id,
                    exportRequestId: id,
                    exportRequestType: exportRequest?.type || "",
                    exportRequestStatus: exportRequest?.status || "",
                    originalItemId: 'INTERNAL_MULTI_SELECT', // Special flag for multi-select mode
                    untrackedItemIds: allInventoryItems.map((item: any) => item.id).join(','), // Pass all IDs as comma-separated string
                  },
                });
              }, 500);
            }
          }
        ]
      );
      
      setIsProcessing(false);
      
    } catch (error: any) {
      console.log("❌ Error in handleInternalMultiSelectMode:", error);
      const message = error?.response?.data?.message || error?.message || "Lỗi không xác định";
      setErrorMessage(message);
      
      // Re-enable scanning after error
      setTimeout(() => {
        setErrorMessage(null);
        setScanningEnabled(true);
        setIsProcessing(false);
        currentlyProcessingRef.current = null;
      }, 3000);
    }
  };



  if (hasPermission === null) return <Text>Đang xin quyền camera...</Text>;
  if (hasPermission === false) return <Text>Không có quyền dùng camera</Text>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button onPress={() => {
          const targetItemCode = itemIdForNavigation || scannedItemCode || '';
          console.log(`🔙 QR Scan back pressed - targetItemCode: ${targetItemCode}`);
          
          if (targetItemCode) {
            // Find the export request detail for this itemCode
            const targetDetail = exportDetails.find(
              (detail: any) => detail.itemId === targetItemCode
            );
            
            if (targetDetail) {
              // Navigate directly to ExportInventory screen
              console.log(`🔙 QR Scan - navigating to ExportInventory for itemCode: ${targetItemCode}`);
              router.replace({
                pathname: '/export/export-inventory/[id]',
                params: {
                  id: targetDetail.id,
                  itemCode: targetItemCode,
                  exportRequestDetailId: targetDetail.id,
                  exportRequestId: id, // Add the exportRequestId for back navigation
                  exportRequestType: exportRequest?.type || "",
                  exportRequestStatus: exportRequest?.status || "",
                },
              });
            } else {
              // Fallback to export-detail if no matching detail found
              console.log(`🔙 QR Scan - no matching detail found, navigating to export-detail: ${id}`);
              router.replace(`/export/export-detail/${id}`);
            }
          } else {
            // No itemCode, go back to export-detail
            console.log(`🔙 QR Scan - no itemCode, navigating to export-detail: ${id}`);
            router.replace(`/export/export-detail/${id}`);
          }
        }}>←</Button>
        <Text style={styles.headerTitle}>Quét QR</Text>
      </View>

      {/* Current Target Item Indicator */}
      {/* {currentTargetItemId && (
        <View style={styles.targetIndicator}>
          <Text style={styles.targetText}>
            🎯 Đang quét mã hàng: {currentTargetItemId}
          </Text>
        </View>
      )} */}

      {/* Camera */}
      <View style={styles.cameraWrapper}>
        {isFocused && !alertShowing && (
          <CameraView
            key={cameraKey}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={
              scanningEnabled ? handleBarCodeScanned : undefined
            }
            style={StyleSheet.absoluteFillObject}
            zoom={0}
            mode="picture"
          />
        )}

        {errorMessage && (
          <View style={styles.bottomBox}>
            <View style={styles.productBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.errorText}>{errorMessage}</Text>
                <Button onPress={handleRetry} style={styles.retryButton}>
                  Quét tiếp sản phẩm khác
                </Button>
              </View>
            </View>
          </View>
        )}

        {lastScannedProduct && (
          <View style={styles.bottomBox}>
            <View style={styles.productBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>
                  {lastScannedProduct.message || "Mã sản phẩm"}
                </Text>
                <Text style={styles.productTitle}>
                  {lastScannedProduct.itemId || lastScannedProduct.id}
                </Text>
                {lastScannedProduct.measurementInfo && (
                  <Text style={styles.measurementText}>
                    {lastScannedProduct.measurementInfo}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  targetIndicator: {
    backgroundColor: "#e3f2fd",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderColor: "#bbdefb",
  },
  targetText: {
    fontSize: 14,
    color: "#1976d2",
    fontWeight: "600",
    textAlign: "center",
  },
  cameraWrapper: {
    flex: 1,
    position: "relative",
  },
  pauseBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  pauseText: {
    fontSize: 16,
    color: "#2ecc71",
    marginBottom: 12,
    textAlign: "center",
  },
  errorBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#e74c3c",
    marginBottom: 12,
    textAlign: "center",
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "#1677ff",
    borderRadius: 8,
    color: "white",
    fontWeight: 500,
  },
  bottomBox: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  productBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 5,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  productName: {
    fontSize: 14,
    color: "#555",
  },
  reasonInputBox: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 8,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  reasonButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  reasonButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#1677ff",
  },
  submitButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#ccc",
  },
  keyboardAvoidingView: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  // NEW: Modal styles
  modalOverlay: {
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
  modalDialog: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: "#495057",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  modalProductInfo: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  modalProductText: {
    fontSize: 14,
    color: "#495057",
    marginBottom: 4,
    textAlign: "center",
  },
  modalButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#c1c1c1ff",
  },
  modalCancelButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  modalConfirmButton: {
    backgroundColor: "#1677ff",
  },
  modalConfirmButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  // Measurement info styles
  measurementInfo: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  measurementLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#495057",
    marginBottom: 8,
  },
  measurementText: {
    fontSize: 14,
    color: "#6c757d",
    marginBottom: 4,
  },
  // Warning modal styles
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
  warningMeasurementInfo: {
    backgroundColor: "#fff3cd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#ffeaa7",
  },
  warningMeasurementText: {
    fontSize: 14,
    color: "#856404",
    marginBottom: 4,
    textAlign: "center",
  },
});

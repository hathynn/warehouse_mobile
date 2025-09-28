import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Alert,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/redux/store";
import { setScanMappings, setScannedNewItemForMultiSelect } from "@/redux/exportRequestDetailSlice";
import { Button } from "tamagui";
import { useIsFocused } from "@react-navigation/native";
import { Audio } from "expo-av";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import useExportRequest from "@/services/useExportRequestService";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";


export default function ScanQrManualScreen() {
  const { id, originalItemId: originalFromRoute, exportRequestDetailId } =
    useLocalSearchParams<{
      id: string;
      originalItemId?: string;
      exportRequestDetailId?: string;
    }>();

  const [currentOriginalId, setCurrentOriginalId] = useState<string>(
    (originalFromRoute || "").toUpperCase()
  );

  // Check if this is INTERNAL multi-select mode
  const isInternalMultiSelect = originalFromRoute === 'INTERNAL_MULTI_SELECT';

  // Check if this is normal scan mode (not replacing any item)
  const isNormalScan = originalFromRoute === 'NORMAL_SCAN';

  // Debug logging for params
  console.log(`🔍 Manual QR Scan params:`, {
    id,
    originalFromRoute,
    currentOriginalId,
    isInternalMultiSelect,
    isNormalScan,
    exportRequestDetailId
  });



  // ép sang number để gọi API
  const exportDetailIdNum = exportRequestDetailId ? Number(exportRequestDetailId) : undefined;



  // console.log(`📱 QR Manual Scan screen loaded with params:`, { id, originalItemId });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const isFocused = useIsFocused();
  const dispatch = useDispatch();
  const { resetTracking, updateActualQuantity, fetchExportRequestDetailById } = useExportRequestDetail();
  const { exportRequest, fetchExportRequestById } = useExportRequest();
  const { changeInventoryItemForExportDetail, fetchInventoryItemById, fetchInventoryItemsByExportRequestDetailId } = useInventoryService();
  const { getItemDetailById } = useItemService();
  const [scanningEnabled, setScanningEnabled] = useState(true);

  // Manual change mode states
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [scannedNewItemId, setScannedNewItemId] = useState<string | null>(null);
  const [newInventoryItemData, setNewInventoryItemData] = useState<any | null>(null);
  const [showMeasurementWarning, setShowMeasurementWarning] = useState(false);
  const [itemData, setItemData] = useState<any | null>(null);
  const [itemIdForNavigation, setItemIdForNavigation] = useState<string>("");

  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );

  // Validation function for measurement replacement
  const validateMeasurementForReplacement = async (
    oldItemId: string,
    newItem: any,
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

  // Enhanced debounce mechanism and processing tracking
  const lastScanTimeRef = useRef<number>(0);
  const currentlyProcessingRef = useRef<string | null>(null);
  const lastProcessedQRRef = useRef<string | null>(null);
  const SCAN_DEBOUNCE_MS = 2000;
  const SUCCESS_COOLDOWN_MS = 3000;

  const scanMappings = useSelector(
    (state: RootState) => state.exportRequestDetail.scanMappings
  );

  const savedExportRequestDetails = useSelector(
    (state: RootState) => state.exportRequestDetail.details
  );

  const measurementModalVisible = useSelector(
    (state: RootState) => state.exportRequestDetail.measurementModalVisible
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
      if (audioPlayer) {
        audioPlayer.unloadAsync();
      }
    };
  }, []); // Remove audioPlayer from dependency array to prevent re-rendering loop

  const playBeep = async () => {
    try {
      if (audioPlayer) {
        await audioPlayer.replayAsync();
      }
    } catch (err) {
      console.warn("🔇 Không thể phát âm:", err);
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  // Fetch export request data when component mounts
  useEffect(() => {
    if (id) {
      fetchExportRequestById(id);
    }
  }, [id, fetchExportRequestById]);

  // Reset scanning state when screen is focused
  useEffect(() => {
    if (isFocused) {
      console.log("🔄 Screen focused, resetting scan state");
      setIsProcessing(false);
      setScanningEnabled(true);
      setErrorMessage(null);
      setLastScannedProduct(null);
      lastScanTimeRef.current = 0;
      currentlyProcessingRef.current = null;
      lastProcessedQRRef.current = null;
      // Don't reset newInventoryItemData and itemData here to preserve dialog state
    }
  }, [isFocused]);

  // Handle measurement modal visibility changes
  useEffect(() => {
    if (measurementModalVisible) {
      console.log("📱 Measurement modal opened - disabling QR scanning");
      setScanningEnabled(false);
      setIsProcessing(false);
      currentlyProcessingRef.current = null;
    } else {
      console.log("📱 Measurement modal closed - enabling QR scanning");
      // Re-enable scanning after modal closes, but not immediately to prevent accidental scans
      setTimeout(() => {
        setScanningEnabled(true);
      }, 500);
    }
  }, [measurementModalVisible]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Removed console.log disabling in development mode to allow debugging

    const currentTime = Date.now();
    const rawInventoryItemId = data.trim().toUpperCase(); // Always convert to uppercase
    const inventoryItemId = rawInventoryItemId; // Use uppercase consistently

    console.log(`📱 Manual Scanning QR: ${inventoryItemId}`);
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
      );2
      return;
    }

    // Check scanning state
    if (!scanningEnabled || isProcessing || measurementModalVisible) {
      console.log("🚫 Scan disabled, processing, or modal visible, ignoring scan");
      return;
    }

    // IMMEDIATELY disable scanning and set processing state
    setScanningEnabled(false);
    setIsProcessing(true);
    currentlyProcessingRef.current = inventoryItemId;
    lastScanTimeRef.current = currentTime;

    console.log(`🔒 Processing started for: ${inventoryItemId}`);

    // Clear previous messages and scanned data
    setErrorMessage(null);
    setLastScannedProduct(null);
    setNewInventoryItemData(null);
    setItemData(null);
    setScannedNewItemId(null);

    try {
      console.log("📦 Raw QR data:", data);
      console.log("🔍 inventoryItemId:", inventoryItemId);

      if (isInternalMultiSelect) {
        console.log(`📝 INTERNAL Multi-select mode: Scanned item ${inventoryItemId} to add to selection`);
      } else if (isNormalScan) {
        console.log(`📝 Normal scan mode: Scanned item ${inventoryItemId} for regular processing`);
      } else {
        // Manual change mode: Validate same itemId before allowing change
        console.log(`📝 Manual change mode: Scanned new item ${inventoryItemId} to replace ${currentOriginalId}`);

        if (currentOriginalId && inventoryItemId === currentOriginalId) {
          throw new Error("Không thể đổi sang cùng một inventory item!");
        }
      }

      // Get inventory item details to validate itemId
      const inventoryItemData = await fetchInventoryItemById(inventoryItemId);
      if (!inventoryItemData) {
        throw new Error("Không tìm thấy hàng tồn kho với mã đã quét");
      }

      let originalItemData = null;

      if (!isInternalMultiSelect && !isNormalScan) {
        // Manual change mode: Validate that the new item has the same itemId (product type) as the original
        // We need to get the original item's data to compare itemId
        if (!currentOriginalId || currentOriginalId.trim() === '' || currentOriginalId === 'NORMAL_SCAN') {
          throw new Error("Thiếu thông tin inventory item gốc để so sánh");
        }

        console.log(`🔍 Fetching original item data for: ${currentOriginalId}`);
        originalItemData = await fetchInventoryItemById(currentOriginalId);
        if (!originalItemData) {
          throw new Error(`Không tìm thấy thông tin hàng tồn kho gốc: ${currentOriginalId}`);
        }

        console.log(`🔍 Comparing itemIds - Original: ${originalItemData.itemId}, Scanned: ${inventoryItemData.itemId}`);
        if (inventoryItemData.itemId !== originalItemData.itemId) {
          throw new Error(`Chỉ được đổi hàng tồn kho có cùng mã sản phẩm!`);
        }

        console.log(`✅ ItemId validation passed: ${inventoryItemData.itemId} === ${originalItemData.itemId}`);

        // Additional validation for SELLING export: measurement value must match
        if (exportRequest?.type === "SELLING") {
          console.log(`🔍 SELLING export - Comparing measurement values - Original: ${originalItemData.measurementValue}, Scanned: ${inventoryItemData.measurementValue}`);
          if (inventoryItemData.measurementValue !== originalItemData.measurementValue) {
            throw new Error(`Chỉ được đổi hàng tồn kho có cùng giá trị đo lường!\nGiá trị gốc: ${originalItemData.measurementValue}\nGiá trị đã quét: ${inventoryItemData.measurementValue}`);
          }
          console.log(`✅ SELLING measurement validation passed: ${inventoryItemData.measurementValue} === ${originalItemData.measurementValue}`);
        }
      } else if (isInternalMultiSelect) {
        console.log(`✅ INTERNAL multi-select: Skipping original item validation`);
      } else if (isNormalScan) {
        console.log(`✅ Normal scan mode: Skipping original item validation`);
      }

      // For INTERNAL multi-select mode, handle differently
      if (isInternalMultiSelect) {
        // Just validate the scanned item and return to export-inventory with the result
        console.log(`✅ INTERNAL multi-select: Item ${inventoryItemId} validated, navigating back`);
        
        setScannedNewItemId(inventoryItemId);
        setIsProcessing(false);
        
        // Store scanned item in Redux and navigate back
        console.log(`🔄 INTERNAL multi-select: Storing scanned item ${inventoryItemId} in Redux`);
        dispatch(setScannedNewItemForMultiSelect(inventoryItemId));
        
        setTimeout(() => {
          console.log(`🔄 INTERNAL multi-select: Navigating back to show measurement modal`);
          router.back();
        }, 500);
        
        return; // Skip all the replacement logic
      }

      // Validate inventory item status - không cho đổi nếu UNAVAILABLE hoặc NEED_LIQUID
      if (inventoryItemData.status === 'UNAVAILABLE' || inventoryItemData.status === 'NEED_LIQUID') {
        throw new Error("Sản phẩm đang chờ xuất hoặc thanh lý");
      }

      console.log(`✅ Status validation passed: ${inventoryItemData.status} is allowed`);

      // Removed measurement validation for replacement - allow all measurement values

      // Removed SELLING export measurement validation - allow all measurement values

      if (exportDetailIdNum) {
        try {
          const itemsInDetail = await fetchInventoryItemsByExportRequestDetailId(exportDetailIdNum);
          const alreadyInDetail = itemsInDetail.some(
            it => (it.id || "").toUpperCase() === inventoryItemId
          );

          if (alreadyInDetail) {
            // Báo lỗi sớm và KHÔNG mở form
            setErrorMessage("Sản phẩm này đã có trong đơn xuất");
            setIsProcessing(false);

            // Cho phép quét tiếp (có thể delay 1 chút để user đọc message)
            setTimeout(() => {
              setScanningEnabled(true);
              setErrorMessage(null);
            }, 1500);

            return; 
          }
        } catch (e) {
          console.warn("⚠️ Không kiểm tra được membership, tiếp tục flow mặc định:", e);
        }
      }
      // Get item data for measurementUnit
      const itemInfo = await getItemDetailById(inventoryItemData.itemId);
      
      // Store inventory item data for measurement value display and validation
      console.log(`🔄 Setting scanned item data: ${inventoryItemId}`, {
        inventoryItemData: inventoryItemData ? 'present' : 'null',
        itemInfo: itemInfo ? 'present' : 'null'
      });
      setNewInventoryItemData(inventoryItemData);
      setItemData(itemInfo);
      setScannedNewItemId(inventoryItemId);

      // Store the itemId for back navigation
      setItemIdForNavigation(inventoryItemData.itemId);

      await playBeep();

      if (isNormalScan) {
        // Normal scan mode - directly process without reason input
        setLastScannedProduct({
          id: inventoryItemId,
          itemId: inventoryItemId,
          message: "Đã quét item thành công."
        });

        // For normal scan, call updateActualQuantity directly
        if (exportDetailIdNum) {
          try {
            console.log(`🔄 Normal scan - updating actual quantity for item: ${inventoryItemId}`);
            const updateResult = await updateActualQuantity(exportDetailIdNum.toString(), inventoryItemId);
            if (updateResult) {
              console.log("✅ Normal scan - actual quantity updated successfully");

              // Add scan mapping for normal scan
              const newMapping = { exportRequestDetailId: exportDetailIdNum.toString(), inventoryItemId: inventoryItemId };
              const updatedMappings = [...scanMappings, newMapping];
              dispatch(setScanMappings(updatedMappings));
              console.log("✅ Normal scan - scan mapping added");

              // Navigate back after successful scan
              setTimeout(() => {
                router.back();
              }, 1500);
            } else {
              console.log("❌ Normal scan - failed to update actual quantity");
              setErrorMessage("Không thể cập nhật số lượng thực tế");
            }
          } catch (normalScanError) {
            console.log("❌ Normal scan error:", normalScanError);
            setErrorMessage("Lỗi khi xử lý scan: " + (normalScanError as any)?.message);
          }
        }
      } else {
        // Manual change mode - show reason input
        setTimeout(() => {
          setShowReasonInput(true);
        }, 100);
        setLastScannedProduct({
          id: inventoryItemId,
          itemId: inventoryItemId,
          message: "Đã quét item mới. Vui lòng nhập lý do thay đổi."
        });
      }

    } catch (err: any) {
      console.log("❌ Manual Scan error:", err);

      const message =
        err?.response?.data?.message || err?.message || "Lỗi không xác định";
      let displayMessage = "QR không hợp lệ.";

      displayMessage = `${message}`;

      setErrorMessage(displayMessage);

      // Clear error message after 4s
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsProcessing(false);

      // Delay clearing the processing ref to prevent rapid duplicate scans
      setTimeout(() => {
        currentlyProcessingRef.current = null;
        console.log("🔓 Cleared processing ref");
      }, 500);

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
    // Only reset dialog data if dialog is not currently shown
    if (!showReasonInput) {
      setNewInventoryItemData(null);
      setItemData(null);
      setScannedNewItemId(null);
    }

    setTimeout(() => {
      setScanningEnabled(true);
      setCameraKey((prev) => prev + 1);
      console.log("✅ Retry complete, scanning re-enabled");
    }, 300);
  };

  const handleManualChangeSubmit = async () => {
    console.log("🔍 Manual change submit validation:", {
      scannedNewItemId,
      currentOriginalId,
      changeReason: changeReason.trim(),
      changeReasonLength: changeReason.trim().length
    });

    if (!scannedNewItemId || !currentOriginalId || currentOriginalId === "NORMAL_SCAN" || !changeReason.trim()) {
      console.log("❌ Validation failed:", {
        hasScannedNewItemId: !!scannedNewItemId,
        hasCurrentOriginalId: !!currentOriginalId,
        isNormalScanValue: currentOriginalId === "NORMAL_SCAN",
        hasChangeReason: !!changeReason.trim(),
        currentOriginalIdValue: currentOriginalId
      });

      if (currentOriginalId === "NORMAL_SCAN") {
        setErrorMessage("Lỗi: Không thể thực hiện manual change từ normal scan mode");
      } else {
        setErrorMessage("Vui lòng nhập lý do thay đổi");
      }
      return;
    }

    // Prevent multiple submissions
    if (isProcessing) {
      console.log("🚫 Already processing manual change, ignoring duplicate submission");
      return;
    }

    // Removed measurement warning for INTERNAL exports - allow all measurement values

    await performManualChange();
  };

  const performManualChange = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      console.log(`🔄 QR Manual change: ${currentOriginalId} -> ${scannedNewItemId}, reason: ${changeReason}`);


      if (exportDetailIdNum && scannedNewItemId) {
        try {
          // Lấy danh sách inventory items của detail để kiểm tra membership
          const itemsInDetail = await fetchInventoryItemsByExportRequestDetailId(exportDetailIdNum);
          const alreadyInDetail = itemsInDetail.some(
            it => (it.id || "").toUpperCase() === scannedNewItemId.toUpperCase()
          );

          if (alreadyInDetail) {
            console.log("ℹ️ New item đã có trong export request detail -> bỏ qua đổi");
            // CHỐT: chỉ đổi original để tiếp tục chuỗi quét
            setCurrentOriginalId(scannedNewItemId);
            setShowReasonInput(false);
            setChangeReason("");
            setScannedNewItemId(null);
            setIsProcessing(false);
            setLastScannedProduct({
              id: scannedNewItemId,
              message: "Mã này đã có trong phiếu, đã chuyển mã gốc để quét tiếp."
            });
            setTimeout(() => setLastScannedProduct(null), 2000);
            return; // ⛔ stop ở đây, không reset + không change
          }
        } catch (e) {
          console.warn("⚠️ Không kiểm tra được membership, tiếp tục flow mặc định:", e);
        }
      }

      // ✅ 1) RESET TRACKING TRƯỚC — dùng exportRequestDetailId truyền sang
      if (exportDetailIdNum && currentOriginalId) {
        try {
          const originalInventoryItemData = await fetchInventoryItemById(currentOriginalId);
          if (originalInventoryItemData?.isTrackingForExport) {
            const ok = await resetTracking(exportDetailIdNum.toString(), currentOriginalId);
            if (!ok) throw new Error("Không thể reset tracking cho item cũ");
            console.log(`✅ Reset tracking successful for: ${currentOriginalId}`);
          } else {
            console.log(`ℹ️ ${currentOriginalId} không tracking, bỏ qua reset`);
          }
        } catch (e) {
          console.log("❌ Reset tracking error:", e);
          setIsProcessing(false);
          setErrorMessage("Không thể huỷ tracking mã cũ. Vui lòng thử lại!");
          return;
        }
      } else {
        console.warn("ℹ️ Thiếu exportRequestDetailId hoặc currentOriginalId — bỏ qua resetTracking");
      }

      // ✅ 2) ĐỔI ITEM
      console.log(`🔄 Manual change API params:`, {
        currentOriginalId,
        scannedNewItemId,
        changeReason: changeReason.trim(),
      });

      await changeInventoryItemForExportDetail(
        currentOriginalId,
        scannedNewItemId!,
        changeReason
      );
      console.log("✅ QR Manual change successful");

      // ✅ 3) UPDATE ACTUAL QUANTITY theo exportRequestDetailId (không dựa scanMappings)
      if (exportDetailIdNum && scannedNewItemId) {
        console.log(`🔄 Updating actual quantity for new item: ${scannedNewItemId} @ detail ${exportDetailIdNum}`);
        const ok = await updateActualQuantity(exportDetailIdNum.toString(), scannedNewItemId);
        if (!ok) console.warn("⚠️ updateActualQuantity failed");
        else console.log("✅ Updated actual quantity for new item");
      } else {
        console.log("ℹ️ Thiếu exportRequestDetailId hoặc scannedNewItemId — bỏ qua updateActualQuantity");
      }

      // ✅ 4) CẬP NHẬT scanMappings
      if (scannedNewItemId) {
        const found = scanMappings.find(m => m.inventoryItemId.toUpperCase() === currentOriginalId);
        let nextMappings;
        if (found) {
          // 🔧 BUG FIX: replace theo OLD (currentOriginalId) → NEW (scannedNewItemId)
          nextMappings = scanMappings.map(m =>
            m.inventoryItemId.toUpperCase() === currentOriginalId
              ? { ...m, inventoryItemId: scannedNewItemId }
              : m
          );
          console.log(`🔄 Updating scanMapping: ${currentOriginalId} -> ${scannedNewItemId}`);
        } else if (exportDetailIdNum) {
          // nếu chưa có mapping cũ thì thêm mới để màn khác vẫn nhận diện được
          nextMappings = [
            ...scanMappings,
            { exportRequestDetailId: exportDetailIdNum, inventoryItemId: scannedNewItemId }
          ];
          console.log("➕ Added new scanMapping (no previous mapping)");
        }
        if (nextMappings) {
          dispatch(setScanMappings(nextMappings));
          console.log("✅ ScanMappings updated");
        }
      }

      // ✅ 5) CHỐT: cho chuỗi A→B→C..., set original = mã mới
      setCurrentOriginalId(scannedNewItemId!);

      // Clear UI state
      setShowReasonInput(false);
      setChangeReason("");
      setScannedNewItemId(null);
      setIsProcessing(false);

      setLastScannedProduct({
        id: scannedNewItemId,
        message: "Đã thay đổi item thành công!"
      });

      setTimeout(() => setLastScannedProduct(null), 2000);

      // Check if we need to show completion alert for INTERNAL exports
      if (exportRequest?.type === "INTERNAL" && exportDetailIdNum && scannedNewItemId) {
        try {
          // Fetch fresh export detail data to check current status
          const freshExportDetail = await fetchExportRequestDetailById(exportDetailIdNum);
          console.log(`🔔 INTERNAL manual change - fresh status check: ${freshExportDetail?.status}`);

          let shouldShowAlert = false;
          if ((freshExportDetail as any)?.status === "MATCH" || (freshExportDetail as any)?.status === "EXCEED") {
            shouldShowAlert = true;
            console.log(`🔔 INTERNAL manual change: Status is ${(freshExportDetail as any)?.status} - showing alert`);
          }

          if (shouldShowAlert) {
            // Find items that still need scanning (not COMPLETED status)
            const insufficientItems = savedExportRequestDetails.filter(
              (detail: any) => detail.status !== "COMPLETED" && detail.id !== exportDetailIdNum
            );

            console.log(`🔍 Found ${insufficientItems.length} items still needing completion after manual change`);

            if (insufficientItems.length > 0) {
              const nextItem = insufficientItems[0];

              setTimeout(() => {
                Alert.alert(
                  "Mã hàng đã đủ",
                  `Mã hàng ${freshExportDetail?.itemId || currentOriginalId} đã quét đủ số lượng. Bạn có muốn tiếp tục kiểm đếm mã hàng ${nextItem.itemId}?`,
                  [
                    {
                      text: "Hủy",
                      style: "cancel",
                      onPress: () => {
                        // Navigate back to main export detail screen
                        router.replace(`/export/export-detail/${id}`);
                      }
                    },
                    {
                      text: "Xác nhận",
                      onPress: () => {
                        console.log(`🔄 Manual change alert confirm - continuing scan for next item: ${nextItem.itemId}`);

                        // Update current item to the next item and continue scanning
                        setCurrentOriginalId(nextItem.itemId);
                        setItemIdForNavigation(nextItem.itemId);

                        // Re-enable scanning to continue with next item
                        setTimeout(() => {
                          setScanningEnabled(true);
                        }, 100);
                      }
                    }
                  ]
                );
              }, 1000);
            } else {
              // No more items to scan, go back to export detail
              setTimeout(() => {
                router.replace(`/export/export-detail/${id}`);
              }, 2000);
            }
          }
        } catch (error) {
          console.log("❌ Error checking INTERNAL completion status after manual change:", error);
        }
      }

    } catch (error: any) {
      console.log("❌ QR Manual change error:", error);
      const message = error?.response?.data?.message || error?.message || "Lỗi không xác định";
      setErrorMessage(`Lỗi thay đổi item: ${message}`);

      setShowReasonInput(false);
      setChangeReason("");
      setScannedNewItemId(null);
      setIsProcessing(false);

      setTimeout(() => {
        setScanningEnabled(true);
        setErrorMessage(null);
      }, 3000);
    }
  };


  const handleMeasurementWarningConfirm = async () => {
    setShowMeasurementWarning(false);
    await performManualChange();
  };

  const handleMeasurementWarningCancel = () => {
    setShowMeasurementWarning(false);
    // Clear states and return to camera scan
    setShowReasonInput(false);
    setChangeReason("");
    setScannedNewItemId(null);
    setNewInventoryItemData(null);
    setItemData(null);
    setScanningEnabled(true);
  };

  if (hasPermission === null) return <Text>Đang xin quyền camera...</Text>;
  if (hasPermission === false) return <Text>Không có quyền dùng camera</Text>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button onPress={() => {
          const targetItemCode = itemIdForNavigation || '';
          console.log(`🔙 QR Manual back pressed - targetItemCode: ${targetItemCode}`);
          
          if (targetItemCode) {
            // Find the export request detail for this itemCode
            const targetDetail = savedExportRequestDetails.find(
              (detail: any) => detail.itemId === targetItemCode
            );
            
            if (targetDetail) {
              // Navigate directly to ExportInventory screen
              console.log(`🔙 QR Manual - navigating to ExportInventory for itemCode: ${targetItemCode}`);
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
              console.log(`🔙 QR Manual - no matching detail found, navigating to export-detail: ${id}`);
              router.replace(`/export/export-detail/${id}`);
            }
          } else {
            // No itemCode, go back to export-detail
            console.log(`🔙 QR Manual - no itemCode, navigating to export-detail: ${id}`);
            router.replace(`/export/export-detail/${id}`);
          }
        }}>←</Button>
        <Text style={styles.headerTitle}>Quét QR - Thay đổi thủ công</Text>
      </View>

      {/* Camera */}
      <View style={styles.cameraWrapper}>
        {isFocused && !showReasonInput && !showMeasurementWarning && !measurementModalVisible && scanningEnabled && (
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

        {lastScannedProduct && !showReasonInput && (
          <View style={styles.bottomBox}>
            <View style={styles.productBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>
                  {lastScannedProduct.message || "Mã sản phẩm"}
                </Text>
                <Text style={styles.productTitle}>
                  {lastScannedProduct.itemId || lastScannedProduct.id}
                </Text>
              </View>
            </View>
          </View>
        )}

        {showReasonInput && !showMeasurementWarning && scannedNewItemId && (
          <KeyboardAvoidingView
            style={styles.keyboardAvoidingView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              contentContainerStyle={styles.scrollViewContent}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.reasonInputBox}>
                <Text style={styles.reasonTitle}>Nhập lý do thay đổi sản phẩm:</Text>

                {/* Display measurement values */}
                {newInventoryItemData && itemData && (
                  <View style={styles.measurementInfo}>
                    <Text style={styles.measurementLabel}>Thông tin giá trị xuất:</Text>
                    <Text style={styles.measurementText}>
                      Giá trị cần xuất: {itemData.measurementValue || 0} {itemData.measurementUnit || ''}
                    </Text>
                    <Text style={styles.measurementText}>
                      Giá trị sản phẩm vừa quét: {newInventoryItemData.measurementValue || 0} {itemData.measurementUnit || ''}
                    </Text>
                  </View>
                )}
                
                {/* Show scanned item ID for better visibility */}
                {scannedNewItemId && (
                  <View style={styles.measurementInfo}>
                    <Text style={styles.measurementLabel}>Mã sản phẩm vừa quét:</Text>
                    <Text style={styles.measurementText}>
                      {scannedNewItemId}
                    </Text>
                  </View>
                )}

                <TextInput
                  style={styles.reasonInput}
                  placeholder="Nhập lý do thay đổi..."
                  value={changeReason}
                  onChangeText={setChangeReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  autoFocus={true}
                />
                <View style={styles.reasonButtonRow}>
                  <TouchableOpacity
                    style={[styles.reasonButton, styles.cancelButton]}
                    onPress={() => {
                      setShowReasonInput(false);
                      setChangeReason("");
                      setScannedNewItemId(null);
                      setNewInventoryItemData(null);
                      setItemData(null);
                      setScanningEnabled(true);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.reasonButton,
                      styles.submitButton,
                      (!changeReason.trim() || isProcessing) && styles.disabledButton
                    ]}
                    onPress={handleManualChangeSubmit}
                    disabled={!changeReason.trim() || isProcessing}
                  >
                    <Text style={styles.submitButtonText}>
                      {isProcessing ? "Đang xử lý..." : "Xác nhận"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* Measurement Warning Dialog */}
        {showMeasurementWarning && newInventoryItemData && itemData && (
          <View style={styles.warningOverlay}>
            <View style={styles.warningDialog}>
              <Text style={styles.warningTitle}>Cảnh báo giá trị xuất</Text>
              <Text style={styles.warningText}>
                Giá trị đo lường của sản phẩm này đã vượt quá so với giá trị cần xuất.
              </Text>
              <View style={styles.warningMeasurementInfo}>
                <Text style={styles.warningMeasurementText}>
                  Giá trị đo lường cần xuất: {itemData.measurementValue || 0} {itemData.measurementUnit || ''}
                </Text>
                <Text style={styles.warningMeasurementText}>
                  Giá trị đo lường vừa quét: {newInventoryItemData.measurementValue || 0} {itemData.measurementUnit || ''}
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
});
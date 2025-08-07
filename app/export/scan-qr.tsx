import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Button } from "tamagui";
import { setExportRequestDetail } from "@/redux/exportRequestDetailSlice";
import { useIsFocused } from "@react-navigation/native";
import { Audio } from "expo-av";
import useExportRequestDetail from "@/services/useExportRequestDetailService";
import useInventoryService from "@/services/useInventoryService";

const { width } = Dimensions.get("window");

export default function ScanQrScreen() {
  const { id, returnToModal, itemCode, mode, originalItemId } = useLocalSearchParams<{
    id: string;
    returnToModal?: string;
    itemCode?: string;
    mode?: string;
    originalItemId?: string;
  }>();

  console.log(`📱 QR Scan screen loaded with params:`, { id, returnToModal, itemCode, mode, originalItemId });
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const dispatch = useDispatch();
  const isFocused = useIsFocused();
  const { updateActualQuantity, resetTracking } = useExportRequestDetail();
  const { changeInventoryItemForExportDetail } = useInventoryService();
  const [scanningEnabled, setScanningEnabled] = useState(true);

  // Manual change mode states
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [scannedNewItemId, setScannedNewItemId] = useState<string | null>(null);

  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );

  // ✅ Enhanced debounce mechanism and processing tracking
  const lastScanTimeRef = useRef<number>(0);
  const currentlyProcessingRef = useRef<string | null>(null);
  const lastProcessedQRRef = useRef<string | null>(null); // Track last processed QR
  const SCAN_DEBOUNCE_MS = 2000; // Increased to 2 seconds
  const SUCCESS_COOLDOWN_MS = 3000; // Cooldown after successful scan

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
      audioPlayer?.unloadAsync();
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

  // ✅ Reset scanning state when screen is focused
  useEffect(() => {
    if (isFocused) {
      console.log("🔄 Screen focused, resetting scan state");
      setIsProcessing(false);
      setScanningEnabled(true);
      setErrorMessage(null);
      setLastScannedProduct(null);
      lastScanTimeRef.current = 0;
      currentlyProcessingRef.current = null;
      lastProcessedQRRef.current = null; // Reset last processed QR
    }
  }, [isFocused]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (__DEV__) {
      console.warn = () => {};
      console.error = () => {};
    }

    const currentTime = Date.now();
    const rawInventoryItemId = data.trim();
    const normalizedId = rawInventoryItemId.toLowerCase();

    console.log(`📱 Scanning QR: ${normalizedId}`);
    console.log(`📋 Previously scanned: ${JSON.stringify(scannedIds)}`);
    console.log(
      `🔍 Current state - scanningEnabled: ${scanningEnabled}, isProcessing: ${isProcessing}`
    );
    console.log(`🔍 Currently processing: ${currentlyProcessingRef.current}`);

    // ✅ Check if this exact QR is already being processed
    if (currentlyProcessingRef.current === normalizedId) {
      console.log(`🚫 Already processing this QR: ${normalizedId}`);
      return;
    }

    // ✅ Check if this is the same QR that was just processed successfully
    if (lastProcessedQRRef.current === normalizedId) {
      const timeSinceLastProcess = currentTime - lastScanTimeRef.current;
      if (timeSinceLastProcess < SUCCESS_COOLDOWN_MS) {
        console.log(
          `🚫 Cooldown active for recently processed QR: ${normalizedId} (${timeSinceLastProcess}ms)`
        );
        return;
      }
    }

    // ✅ Enhanced debounce check
    if (currentTime - lastScanTimeRef.current < SCAN_DEBOUNCE_MS) {
      console.log(
        `🚫 Debounce: Too soon since last scan (${
          currentTime - lastScanTimeRef.current
        }ms)`
      );
      return;
    }

    // ✅ Check scanning state
    if (!scanningEnabled || isProcessing) {
      console.log("🚫 Scan disabled or processing, ignoring scan");
      return;
    }

    // ✅ Check duplicate scan
    if (scannedIds.includes(normalizedId)) {
      console.log("🚫 Already scanned this QR:", normalizedId);
      setErrorMessage("Sản phẩm này đã được quét trước đó!");

      // Temporarily disable scanning to prevent spam
      setScanningEnabled(false);
      setTimeout(() => {
        setErrorMessage(null);
        setScanningEnabled(true);
      }, 3000);
      return;
    }

    // ✅ IMMEDIATELY disable scanning and set processing state
    setScanningEnabled(false);
    setIsProcessing(true);
    currentlyProcessingRef.current = normalizedId;
    lastScanTimeRef.current = currentTime;

    console.log(`🔒 Processing started for: ${normalizedId}`);

    // ✅ Clear previous messages
    setErrorMessage(null);
    setLastScannedProduct(null);

    try {
      console.log("📦 Raw QR data:", data);
      console.log("🔍 inventoryItemId:", normalizedId);

      if (mode === 'manual_change' && originalItemId) {
        // Manual change mode: Accept any valid inventory item ID
        console.log(`📝 Manual change mode: Scanned new item ${normalizedId} to replace ${originalItemId}`);

        // For manual change, we don't need to check scan mappings
        // Just validate that it's a valid inventory item format and not the same as original
        if (normalizedId === originalItemId.toLowerCase()) {
          throw new Error("Không thể đổi sang cùng một inventory item!");
        }

        setScannedNewItemId(normalizedId.toUpperCase());
        setShowReasonInput(true);
        await playBeep();
        setLastScannedProduct({
          id: normalizedId,
          itemId: normalizedId,
          message: "Đã quét item mới. Vui lòng nhập lý do thay đổi."
        });
      } else {
        // Normal scan mode: Check scan mappings
        const mapping = scanMappings.find(
          (m) => m.inventoryItemId.toLowerCase() === normalizedId
        );

        console.log("🔍 Mapping found:", mapping);
        if (!mapping) {
          throw new Error("Không tìm thấy sản phẩm tương ứng với mã QR");
        }

        const exportRequestDetailId = mapping.exportRequestDetailId;
        const inventoryItemIdForApi = mapping.inventoryItemId;
        const matched = exportDetails.find((d) => d.id === exportRequestDetailId);

        if (!matched) {
          throw new Error("Không tìm thấy sản phẩm tương ứng với mã QR.");
        }

        if (matched.actualQuantity >= matched.quantity) {
          throw new Error("Sản phẩm đã được quét đủ.");
        }

        console.log("🔄 Call API với:", {
          exportRequestDetailId,
          inventoryItemIdForApi,
        });

        // Normal mode: Update actual quantity
        const success = await updateActualQuantity(
          exportRequestDetailId,
          inventoryItemIdForApi.toUpperCase()
        );

        if (!success) throw new Error("Lỗi cập nhật số lượng");

        // ✅ Success - add to scannedIds and show success message
        setScannedIds((prev) => {
          if (!prev.includes(normalizedId)) {
            const newIds = [...prev, normalizedId];
            console.log(
              `📝 Added to scannedIds after success: ${JSON.stringify(newIds)}`
            );
            return newIds;
          }
          return prev;
        });

        // ✅ Mark this QR as successfully processed
        lastProcessedQRRef.current = normalizedId;

        await playBeep();
        setLastScannedProduct(matched);

        // ✅ Clear success message after longer duration
        setTimeout(() => {
          setLastScannedProduct(null);

          // If returnToModal is true and not manual change, automatically go back to modal after successful scan
          if (returnToModal === 'true' && itemCode && mode !== 'manual_change') {
            console.log(`✅ Auto-returning to modal with itemCode: ${itemCode}`);
            router.replace(`/export/export-detail/${id}?openModal=true&itemCode=${itemCode}`);
          }
        }, 2000); // Reduced to 2 seconds for better UX

        console.log("✅ Scan successful for:", normalizedId);
      }
    } catch (err: any) {
      console.error("❌ Scan error:", err);

      const message =
        err?.response?.data?.message || err?.message || "Lỗi không xác định";
      let displayMessage = "QR không hợp lệ.";

      if (message.toLowerCase().includes("has been tracked")) {
        displayMessage = "Sản phẩm này đã được quét trước đó!";
        // ✅ If API says already tracked, add to scannedIds
        setScannedIds((prev) => {
          if (!prev.includes(normalizedId)) {
            const newIds = [...prev, normalizedId];
            console.log(
              `🔄 API says already tracked, adding to scannedIds: ${JSON.stringify(
                newIds
              )}`
            );
            return newIds;
          }
          return prev;
        });
        lastProcessedQRRef.current = normalizedId; // Mark as processed to prevent re-scanning
      } else if (message.toLowerCase().includes("not stable")) {
        displayMessage = "Sản phẩm không hợp lệ.";
      } else {
        displayMessage = `${message}`;
      }

      setErrorMessage(displayMessage);

      // ✅ Clear error message after 4s
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      // ✅ Clear the currently processing ref
      currentlyProcessingRef.current = null;
      console.log("🔓 Cleared processing ref");

      setIsProcessing(false);

      // ✅ Re-enable scanning after longer delay
      setTimeout(() => {
        setScanningEnabled(true);
        console.log("✅ Scanning re-enabled");
      }, 2500); // Increased delay to 2.5 seconds
    }
  };

  const handleRetry = () => {
    console.log("🔄 Retry button pressed, resetting state");
    setErrorMessage(null);
    setLastScannedProduct(null);
    setIsProcessing(false);
    lastScanTimeRef.current = 0;
    currentlyProcessingRef.current = null;
    lastProcessedQRRef.current = null; // Reset last processed QR

    setTimeout(() => {
      setScanningEnabled(true);
      setCameraKey((prev) => prev + 1);
      console.log("✅ Retry complete, scanning re-enabled");
    }, 300);
  };

  const handleManualChangeSubmit = async () => {
    if (!scannedNewItemId || !originalItemId || !changeReason.trim()) {
      setErrorMessage("Vui lòng nhập lý do thay đổi");
      return;
    }

    // Prevent multiple submissions
    if (isProcessing) {
      console.log("🚫 Already processing manual change, ignoring duplicate submission");
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      console.log(`🔄 QR Manual change: ${originalItemId} -> ${scannedNewItemId}, reason: ${changeReason}`);

      // Check if original item was scanned and reset tracking if needed
      const originalItemMapping = scanMappings.find(
        mapping => mapping.inventoryItemId === originalItemId.toLowerCase().trim()
      );

      if (originalItemMapping) {
        console.log(`🔄 Resetting tracking for old item: ${originalItemId}`);

        const resetSuccess = await resetTracking(
          originalItemMapping.exportRequestDetailId.toString(),
          originalItemId
        );

        if (!resetSuccess) {
          throw new Error("Không thể reset tracking cho item cũ");
        }
        console.log(`✅ Reset tracking successful for: ${originalItemId}`);
      } else {
        console.log(`ℹ️ Original item ${originalItemId} not tracked, proceeding with manual change`);
      }

      // Perform manual change
      const success = await changeInventoryItemForExportDetail(
        originalItemId,
        scannedNewItemId,
        changeReason
      );

      if (!success) {
        throw new Error("Manual change API failed");
      }

      console.log("✅ QR Manual change successful");

      // Clear states
      setShowReasonInput(false);
      setChangeReason("");
      setScannedNewItemId(null);
      setIsProcessing(false);

      // Show success with callback to return to modal (like manual selection)
      setLastScannedProduct({
        id: scannedNewItemId,
        message: "Đã thay đổi item thành công!"
      });

      // Return to modal after success with modal opening
      setTimeout(() => {
        setLastScannedProduct(null);
        if (returnToModal === 'true' && itemCode) {
          console.log(`✅ QR Manual change complete, returning to modal with itemCode: ${itemCode}`);
          router.replace(`/export/export-detail/${id}?openModal=true&itemCode=${itemCode}`);
        }
      }, 2000);

    } catch (error: any) {
      console.error("❌ QR Manual change error:", error);
      const message = error?.response?.data?.message || error?.message || "Lỗi không xác định";
      setErrorMessage(`Lỗi thay đổi item: ${message}`);

      // Clear states on error
      setShowReasonInput(false);
      setChangeReason("");
      setScannedNewItemId(null);
      setIsProcessing(false);

      // Re-enable scanning after error
      setTimeout(() => {
        setScanningEnabled(true);
        setErrorMessage(null);
      }, 3000);
    }
  };

  const handleContinue = () => {
    setIsPaused(false);
    setTimeout(() => {
      setCameraKey((prev) => prev + 1);
    }, 200);
  };

  if (hasPermission === null) return <Text>Đang xin quyền camera...</Text>;
  if (hasPermission === false) return <Text>Không có quyền dùng camera</Text>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button onPress={() => {
          if (returnToModal === 'true' && itemCode && mode !== 'manual_change') {
            console.log(`🔙 Back pressed - returning to modal with itemCode: ${itemCode}`);
            // Return to export detail with modal open (only for normal modal scan)
            router.replace(`/export/export-detail/${id}?openModal=true&itemCode=${itemCode}`);
          } else {
            console.log(`🔙 Back pressed - normal navigation`);
            router.back();
          }
        }}>←</Button>
        <Text style={styles.headerTitle}>Quét QR</Text>
      </View>

      {/* Camera */}
      <View style={styles.cameraWrapper}>
        {isFocused && (
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

        {showReasonInput && (
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
                <Text style={styles.reasonTitle}>Nhập lý do thay đổi item:</Text>
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
});

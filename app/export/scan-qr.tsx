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
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Button } from "tamagui";
import { useIsFocused } from "@react-navigation/native";
import { Audio } from "expo-av";
import useExportRequestDetail from "@/services/useExportRequestDetailService";


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
  const { updateActualQuantity } = useExportRequestDetail();
  const [scanningEnabled, setScanningEnabled] = useState(true);

  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );
  const [scannedItemCode, setScannedItemCode] = useState<string>("");

  // Enhanced debounce mechanism and processing tracking
  const lastScanTimeRef = useRef<number>(0);
  const currentlyProcessingRef = useRef<string | null>(null);
  const lastProcessedQRRef = useRef<string | null>(null);
  const SCAN_DEBOUNCE_MS = 2000;
  const SUCCESS_COOLDOWN_MS = 3000;
  const [itemIdForNavigation, setItemIdForNavigation] = useState<string>("");

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
    }
  }, [isFocused]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (__DEV__) {
      console.warn = () => { };
      console.log = () => { };
    }

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
    if (!scanningEnabled || isProcessing) {
      console.log("🚫 Scan disabled or processing, ignoring scan");
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

      // Normal scan mode: Check scan mappings
      console.log("🔍 All scanMappings:", scanMappings.map(m => m.inventoryItemId.toUpperCase()));
      console.log("🔍 Looking for inventoryItemId:", inventoryItemId);

      const mapping = scanMappings.find(
        (m) => m.inventoryItemId.toUpperCase() === inventoryItemId.toUpperCase()
      );

      console.log("🔍 Mapping found:", mapping);
      if (!mapping) {
        throw new Error("Không tìm thấy sản phẩm tương ứng với mã QR");
      }

      const exportRequestDetailId = mapping.exportRequestDetailId;
      const inventoryItemIdForApi = mapping.inventoryItemId.toUpperCase();
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

      // Success - add to scannedIds and show success message
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
      setLastScannedProduct(matched);

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
        // If API says already tracked, add to scannedIds
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


  if (hasPermission === null) return <Text>Đang xin quyền camera...</Text>;
  if (hasPermission === false) return <Text>Không có quyền dùng camera</Text>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button onPress={() => {
          console.log(`🔙 Back pressed - navigating with openModal params for itemCode: ${scannedItemCode}`);
          router.replace({
            pathname: '/export/export-detail/[id]',
            params: {
              id: String(id),
              openModal: 'true',
              itemCode: String(itemIdForNavigation || scannedItemCode || '')
            },
          });
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
});

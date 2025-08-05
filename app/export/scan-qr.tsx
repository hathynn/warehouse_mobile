import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  Dimensions,
} from "react-native";
import { Camera, CameraView } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Button } from "tamagui";
import { setExportRequestDetail } from "@/redux/exportRequestDetailSlice";
import { useIsFocused } from "@react-navigation/native";
import { Audio } from "expo-audio";
import useExportRequestDetail from "@/services/useExportRequestDetailService";

const { width } = Dimensions.get("window");

export default function ScanQrScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const dispatch = useDispatch();
  const isFocused = useIsFocused();
  const { updateActualQuantity } = useExportRequestDetail();
  const [scanningEnabled, setScanningEnabled] = useState(true);

  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );

  // ✅ Add debounce mechanism and processing tracking
  const lastScanTimeRef = useRef<number>(0);
  const currentlyProcessingRef = useRef<string | null>(null);
  const SCAN_DEBOUNCE_MS = 1000; // 1 second debounce

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
      audioPlayer?.unloadAsync(); // cleanup nếu screen bị huỷ
    };
  }, []);

  const playBeep = async () => {
    try {
      if (audioPlayer) {
        await audioPlayer.replayAsync(); // phát lại từ đầu
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
      currentlyProcessingRef.current = null; // Clear processing ref
      // Note: We don't reset scannedIds here to maintain scan history during session
    }
  }, [isFocused]);

  const [canScan, setCanScan] = useState(true);

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
  console.log(`🔍 Current state - scanningEnabled: ${scanningEnabled}, isProcessing: ${isProcessing}`);
  console.log(`🔍 Currently processing: ${currentlyProcessingRef.current}`);

  // ✅ Check if this exact QR is already being processed
  if (currentlyProcessingRef.current === normalizedId) {
    console.log(`🚫 Already processing this QR: ${normalizedId}`);
    return;
  }

  // ✅ Debounce check - prevent rapid fire scanning
  if (currentTime - lastScanTimeRef.current < SCAN_DEBOUNCE_MS) {
    console.log(`🚫 Debounce: Too soon since last scan (${currentTime - lastScanTimeRef.current}ms)`);
    return;
  }

  // ✅ Chặt chẽ hơn với việc check scanning state
  if (!scanningEnabled || isProcessing) {
    console.log("🚫 Scan disabled or processing, ignoring scan");
    return;
  }

  // ✅ Check duplicate scan ngay lập tức
  if (scannedIds.includes(normalizedId)) {
    console.log("🚫 Already scanned this QR:", normalizedId);
    setErrorMessage("Sản phẩm này đã được quét trước đó!");
    setTimeout(() => setErrorMessage(null), 3000);
    return;
  }

  // ✅ Mark this QR as currently being processed
  currentlyProcessingRef.current = normalizedId;
  console.log(`🔒 Marking as processing: ${normalizedId}`);

  // ✅ Update last scan time
  lastScanTimeRef.current = currentTime;

  // ✅ Disable scanning và processing ngay lập tức - NGAY TẠI ĐÂY
  console.log("🔒 Disabling scan and setting processing");
  setScanningEnabled(false);
  setIsProcessing(true);

  // ✅ Clear previous messages
  setErrorMessage(null);
  setLastScannedProduct(null);

  try {
    console.log("📦 Raw QR data:", data);
    console.log("🔍 inventoryItemId:", normalizedId);

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

    const success = await updateActualQuantity(
      exportRequestDetailId,
      inventoryItemIdForApi.toUpperCase()
    );

    if (!success) throw new Error("Lỗi cập nhật số lượng");

    // ✅ Success - add to scannedIds and show success message
    setScannedIds(prev => {
      if (!prev.includes(normalizedId)) {
        const newIds = [...prev, normalizedId];
        console.log(`📝 Added to scannedIds after success: ${JSON.stringify(newIds)}`);
        return newIds;
      }
      return prev;
    });

    await playBeep();
    setLastScannedProduct(matched);

    // ✅ Clear success message sau 4s
    setTimeout(() => setLastScannedProduct(null), 4000);

    console.log("✅ Scan successful for:", normalizedId);

  } catch (err: any) {
    console.error("❌ Scan error:", err);

    const message = err?.response?.data?.message || err?.message || "Lỗi không xác định";
    let displayMessage = "QR không hợp lệ.";

    if (message.toLowerCase().includes("has been tracked")) {
      displayMessage = "Sản phẩm này đã được quét trước đó!";
      // ✅ Nếu API báo đã tracked, add to scannedIds
      setScannedIds(prev => {
        if (!prev.includes(normalizedId)) {
          const newIds = [...prev, normalizedId];
          console.log(`🔄 API says already tracked, adding to scannedIds: ${JSON.stringify(newIds)}`);
          return newIds;
        }
        return prev;
      });
    } else if (message.toLowerCase().includes("not stable")) {
      displayMessage = "Sản phẩm không hợp lệ.";
    } else {
      displayMessage = `${message}`;
    }

    setErrorMessage(displayMessage);

    // ✅ Clear error message sau 4s
    setTimeout(() => setErrorMessage(null), 4000);

  } finally {
    // ✅ Clear the currently processing ref
    currentlyProcessingRef.current = null;
    console.log("🔓 Cleared processing ref");

    setIsProcessing(false);

    // ✅ Re-enable scanning sau 1.5s (reduced delay)
    setTimeout(() => {
      setScanningEnabled(true);
      console.log("✅ Scanning re-enabled");
    }, 1500);
  }
};
  // const handleBarCodeScanned = async ({ data }: { data: string }) => {
  //   if (__DEV__) {
  //     console.warn = () => {};
  //     console.error = () => {};
  //   }
  //   if (isProcessing || !canScan) return;
  // setScanningEnabled(false); // temporarily disable further scans

  //   setCanScan(false);
  //   setTimeout(() => setCanScan(true), 2000);
  //   setIsProcessing(true);

  //   try {
  //     // Parse: "exportRequestDetailId=xxx;inventoryItemId=yyy"
  //     const keyValuePairs = data.split(";");
  //     const parsed: Record<string, string> = {};

  //     keyValuePairs.forEach((pair) => {
  //       const [key, value] = pair.split("=");
  //       if (key && value) {
  //         parsed[key.trim()] = value.trim();
  //       }
  //     });

  //     const exportRequestDetailId = parsed.exportRequestDetailId;
  //     const inventoryItemId = parsed.inventoryItemId;

  //     if (!exportRequestDetailId || !inventoryItemId) {
  //       throw new Error("QR không hợp lệ: Thiếu dữ liệu.");
  //     }

  //     const matched = exportDetails.find(
  //       (detail) => detail.id.toString() === exportRequestDetailId
  //     );

  //     if (!matched) {
  //       throw new Error(
  //         "Không tìm thấy exportRequestDetailId trong danh sách."
  //       );
  //     }

  //     if (matched.actualQuantity >= matched.quantity) {
  //       throw new Error("Sản phẩm này đã được quét đủ số lượng.");
  //     }

  //     const success = await updateActualQuantity(
  //       exportRequestDetailId,
  //       inventoryItemId
  //     );
  //     if (!success) {
  //       throw new Error("Lỗi khi cập nhật số liệu thực tế của sản phẩm.");
  //     }

  //     playBeep();
  //     setLastScannedProduct(matched);
  //     setIsProcessing(false);
  //     setErrorMessage(null);
  //     setTimeout(() => setLastScannedProduct(null), 2000);
  //   } catch (err: any) {
  //     const message = err?.response?.data?.message || err?.message || "Lỗi không xác định";

  //     let displayMessage = "QR không hợp lệ."

  //     if (message.toLowerCase().includes("has been tracked")) {
  //       displayMessage = "Sản phẩm này đã được quét trước đó!";
  //     } else if (message.toLowerCase().includes("not stable")) {
  //       displayMessage = "Sản phẩm không hợp lệ.";
  //     } else {
  //       displayMessage = `${message}`;
  //     }

  //     setErrorMessage(displayMessage);
  //   }
  // };

  const handleRetry = () => {
    console.log("🔄 Retry button pressed, resetting state");
    setErrorMessage(null);
    setLastScannedProduct(null);
    setIsProcessing(false);
    lastScanTimeRef.current = 0; // Reset debounce timer
    currentlyProcessingRef.current = null; // Clear processing ref
    setTimeout(() => {
      setCanScan(true);
      setScanningEnabled(true);
      setCameraKey((prev) => prev + 1); // ép remount camera để ổn định
      console.log("✅ Retry complete, scanning re-enabled");
    }, 300); // delay nhẹ giúp camera không trắng
  };

  const handleContinue = () => {
    setIsPaused(false);
    setTimeout(() => {
      setCameraKey((prev) => prev + 1); // ép CameraView render lại
    }, 200);
  };

  if (hasPermission === null) return <Text>Đang xin quyền camera...</Text>;
  if (hasPermission === false) return <Text>Không có quyền dùng camera</Text>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button onPress={() => router.back()}>←</Button>
        <Text style={styles.headerTitle}>Quét QR</Text>
      </View>

      {/* Camera */}
      <View style={styles.cameraWrapper}>
        {isFocused && (
          <CameraView
            key={cameraKey}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
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
                <Text style={styles.productName}>Mã sản phẩm</Text>
                <Text style={styles.productTitle}>
                  {lastScannedProduct.itemId}
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
});

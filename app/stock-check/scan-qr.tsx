import React, { useState, useEffect, useRef } from "react";
import { Text, View, StyleSheet, SafeAreaView } from "react-native";
import { Camera, CameraView } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { Button } from "tamagui";
import { useIsFocused } from "@react-navigation/native";
import { Audio } from "expo-av";
import useStockCheckDetail from "@/services/useStockCheckDetailService";

// const { width } = Dimensions.get("window");

export default function StockCheckScanQrScreen() {
  const { stockCheckId, stockCheckDetailId, returnToModal, itemCode } =
    useLocalSearchParams<{
      stockCheckId: string;
      stockCheckDetailId: string;
      returnToModal?: string;
      itemCode?: string;
    }>();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // const [isPaused, setIsPaused] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const isFocused = useIsFocused();
  const { trackInventoryItem } = useStockCheckDetail();
  const [scanningEnabled, setScanningEnabled] = useState(true);

  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );
  const [audioPlayer, setAudioPlayer] = useState<any>(null);

  // Refs for preventing duplicate processing
  const currentlyProcessingRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastProcessedQRRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  useEffect(() => {
    const loadBeep = async () => {
      try {
        const player = await Audio.Sound.createAsync(
          require("@/assets/beep-07a.mp3")
        );
        setAudioPlayer(player.sound);
      } catch (error) {
        console.warn("🔇 Không thể tải âm thanh:", error);
        setAudioPlayer(null);
      }
    };

    loadBeep();

    return () => {
      if (audioPlayer) {
        audioPlayer.unloadAsync().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (isFocused) {
      setScannedIds([]);
      setErrorMessage(null);
      setLastScannedProduct(null);
      setIsProcessing(false);
      setScanningEnabled(true);
      currentlyProcessingRef.current = null;
      lastProcessedQRRef.current = null;
      setCameraKey((prev) => prev + 1);
    }
  }, [isFocused]);

  const playBeep = async () => {
    try {
      if (audioPlayer) {
        await audioPlayer.replayAsync();
      }
    } catch (err) {
      console.warn("🔇 Không thể phát âm:", err);
    }
  };

  const handleGoBack = () => {
    if (returnToModal === "true" && itemCode) {
      console.log(
        `🔙 Back pressed - returning to modal with itemCode: ${itemCode}`
      );
      // Thêm delay nhỏ để đảm bảo navigation hoàn tất
      setTimeout(() => {
        router.replace(
          `/stock-check/detail/${stockCheckId}?openModal=true&itemCode=${itemCode}`
        );
      }, 50);
    } else {
      console.log(`🔙 Back pressed - normal navigation`);
      router.back();
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (__DEV__) {
      console.warn = () => {};
      console.error = () => {};
    }

    const currentTime = Date.now();
    const rawInventoryItemId = data.trim();
    const normalizedId = rawInventoryItemId.toLowerCase();

    console.log(`📱 Stock Check Scanning QR: ${normalizedId}`);
    console.log(`📋 Previously scanned: ${JSON.stringify(scannedIds)}`);
    console.log(
      `🔍 Current state - scanningEnabled: ${scanningEnabled}, isProcessing: ${isProcessing}`
    );
    console.log(`🔍 Currently processing: ${currentlyProcessingRef.current}`);

    // Check if this exact QR is already being processed
    if (currentlyProcessingRef.current === normalizedId) {
      console.log(`🚫 Already processing this QR: ${normalizedId}`);
      return;
    }

    // Prevent rapid successive scans
    if (currentTime - lastScanTimeRef.current < 1000) {
      console.log("🚫 Too fast, ignoring scan");
      return;
    }

    // Check if scanning is disabled or processing
    if (!scanningEnabled || isProcessing) {
      console.log("🚫 Scanning disabled or processing");
      return;
    }

    // Check duplicate scan
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

    // IMMEDIATELY disable scanning and set processing state
    setScanningEnabled(false);
    setIsProcessing(true);
    currentlyProcessingRef.current = normalizedId;
    lastScanTimeRef.current = currentTime;

    console.log(`🔒 Processing started for: ${normalizedId}`);

    // Clear previous messages
    setErrorMessage(null);
    setLastScannedProduct(null);

    try {
      console.log("📦 Raw QR data:", data);
      console.log("🔍 inventoryItemId:", normalizedId);

      if (!stockCheckDetailId) {
        throw new Error("Không tìm thấy thông tin stock check detail");
      }

      console.log("🔄 Call API với:", {
        stockCheckDetailId: parseInt(stockCheckDetailId),
        inventoryItemId: rawInventoryItemId.toUpperCase(),
      });

      // Find the matching stock check detail for this inventory item
      // This allows scanning any item in the request, not just the specific detail
      const success = await trackInventoryItem({
        stockCheckDetailId: parseInt(stockCheckDetailId),
        inventoryItemId: rawInventoryItemId.toUpperCase(),
      });

      if (!success) throw new Error("Lỗi cập nhật tracking");

      // Success - add to scannedIds and show success message
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

      // Mark this QR as successfully processed
      lastProcessedQRRef.current = normalizedId;

      await playBeep();
      setLastScannedProduct({
        id: rawInventoryItemId,
        message: "Đã kiểm kho thành công!",
      });

      // Clear success message after longer duration
      setTimeout(() => setLastScannedProduct(null), 4000);

      console.log("✅ Stock check scan successful for:", normalizedId);
    } catch (err: any) {
      console.error("❌ Stock check scan error:", err);

      const message =
        err?.response?.data?.message || err?.message || "Lỗi không xác định";
      let displayMessage = "QR không hợp lệ.";

      if (message.includes("không tìm thấy")) {
        displayMessage = "Không tìm thấy sản phẩm tương ứng với mã QR.";
      } else if (message.includes("đã được")) {
        displayMessage = "Sản phẩm này đã được kiểm kho.";
      } else if (message.includes("không thuộc")) {
        displayMessage = "Sản phẩm không thuộc phiếu kiểm kho này.";
      }

      setErrorMessage(displayMessage);

      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setErrorMessage(null);
        setScanningEnabled(true);
      }, 5000);
    } finally {
      // Always reset processing state
      setIsProcessing(false);
      currentlyProcessingRef.current = null;

      // Re-enable scanning after a short delay if no error
      if (!errorMessage) {
        setTimeout(() => {
          setScanningEnabled(true);
        }, 1500);
      }
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setLastScannedProduct(null);
    setScanningEnabled(true);
    setIsProcessing(false);
    currentlyProcessingRef.current = null;
  };

  // const handleGoBack = () => {
  //   router.back();
  // };

  if (hasPermission === null) {
    return <Text>Đang yêu cầu quyền truy cập camera...</Text>;
  }
  if (hasPermission === false) {
    return <Text>Không có quyền truy cập camera</Text>;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Button onPress={handleGoBack}>←</Button>
        <Text style={styles.headerTitle}>Quét QR Kiểm Kho</Text>
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
                <Text style={styles.productName}>Kiểm kho thành công</Text>
                <Text style={styles.productTitle}>{lastScannedProduct.id}</Text>
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
});

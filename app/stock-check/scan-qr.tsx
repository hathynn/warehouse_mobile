import React, { useState, useEffect, useRef } from "react";
import { Text, View, StyleSheet, SafeAreaView, Modal, TextInput, Alert, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  const { trackInventoryItem, getStockCheckDetailById } = useStockCheckDetail();
  const [scanningEnabled, setScanningEnabled] = useState(true);

  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [measurementValue, setMeasurementValue] = useState("");
  const [currentInventoryItemId, setCurrentInventoryItemId] = useState("");
  const [audioPlayer, setAudioPlayer] = useState<any>(null);
  const [needsLiquidation, setNeedsLiquidation] = useState(false);

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

    // Check if scanning is disabled, processing, or modal is open
    if (!scanningEnabled || isProcessing || showMeasurementModal) {
      console.log("🚫 Scanning disabled, processing, or modal is open");
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

      // Check if this inventory item is already counted
      console.log("🔍 Checking if item is already counted...");
      const stockCheckDetail = await getStockCheckDetailById(parseInt(stockCheckDetailId));
      
      if (stockCheckDetail?.checkedInventoryItemIds?.some(item => item.inventoryItemId === rawInventoryItemId.toUpperCase())) {
        throw new Error("Sản phẩm này đã được kiểm đếm");
      }

      console.log("🔄 Call API với:", {
        stockCheckDetailId: parseInt(stockCheckDetailId),
        inventoryItemId: rawInventoryItemId.toUpperCase(),
      });

      // Show modal for entering measurement value
      setCurrentInventoryItemId(rawInventoryItemId.toUpperCase());
      setShowMeasurementModal(true);
      setMeasurementValue("");
      setNeedsLiquidation(false);
      
      // Disable scanning while modal is open
      setScanningEnabled(false);
      
      // Add to scannedIds to prevent duplicate scans
      setScannedIds((prev) => {
        if (!prev.includes(normalizedId)) {
          const newIds = [...prev, normalizedId];
          console.log(
            `📝 Added to scannedIds: ${JSON.stringify(newIds)}`
          );
          return newIds;
        }
        return prev;
      });

      await playBeep();
      console.log("✅ QR scan successful, showing measurement modal:", normalizedId);
    } catch (err: any) {
      console.log("❌ Stock check scan error:", err);

      const message =
        err?.response?.data?.message || err?.message || "Lỗi không xác định";
      let displayMessage = "QR không hợp lệ.";

      if (message.includes("Inventory item ID not found in stock check request detail")) {
        displayMessage = "Sản phẩm không nằm trong danh sách kiểm kho";
      } else if (message.includes("không tìm thấy")) {
        displayMessage = "Không tìm thấy sản phẩm tương ứng với mã QR.";
      } else if (message.includes("đã được kiểm đếm")) {
        displayMessage = "Sản phẩm này đã được kiểm đếm";
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

      // Don't re-enable scanning if modal is showing or there's an error
      if (!errorMessage && !showMeasurementModal) {
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

  const handleConfirmMeasurement = async () => {
    if (!measurementValue.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập giá trị đo lường");
      return;
    }

    const numericValue = parseFloat(measurementValue);
    if (isNaN(numericValue)) {
      Alert.alert("Lỗi", "Giá trị đo lường phải là số");
      return;
    }

    try {
      setIsProcessing(true);
      console.log("🚀 Calling trackInventoryItem with measurement...");
      const success = await trackInventoryItem({
        stockCheckDetailId: parseInt(stockCheckDetailId),
        inventoryItemId: currentInventoryItemId,
        actualMeasurementValue: numericValue,
        status: needsLiquidation ? "NEED_LIQUID" : "AVAILABLE",
      });

      console.log("📄 trackInventoryItem response:", JSON.stringify(success, null, 2));
      
      if (!success) throw new Error("Lỗi cập nhật tracking");

      setLastScannedProduct({
        id: currentInventoryItemId,
        message: "Đã kiểm kho thành công!",
      });

      setShowMeasurementModal(false);
      
      // Re-enable scanning after modal closes
      setScanningEnabled(true);
      
      // Clear success message after longer duration
      setTimeout(() => setLastScannedProduct(null), 4000);

      console.log("✅ Stock check with measurement successful for:", currentInventoryItemId);
    } catch (err: any) {
      console.log("❌ Stock check measurement error:", err);

      const message =
        err?.response?.data?.message || err?.message || "Lỗi không xác định";
      let displayMessage = "QR không hợp lệ.";

      if (message.includes("Inventory item ID not found in stock check request detail")) {
        displayMessage = "Sản phẩm không nằm trong danh sách kiểm kho";
      } else if (message.includes("không tìm thấy")) {
        displayMessage = "Không tìm thấy sản phẩm tương ứng với mã QR.";
      } else if (message.includes("đã được kiểm đếm")) {
        displayMessage = "Sản phẩm này đã được kiểm đếm";
      } else if (message.includes("đã được")) {
        displayMessage = "Sản phẩm này đã được kiểm kho.";
      } else if (message.includes("không thuộc")) {
        displayMessage = "Sản phẩm không thuộc phiếu kiểm kho này.";
      }

      setErrorMessage(displayMessage);
      setShowMeasurementModal(false);
      
      // Re-enable scanning when modal closes due to error
      setScanningEnabled(true);

      // Auto-clear error after 5 seconds
      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsProcessing(false);
      currentlyProcessingRef.current = null;

      // Don't re-enable scanning if modal is showing or there's an error
      if (!errorMessage && !showMeasurementModal) {
        setTimeout(() => {
          setScanningEnabled(true);
        }, 1500);
      }
    }
  };

  const handleCancelMeasurement = () => {
    setShowMeasurementModal(false);
    setMeasurementValue("");
    setCurrentInventoryItemId("");
    setNeedsLiquidation(false);
    
    // Remove from scannedIds since we cancelled
    const normalizedId = currentInventoryItemId.toLowerCase();
    setScannedIds((prev) => prev.filter(id => id !== normalizedId));
    
    // Re-enable scanning immediately when modal is cancelled
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
              scanningEnabled && !showMeasurementModal ? handleBarCodeScanned : undefined
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

      {/* Measurement Modal */}
      <Modal
        visible={showMeasurementModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelMeasurement}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nhập giá trị đo lường</Text>
            <Text style={styles.modalSubtitle}>ID: {currentInventoryItemId}</Text>
            
            <TextInput
              style={styles.measurementInput}
              value={measurementValue}
              onChangeText={setMeasurementValue}
              placeholder="Nhập giá trị đo lường"
              keyboardType="numeric"
              autoFocus={true}
            />
            
            <TouchableOpacity 
              style={styles.checkboxContainer}
              onPress={() => setNeedsLiquidation(!needsLiquidation)}
            >
              <View style={[styles.checkbox, needsLiquidation && styles.checkboxChecked]}>
                {needsLiquidation && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text style={styles.checkboxLabel}>Hàng cần thanh lý</Text>
            </TouchableOpacity>
            
            <View style={styles.modalButtons}>
              <Button 
                onPress={handleCancelMeasurement}
                style={styles.cancelButton}
              >
                Hủy
              </Button>
              <Button 
                onPress={handleConfirmMeasurement}
                style={styles.confirmButton}
                disabled={isProcessing}
              >
                {isProcessing ? "Đang xử lý..." : "Xác nhận"}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "white",
    margin: 20,
    padding: 24,
    borderRadius: 12,
    width: "90%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
  },
  measurementInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    color: "#333",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#1677ff",
    color: "white",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 4,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  checkboxChecked: {
    backgroundColor: "#1677ff",
    borderColor: "#1677ff",
  },
  checkboxLabel: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
});

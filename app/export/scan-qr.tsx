import React, { useState, useEffect } from "react";
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
import { Audio } from "expo-av";

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

  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );

  const playBeep = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/beep-07a.mp3")
      );
      await sound.playAsync();
    } catch (error) {
      console.warn("Không thể phát âm thanh:", error);
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

  const [canScan, setCanScan] = useState(true);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
  if (isProcessing || !canScan) return;

  setCanScan(false);
  setTimeout(() => setCanScan(true), 2000);
  setIsProcessing(true);

  try {
    // Parse dạng "itemId=xxx;inventoryItemId=yyy"
    const keyValuePairs = data.split(";");
    const parsed: Record<string, string> = {};

    keyValuePairs.forEach((pair) => {
      const [key, value] = pair.split("=");
      if (key && value) {
        parsed[key.trim()] = value.trim();
      }
    });

    const scannedItemId = parsed.itemId;
    const scannedInventoryItemId = parsed.inventoryItemId;

    if (!scannedItemId || !scannedInventoryItemId) {
      throw new Error("❌ Mã QR không hợp lệ.");
    }

    const matched = exportDetails.find(
      (detail) =>
        detail.itemId === scannedItemId &&
        Array.isArray(detail.inventoryItemIds) &&
        detail.inventoryItemIds.includes(scannedInventoryItemId)
    );

    if (!matched) {
      throw new Error("❌ Không tìm thấy sản phẩm phù hợp với QR code.");
    }

    if (matched.actualQuantity >= matched.quantity) {
      throw new Error("⚠️ Sản phẩm này đã được quét đủ số lượng.");
    }

    const updatedDetails = exportDetails.map((detail) =>
      detail === matched
        ? { ...detail, actualQuantity: detail.actualQuantity + 1 }
        : detail
    );

    dispatch(setExportRequestDetail(updatedDetails));
    playBeep();
    setLastScannedProduct(matched);
    setErrorMessage(null);
    setTimeout(() => setLastScannedProduct(null), 2000);
  } catch (err: any) {
    console.warn("Scan error:", err.message);
    setErrorMessage(err.message || "❌ QR không hợp lệ.");
  } finally {
    setIsProcessing(false);
  }
};


  const handleRetry = () => {
    setErrorMessage(null);
    setTimeout(() => {
      setCameraKey((prev) => prev + 1);
    }, 200); // Cho chắc ăn camera được remount
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
                  <Text style={styles.productName}>
              Mã sản phẩm
                </Text>
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
    color:"white",
    fontWeight:500
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

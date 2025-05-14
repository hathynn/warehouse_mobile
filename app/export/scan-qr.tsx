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

  const exportDetails = useSelector(
    (state: RootState) => state.exportRequestDetail.details
  );

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === "granted");
    })();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (isProcessing || isPaused) return;

    setIsProcessing(true);

    try {
      const keyValuePairs = data.split(";");
      const qrData: Record<string, string> = {};

      keyValuePairs.forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key && value) {
          qrData[key.trim()] = value.trim();
        }
      });

      const scannedId = qrData.id;
      const itemId = qrData.itemId;

      if (!scannedId || !itemId) {
        setErrorMessage("❌ QR Code không hợp lệ.");
        setIsProcessing(false);
        return;
      }

      const found = exportDetails.find(
        (d) => d.id?.toString() === scannedId && d.itemId?.toString() === itemId
      );

      if (!found) {
        setErrorMessage("❌ Không tìm thấy sản phẩm khớp với QR code.");
        setIsProcessing(false);
        return;
      }

      if (found.actualQuantity >= found.quantity) {
        setErrorMessage("⚠️ Sản phẩm này đã được quét đủ số lượng.");
        setIsProcessing(false);
        return;
      }

      const updatedDetails = exportDetails.map((d) =>
        d.id?.toString() === scannedId && d.itemId?.toString() === itemId
          ? { ...d, actualQuantity: d.actualQuantity + 1 }
          : d
      );

      dispatch(setExportRequestDetail(updatedDetails));
      setScannedIds((prev) => [...prev, scannedId]);

      // Tạm dừng để chờ bấm nút "Tiếp tục"
      setIsPaused(true);
      setIsProcessing(false);
      setErrorMessage(null);
    } catch (e) {
      setErrorMessage("❌ QR Code không hợp lệ.");
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
        {!isPaused && !errorMessage && (
          <CameraView
            key={cameraKey}
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={handleBarCodeScanned}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        {/* Hiển thị lỗi */}
        {errorMessage && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <Button onPress={handleRetry} style={styles.retryButton}>
              Thử lại
            </Button>
          </View>
        )}

        {/* Hiển thị sau khi quét thành công */}
        {isPaused && !errorMessage && (
          <View style={styles.pauseBox}>
            <Text style={styles.pauseText}>✅ Đã quét thành công!</Text>
            <Button onPress={handleContinue} style={styles.retryButton}>
              Tiếp tục quét
            </Button>
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
  },
});

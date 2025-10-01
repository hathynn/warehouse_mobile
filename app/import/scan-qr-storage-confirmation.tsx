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
import { Button } from "tamagui";
import { Audio } from "expo-av";
import { useIsFocused } from "@react-navigation/native";

export default function ScanQrStorageConfirmationScreen() {
  const [audioPlayer, setAudioPlayer] = useState<any>(null);
  const { inventoryItemId, importOrderId, importType, itemId, productName } = useLocalSearchParams<{
    inventoryItemId: string;
    importOrderId: string;
    importType?: string;
    itemId?: string;
    productName?: string;
  }>();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastScannedData, setLastScannedData] = useState<string | null>(null);
  const [canScan, setCanScan] = useState(true);
  const isFocused = useIsFocused();
  const scanInProgress = useRef(false);
  const alertShowing = useRef(false);

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
      }
    };

    loadBeep();

    return () => {
      audioPlayer?.unloadAsync();
    };
  }, []);

  useEffect(() => {
    if (isFocused) {
      scanInProgress.current = false;
      alertShowing.current = false;
      setCanScan(true);
    }
  }, [isFocused]);

  const playBeep = async () => {
    try {
      if (audioPlayer) {
        await audioPlayer.replayAsync();
      }
    } catch (err) {
      console.warn("Không thể phát âm thanh:", err);
    }
  };

  const showAlert = (title: string, message: string, onOk?: () => void) => {
    if (alertShowing.current) return;

    alertShowing.current = true;
    setCanScan(false);

    Alert.alert(
      title,
      message,
      [
        {
          text: "OK",
          onPress: () => {
            alertShowing.current = false;
            scanInProgress.current = false;
            if (onOk) {
              onOk();
            } else {
              setTimeout(() => {
                setCanScan(true);
              }, 1000);
            }
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    console.log("📱 Storage confirmation QR scanned:", data);

    if (!isFocused || !canScan || scanInProgress.current || alertShowing.current) {
      console.log("⏸️ Scan blocked");
      return;
    }

    scanInProgress.current = true;
    setCanScan(false);

    try {
      const cleanData = data.trim();
      let isMatch = false;
      let scannedItemId = "";

      if (importType === "ORDER") {
        // ORDER type: Quét providerCode (format: PROV-XXX-XXX-XXX)
        // Cần kiểm tra xem providerCode có chứa itemId không
        if (cleanData.includes('-') && cleanData.split('-').length >= 4) {
          const parts = cleanData.split('-');
          const extractedItemId = parts.slice(1).join('-'); // Bỏ phần PROV

          console.log(`🔍 ORDER type scan - cleanData: ${cleanData}, extractedItemId: ${extractedItemId}, itemId: ${itemId}`);

          if (extractedItemId === itemId) {
            isMatch = true;
            scannedItemId = itemId;
          }
        }
      } else {
        // RETURN type: Quét inventoryItemId (format: ITM-XXX-XXX-XXX...)
        console.log(`🔍 RETURN type scan - cleanData: ${cleanData}, inventoryItemId: ${inventoryItemId}`);

        if (cleanData === inventoryItemId) {
          isMatch = true;
          scannedItemId = inventoryItemId;
        }
      }

      if (isMatch) {
        await playBeep();
        console.log("✅ Storage confirmation successful");

        setLastScannedData(cleanData);

        const message = importType === "ORDER"
          ? `Sản phẩm: ${productName || itemId}`
          : `Đã xác nhận lưu kho cho mã: ${cleanData}`;

        const title = importType === "ORDER" ? "Thông tin sản phẩm" : "Xác nhận thành công";

        showAlert(
          title,
          message,
          () => {
            // Chỉ lưu thông tin scan cho RETURN type (cần kiểm tra)
            if (importType !== "ORDER") {
              global.__SCANNED_ITEM__ = scannedItemId;
            }

            // Quay về màn hình trước
            router.back();
          }
        );
      } else {
        const expectedValue = importType === "ORDER" ? itemId : inventoryItemId;
        showAlert(
          "Mã không khớp",
          `Mã quét được: ${cleanData}\n${importType === "ORDER" ? "Mã sản phẩm" : "Mã hàng"} cần xác nhận: ${expectedValue}\n\nVui lòng quét đúng mã cần xác nhận.`
        );
      }

    } catch (error) {
      console.log("❌ Lỗi xử lý QR:", error);
      showAlert("Không thể xử lý mã QR này.", "❌");
    }
  };

  if (hasPermission === null) return <Text>Đang xin quyền camera...</Text>;
  if (hasPermission === false) return <Text>Không có quyền dùng camera</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View className="flex-row items-center">
          <Button onPress={() => router.back()}>←</Button>
          <Text style={styles.headerTitle}>Xác nhận lưu kho</Text>
        </View>
      </View>

      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>
          {importType === "ORDER" ? "Quét mã sản phẩm để xác nhận" : "Quét mã để xác nhận lưu kho"}
        </Text>
        {importType === "ORDER" ? (
          <>
            <Text style={styles.instructionText}>
              Sản phẩm: <Text style={styles.highlightText}>{productName || itemId}</Text>
            </Text>
            <Text style={styles.instructionText}>
              Mã cần xác nhận: <Text style={styles.highlightText}>{itemId}</Text>
            </Text>
          </>
        ) : (
          <Text style={styles.instructionText}>
            Mã cần xác nhận: <Text style={styles.highlightText}>{inventoryItemId}</Text>
          </Text>
        )}
      </View>

      <View style={styles.cameraWrapper}>
        <CameraView
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "code128"],
          }}
          onBarcodeScanned={canScan ? handleBarCodeScanned : undefined}
          style={StyleSheet.absoluteFillObject}
        />

        {lastScannedData && (
          <View style={styles.bottomBox}>
            <View style={styles.productBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.successText}>Xác nhận thành công</Text>
                <Text style={styles.scannedCode}>{lastScannedData}</Text>
              </View>
            </View>
          </View>
        )}

        {!canScan && !lastScannedData && (
          <View style={styles.scanningStatus}>
            <Text style={styles.scanningText}>
              {alertShowing.current ? "Đang xử lý..." : "Chờ quét tiếp..."}
            </Text>
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
    justifyContent: "space-between",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderColor: "#eee",
    zIndex: 20,
  },
  headerTitle: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: "bold",
  },
  instructionBox: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  instructionText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  highlightText: {
    fontWeight: "600",
    color: "#1677ff",
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
    borderRadius: 8,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  successText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10b981",
    textAlign: "center",
  },
  scannedCode: {
    fontSize: 14,
    color: "#333",
    textAlign: "center",
    marginTop: 4,
  },
  scanningStatus: {
    position: "absolute",
    top: 100,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 10,
  },
  scanningText: {
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "white",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 16,
  },
});
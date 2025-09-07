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
import {
  updateProduct,
} from "@/redux/productSlice";
import { Audio } from "expo-av";
import { useIsFocused } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function ScanQrInventoryCheckScreen() {
  const [audioPlayer, setAudioPlayer] = useState<any>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );
  const [canScan, setCanScan] = useState(true);
  const isFocused = useIsFocused();
  const scanInProgress = useRef(false);
  const alertShowing = useRef(false);

  const importOrderId = useSelector(
    (state: RootState) => state.paper.importOrderId
  );
  
  const importType = useSelector(
    (state: RootState) => state.paper.importType
  );

  const products = useSelector((state: RootState) =>
    state.product.products.filter(
      (p) => String(p.importOrderId) === importOrderId
    )
  );
  const dispatch = useDispatch();

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

  const showAlert = (title: string, message: string) => {
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

            setTimeout(() => {
              setCanScan(true);
            }, 1000);
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    console.log("📱 QR Code scanned:", data);

    if (!isFocused || !canScan || scanInProgress.current || alertShowing.current) {
      console.log("⏸️ Scan blocked:", { isFocused, canScan, scanInProgress: scanInProgress.current, alertShowing: alertShowing.current });
      return;
    }

    scanInProgress.current = true;
    setCanScan(false);

    try {
      let foundProduct = null;
      let scanMethod = "";
      const cleanData = data.trim();

      if (cleanData.startsWith('ITM-')) {
        foundProduct = products.find(
          (product) =>
            product.inventoryItemId !== null &&
            product.inventoryItemId === cleanData
        );
        scanMethod = "inventoryItemId";
        console.log(`📦 Scanning by inventoryItemId: ${cleanData}, Found: ${!!foundProduct}`);
        if (foundProduct) {
          console.log(`📦 Found product ID: ${foundProduct.id}, name: ${foundProduct.name}, inventoryItemId: ${foundProduct.inventoryItemId}`);
        }
      } else {
        try {
          const qrData = JSON.parse(decodeURIComponent(cleanData));
          console.log("🔍 Parsed as JSON:", qrData);

          if (qrData.id || qrData.itemId) {
            const itemId = qrData.id || qrData.itemId;
            foundProduct = products.find(
              (product) => product.id === String(itemId)
            );
            scanMethod = "itemId";
            console.log(`🏷️ Scanning by itemId from JSON: ${itemId}, Found: ${!!foundProduct}`);
          }
        } catch (jsonError) {
          foundProduct = products.find(
            (product) => product.id === cleanData
          );
          scanMethod = "itemId";
          console.log(`🏷️ Scanning by itemId string: ${cleanData}, Found: ${!!foundProduct}`);
        }
      }

      if (!foundProduct) {
        const message = scanMethod === "inventoryItemId"
          ? "Mã hàng tồn kho này không thuộc đơn nhập hiện tại."
          : "Sản phẩm không có trong đơn nhập này.";
        showAlert(message, "⚠️");
        return;
      }

      if (importType === "RETURN" && scanMethod === "inventoryItemId") {
        if ((foundProduct.actualMeasurementValue || 0) > 0) {
          showAlert("Sản phẩm này đã được kiểm đếm trước đó", "Sản phẩm này đã được kiểm đếm trước đó vui lòng kiểm đếm sản phẩm khác của đơn nhập");
          return;
        }
      }

      await playBeep();
      console.log("✅ Product found, updating Redux...");

      if (scanMethod === "inventoryItemId") {
        if (importType !== "RETURN") {
          console.log("📦 Inventory item scan - ORDER type: updating actual quantity");
          dispatch(
            updateProduct({
              id: foundProduct.id,
              actual: foundProduct.actual + 1,
            })
          );
        } else {
          console.log("📦 Inventory item scan - RETURN type: no actual quantity update");
        }
      } else {
        dispatch(
          updateProduct({
            id: foundProduct.id,
            actual: foundProduct.actual + 1,
          })
        );
      }

      if (importType === "RETURN" && scanMethod === "inventoryItemId") {
        console.log("📦 RETURN + inventory item: redirecting directly to detail product screen");
        router.push({
          pathname: "/import/detail-product/[id]",
          params: {
            id: foundProduct.id.toString(),
            scanMethod: scanMethod,
            inventoryItemId: foundProduct.inventoryItemId || "",
          },
        });
        return;
      }

      setLastScannedProduct({
        ...foundProduct,
        actual: (scanMethod === "inventoryItemId" && importType === "RETURN") 
          ? foundProduct.actual
          : foundProduct.actual + 1,
        measurementValue: foundProduct.measurementValue,
        scannedBy: scanMethod,
      });

      const resetDelay = scanMethod === "inventoryItemId" ? 5000 : 2000;
      setTimeout(() => {
        setLastScannedProduct(null);
        scanInProgress.current = false;
        setCanScan(true);
      }, resetDelay);

    } catch (error) {
      console.log("❌ Lỗi xử lý QR:", error);
      showAlert("Không thể xử lý mã QR này.", "❌");
    }
  };


  const handleManualEntry = () => {
    console.log("importOrderId", importOrderId);
    router.push(`/import/confirm-manual/${importOrderId}`);
  };

  
  if (hasPermission === null) return <Text>Đang xin quyền camera...</Text>;
  if (hasPermission === false) return <Text>Không có quyền dùng camera</Text>;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View className="flex-row items-center">
          <Button onPress={() => router.back()}>←</Button>
          <Text style={styles.headerTitle}>Quét QR Nhập Kho</Text>
        </View>
        <Button onPress={handleManualEntry}>Nhập thủ công</Button>
      </View>

      <View style={styles.cameraWrapper}>
        <CameraView
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "code128"],
          }}
          onBarcodeScanned={canScan ? handleBarCodeScanned : undefined}
          style={StyleSheet.absoluteFillObject}
        />

        {lastScannedProduct && (
          <View style={styles.bottomBox}>
            <View style={styles.productBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>Đã quét thành công</Text>
                <Text style={styles.productTitle}>
                  {lastScannedProduct.id}
                  {importType !== "RETURN" && ` - (${lastScannedProduct.actual}/${lastScannedProduct.expect})`}
                </Text>
                <Text style={styles.productName}>
                  {lastScannedProduct.name}
                </Text>
                {lastScannedProduct.scannedBy === "inventoryItemId" &&
                  lastScannedProduct.inventoryItemId && (
                    <Text
                      style={[
                        styles.scanMethod,
                        {
                          color: "#10b981",
                          fontSize: 12,
                          marginTop: 4,
                        },
                      ]}
                    >
                      Mã hàng tồn kho: {lastScannedProduct.inventoryItemId}
                    </Text>
                  )}
              </View>
            </View>
          </View>
        )}

        {!canScan && !lastScannedProduct && (
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
  cameraWrapper: {
    flex: 1,
    position: "relative",
  },
  scanStatus: {
    top: 16,
    paddingVertical: 13,
    marginHorizontal: 20,
    borderRadius: 5,
    zIndex: 10,
    position: "absolute",
    width: width - 40,
    alignItems: "center",
  },
  scanStatusText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  scanMethod: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
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
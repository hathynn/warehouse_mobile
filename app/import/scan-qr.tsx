import React, { useState, useEffect, useRef } from "react";
import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
 Dimensions } from "react-native";
import { Camera, CameraView } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import { Button } from "tamagui";
import {
  updateProduct,
  updateProductByInventoryId,
} from "@/redux/productSlice";
import { Audio } from "expo-av";
import { useIsFocused } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function ScanQrScreen() {
  const [audioPlayer, setAudioPlayer] = useState<any>(null);

  const { id } = useLocalSearchParams<{ id: string }>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [lastScannedProduct, setLastScannedProduct] = useState<any | null>(
    null
  );
  const [canScan, setCanScan] = useState(true);
  const isFocused = useIsFocused();
  const scanInProgress = useRef(false);
  const alertShowing = useRef(false); // Thêm flag để track Alert

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
  const productsScanned = products.filter((p) => p.actual > 0).length;

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

  // Reset khi màn hình focus lại
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
    if (alertShowing.current) return; // Không show Alert nếu đang có Alert khác

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

  // const handleBarCodeScanned = async ({ data }: { data: string }) => {
  //   // Kiểm tra các điều kiện để ngăn quét liên tục
  //   if (!isFocused || !canScan || scanInProgress.current || alertShowing.current) {
  //     return;
  //   }

  //   scanInProgress.current = true;
  //   setCanScan(false);

  //   try {
  //     const qrData = JSON.parse(decodeURIComponent(data));
  //     const foundProduct = products.find(
  //       (product) => product.id === String(qrData.id)
  //     );

  //     if (!foundProduct) {
  //       showAlert("Sản phẩm không có trong đơn nhập.", "⚠️");
  //       return;
  //     }

  //     await playBeep();

  //     dispatch(
  //       updateProduct({
  //         id: foundProduct.id,
  //         actual: foundProduct.actual + 1,
  //       })
  //     );

  //     setLastScannedProduct({
  //       ...foundProduct,
  //       actual: foundProduct.actual + 1,
  //     });

  //     // Reset sau khi quét thành công
  //     setTimeout(() => {
  //       setLastScannedProduct(null);
  //       scanInProgress.current = false;
  //       setCanScan(true);
  //     }, 2000);

  //   } catch (error) {
  //     showAlert("Mã QR không hợp lệ.", "❌");
  //   }
  // };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    console.log("📱 QR Code scanned:", data);

    // Kiểm tra các điều kiện để ngăn quét liên tục
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

      // Kiểm tra xem có phải inventoryItemId không (bắt đầu với ITM-)
      if (cleanData.startsWith('ITM-')) {
        // Trường hợp 1: InventoryItemId (chỉ string, không có JSON)
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

        // Kiểm tra nếu đã đủ số lượng expected - inventory item chỉ được quét 1 lần
        // if (foundProduct && foundProduct.actual >= foundProduct.expect) {
        //   showAlert("Đã đủ số lượng", `Inventory item ${foundProduct.name} đã được quét đủ số lượng dự kiến (${foundProduct.actual}/${foundProduct.expect}). Không thể quét thêm.`);
        //   return;
        // }
      } else if (importType === "ORDER" && cleanData.includes('-') && cleanData.split('-').length >= 4) {
        // Trường hợp đặc biệt cho ORDER: QR code format PROV-XXX-XXX-XXX
        // Tách phần itemId từ format PROV-VAI-KT-001 -> VAI-KT-001
        const parts = cleanData.split('-');
        if (parts.length >= 4) {
          const itemId = parts.slice(1).join('-'); // Bỏ phần PROV, lấy phần còn lại
          console.log(`🏷️ ORDER type - Provider code format detected. Original: ${cleanData}, ItemId: ${itemId}`);

          foundProduct = products.find(
            (product) => product.id === itemId
          );
          scanMethod = "providerCode"; // Đổi scanMethod thành providerCode để lưu lại mã QR gốc
          console.log(`🏷️ Scanning by extracted itemId: ${itemId}, Found: ${!!foundProduct}`);
        }
      } else {
        // Trường hợp 2: ItemId (có thể là JSON hoặc string)
        try {
          // Thử parse JSON cho itemId
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
          // Không phải JSON, xử lý như itemId string
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

      // Kiểm tra không cho scan lại ID đã quét (chỉ cho RETURN type với inventoryItemId)
      if (importType === "RETURN" && scanMethod === "inventoryItemId") {
        if ((foundProduct.actualMeasurementValue || 0) > 0) {
          showAlert("Sản phẩm này đã được kiểm đếm trước đó", "Sản phẩm này đã được kiểm đếm trước đó vui lòng kiểm đếm sản phẩm khác của đơn nhập");
          return;
        }
      }

      await playBeep();
      console.log("✅ Product found, updating Redux...");

      // Cập nhật Redux theo phương thức quét và import type
      if (scanMethod === "inventoryItemId") {
        // Với inventoryItemId: chỉ tăng actual cho ORDER type, RETURN type không tăng
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
      } else if (scanMethod === "providerCode") {
        // Với providerCode: lưu mã QR gốc và tăng actual
        console.log(`📦 Provider code scan - saving scanned code: ${cleanData}`);
        dispatch(
          updateProduct({
            id: foundProduct.id,
            actual: foundProduct.actual + 1,
            scannedProviderCode: cleanData, // Lưu mã QR gốc (PROV-XXX-XXX-XXX)
          })
        );
      } else {
        // Với itemId: cập nhật actual quantity như cũ (cho cả ORDER và RETURN)
        dispatch(
          updateProduct({
            id: foundProduct.id,
            actual: foundProduct.actual + 1,
          })
        );
      }

      // Với RETURN type và inventoryItemId: chuyển thẳng sang detail product screen
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
          ? foundProduct.actual  // RETURN + inventory item: không tăng actual
          : foundProduct.actual + 1, // Tất cả trường hợp khác: tăng actual
        measurementValue: foundProduct.measurementValue, // Giữ nguyên measurementValue
        scannedBy: scanMethod,
      });

      // Reset sau khi quét thành công
      const resetDelay = scanMethod === "inventoryItemId" ? 5000 : 2000; // 5s cho inventory, 2s cho item
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

  const handleScanAgain = () => {
    setError(null);
    setLastScannedProduct(null);
    setIsScanning(true);
    scanInProgress.current = false;
    alertShowing.current = false;
    setCanScan(true);
  };

  const handleManualEntry = () => {
    console.log("importOrderId", importOrderId);
    router.push(`/import/confirm-manual/${importOrderId}`);
  };

  const handleConfirm = () => {
    if (lastScannedProduct?.id) {
      router.push({
        pathname: "/import/detail-product/[id]",
        params: {
          id: lastScannedProduct.id.toString(),
          scanMethod: lastScannedProduct.scannedBy,
          inventoryItemId: lastScannedProduct.inventoryItemId || "",
        },
      });
    } else {
      showAlert("Lỗi", "Không tìm thấy mã sản phẩm.");
    }
  };
  if (hasPermission === null) return <Text>Đang xin quyền camera...</Text>;
  if (hasPermission === false) return <Text>Không có quyền dùng camera</Text>;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View className="flex-row items-center">
          <Button onPress={() => router.back()}>←</Button>
          <Text style={styles.headerTitle}>Quét QR</Text>
        </View>
        <Button onPress={handleManualEntry}>Nhập thủ công</Button>
      </View>

      {/* Camera full màn dưới header */}
      <View style={styles.cameraWrapper}>
        <CameraView
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "code128"],
          }}
          onBarcodeScanned={canScan ? handleBarCodeScanned : undefined}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Thông tin sản phẩm vừa quét */}
        {lastScannedProduct && (
          <View style={styles.bottomBox}>
            <View style={styles.productBox}>
              <View style={{ flex: 1 }}>
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

              <View className="flex-row">
                <Button
                  backgroundColor="#1677ff"
                  color="white"
                  fontWeight="500"
                  onPress={handleConfirm}
                  style={[styles.confirmButton, { marginLeft: 10 }]}
                >
                  Xác nhận
                </Button>
              </View>
            </View>
          </View>
        )}

        {/* Hiển thị trạng thái khi không thể quét */}
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
  confirmButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
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

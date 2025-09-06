import React, { useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  StyleSheet,
  Animated,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { updateProductActual, updateActual } from "@/redux/productSlice";
import { RootState } from "@/redux/store";
import useInventoryService from "@/services/useInventoryService";
import { Alert } from "react-native";

export default function SuccessPage() {
  const { id, scanMethod, inventoryItemId } = useLocalSearchParams<{ 
    id: any; 
    scanMethod?: string; 
    inventoryItemId?: string;
  }>();
  const productId = id;
  const dispatch = useDispatch();

  // Xác định loại input dựa vào scanMethod (move lên trước selector)
  const isInventoryItemScan = scanMethod === 'inventoryItemId';

  const importOrderId = useSelector(
    (state: RootState) => state.paper.importOrderId
  );

  const importType = useSelector(
    (state: RootState) => state.paper.importType
  );

  // Lấy tất cả products của đơn nhập để kiểm tra trạng thái
  const allProducts = useSelector((state: RootState) =>
    state.product.products.filter(
      (p) => String(p.importOrderId) === importOrderId
    )
  );

  // Kiểm tra xem đã quét đủ sản phẩm chưa (cho RETURN type)
  const isAllProductsScanned = importType === "RETURN" && isInventoryItemScan
    ? allProducts.filter(p => p.inventoryItemId).every(p => (p.actualMeasurementValue || 0) > 0)
    : false;

  const product = useSelector((state: RootState) => {
    // Nếu có inventoryItemId và đang scan inventory item, tìm theo inventoryItemId
    if (inventoryItemId && isInventoryItemScan) {
      return state.product.products.find((p) => p.inventoryItemId === inventoryItemId);
    }
    // Ngược lại, tìm theo productId như cũ
    return state.product.products.find((p) => p.id === productId);
  });
  
  console.log(`🔍 Detail-product page - ProductID: ${productId}, inventoryItemId param: ${inventoryItemId}, isInventoryItemScan: ${isInventoryItemScan}, Found product:`, {
    id: product?.id,
    name: product?.name, 
    itemId: product?.itemId,
    inventoryItemId: product?.inventoryItemId,
    actualMeasurementValue: product?.actualMeasurementValue
  });

  const [quantity, setQuantity] = useState("0");
  const [measurementValue, setMeasurementValue] = useState("0");
  const [inventoryData, setInventoryData] = useState<any>(null);

  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(20));

  const { fetchInventoryItemById } = useInventoryService();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Fetch inventory data for validation
  useEffect(() => {
    const fetchInventoryData = async () => {
      if (product?.inventoryItemId && isInventoryItemScan) {
        try {
          const inventory = await fetchInventoryItemById(product.inventoryItemId);
          setInventoryData(inventory);
          console.log("📦 Fetched inventory data:", inventory);
        } catch (error) {
          console.log("Error fetching inventory data:", error);
        }
      }
    };

    fetchInventoryData();
  }, [product?.inventoryItemId, isInventoryItemScan]);

  // Helper function to get max measurement value
  const getMaxMeasurementValue = (): number => {
    return inventoryData?.measurementValue || 0;
  };

  // Validation function
  const validateMeasurementValue = (value: number): boolean => {
    if (!isInventoryItemScan || !inventoryData) return true;
    
    const maxValue = getMaxMeasurementValue();
    if (maxValue > 0 && value > maxValue) {
      Alert.alert(
        "Giá trị vượt quá giới hạn",
        `Giá trị đo lường không được vượt quá ${maxValue}${product?.measurementUnit ? ` ${product.measurementUnit}` : ''}`
      );
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    // Update measurement value immediately for inventory item scans
    if (isInventoryItemScan && product?.inventoryItemId) {
      const newMeasurementValue = parseFloat(measurementValue) || 0;
      
      // Validate measurement value before submitting
      if (!validateMeasurementValue(newMeasurementValue)) {
        return; // Stop if validation fails
      }
      
      dispatch(updateActual({ 
        id: productId, 
        actualMeasurementValue: newMeasurementValue,
        inventoryItemId: product.inventoryItemId
      }));
    }

    if (isInventoryItemScan) {
      // Measurement value đã được cập nhật realtime, chỉ cần navigate
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        router.push(`/import/confirm/${importOrderId}`);
      });
    } else {
      // Cập nhật actual quantity cho item scan (logic cũ)
      const toAdd = parseInt(quantity) || 0;
      const newActual = (product?.actual || 0) + toAdd;

      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.7,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        dispatch(updateProductActual({ productId, actual: newActual }));
        router.push(`/import/confirm/${importOrderId}`);
      });
    }
  };

  const handleBackToScan = () => {
    // Validation cho RETURN type với inventory item: không cho quét tiếp nếu measurement = 0
    if (importType === "RETURN" && isInventoryItemScan) {
      const currentMeasurement = parseFloat(measurementValue) || product?.actualMeasurementValue || 0;
      if (currentMeasurement === 0) {
        Alert.alert(
          "Giá trị đo lường đang chưa được nhập", 
          "Vui lòng thực hiện nhập số giá trị đo lường của sản phẩm để thực hiện hành động tiếp theo!",
          [{ text: "Xác nhận", style: "default" }]
        );
        return;
      }
    }

    // Update measurement value immediately for inventory item scans before going back
    if (isInventoryItemScan && product?.inventoryItemId) {
      const newMeasurementValue = parseFloat(measurementValue) || 0;
      
      // Validate measurement value before going back
      if (validateMeasurementValue(newMeasurementValue)) {
        dispatch(updateActual({ 
          id: productId, 
          actualMeasurementValue: newMeasurementValue,
          inventoryItemId: product.inventoryItemId
        }));
      }
    } else if (!isInventoryItemScan) {
      // Update actual quantity for item scan (ORDER type) before going back
      const toAdd = parseInt(quantity) || 0;
      if (toAdd > 0) {
        const newActual = (product?.actual || 0) + toAdd;
        dispatch(updateProductActual({ productId, actual: newActual }));
      }
    }
    router.push(`/import/scan-qr?id=${importOrderId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView contentContainerStyle={styles.content}>
            <Animated.View
              style={[
                styles.animatedContainer,
                { opacity: fadeAnim, transform: [{ translateY }] },
              ]}
            >
              <View style={styles.successIconContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-sharp" size={50} color="white" />
                </View>
              </View>

              <View style={styles.centered}>
                <Text style={styles.title}>Quét thành công!</Text>
                <Text style={styles.subtitle}>
                  {isInventoryItemScan 
                    ? "Vui lòng nhập giá trị đo lường của sản phẩm"
                    : "Vui lòng kiểm tra lại số lượng sản phẩm trước khi xác nhận"
                  }
                </Text>
              </View>

              <View style={styles.card}>
                {product && (
                  <>
                    <View style={styles.row}>
                      <Text style={styles.label}>Tên sản phẩm</Text>
                      <Text style={styles.value}>{product.name}</Text>
                    </View>

                    {isInventoryItemScan && (
                      <View style={styles.row}>
                        <Text style={styles.label}>Mã hàng</Text>
                        <Text style={styles.inventoryValue}>{product.inventoryItemId}</Text>
                      </View>
                    )}

                    {!isInventoryItemScan && (
                      <>
                        <View style={styles.row}>
                          <Text style={styles.label}>Số lượng dự kiến</Text>
                          <Text style={styles.value}>{product.expect}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.label}>Số lượng kiểm đếm</Text>
                          <Text style={styles.valueBold}>
                            {(product?.actual || 0) + (parseInt(quantity) || 0)}
                          </Text>
                        </View>
                      </>
                    )}

                    {isInventoryItemScan && (
                      <>
                        {/* <View style={styles.row}>
                          <Text style={styles.label}>Giá trị đo dự kiến</Text>
                          <Text style={styles.value}>
                            {product.expectMeasurementValue || 0}
                            {product.measurementUnit && ` ${product.measurementUnit}`}
                          </Text>
                        </View> */}

                        <View style={styles.row}>
                          <Text style={styles.label}>Giá trị đo tối đa</Text>
                          <Text style={[styles.value, { color: '#e63946', fontWeight: 'bold' }]}>
                            {getMaxMeasurementValue()}
                            {product.measurementUnit && ` ${product.measurementUnit}`}
                          </Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.label}>Giá trị đo thực tế</Text>
                          <Text style={styles.valueBold}>
                            {parseFloat(measurementValue) || product?.actualMeasurementValue || 0}
                            {product.measurementUnit && ` ${product.measurementUnit}`}
                          </Text>
                        </View>
                      </>
                    )}
                  </>
                )}

                <View style={styles.separator} />

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>
                    {isInventoryItemScan ? "Giá trị đo lường:" : "Số lượng:"}
                  </Text>
                  {isInventoryItemScan && inventoryData && getMaxMeasurementValue() > 0 && (
                    <View style={styles.warningContainer}>
                      <Text style={styles.warningText}>
                        ⚠️ Không được vượt quá {getMaxMeasurementValue()}{product?.measurementUnit ? ` ${product.measurementUnit}` : ''}
                      </Text>
                    </View>
                  )}
                  <View style={styles.quantityInput}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        if (isInventoryItemScan) {
                          const current = parseFloat(measurementValue) || 0;
                          if (current >= 1) {
                            const newValue = current - 1;
                            if (validateMeasurementValue(newValue)) {
                              setMeasurementValue(newValue.toString());
                              
                              // Update Redux immediately
                              if (product?.inventoryItemId) {
                                dispatch(updateActual({ 
                                  id: productId, 
                                  actualMeasurementValue: newValue,
                                  inventoryItemId: product.inventoryItemId
                                }));
                              }
                            }
                          }
                        } else {
                          const current = parseInt(quantity) || 0;
                          if (current > 1) {
                            setQuantity((current - 1).toString());
                          }
                        }
                      }}
                    >
                      <Ionicons name="remove" size={22} color="#1677ff" />
                    </TouchableOpacity>

                    <TextInput
                      style={styles.input}
                      value={isInventoryItemScan ? measurementValue : quantity}
                      onChangeText={(text) => {
                        if (isInventoryItemScan) {
                          // Cho phép số thập phân cho measurement
                          const numericText = text.replace(/[^0-9.]/g, "");
                          setMeasurementValue(numericText);
                          
                          // Update Redux immediately when measurement value changes (with validation)
                          if (product?.inventoryItemId && numericText) {
                            const newMeasurementValue = parseFloat(numericText) || 0;
                            console.log(`📝 Updating measurement value for productId: ${productId}, inventoryItemId: ${product.inventoryItemId}, newValue: ${newMeasurementValue}`);
                            
                            // Only update Redux if validation passes, but don't show alert for real-time typing
                            const maxValue = getMaxMeasurementValue();
                            if (maxValue <= 0 || newMeasurementValue <= maxValue) {
                              dispatch(updateActual({ 
                                id: productId, 
                                actualMeasurementValue: newMeasurementValue,
                                inventoryItemId: product.inventoryItemId
                              }));
                            }
                          }
                        } else {
                          // Chỉ số nguyên cho quantity
                          const numericText = text.replace(/[^0-9]/g, "");
                          setQuantity(numericText);
                          
                          // Note: Redux update không cần thiết ở đây vì actual sẽ được tính trong handleSubmit
                          // Input này chỉ là số lượng thêm vào, không thay đổi actual ngay lập tức
                        }
                      }}
                      keyboardType={isInventoryItemScan ? "decimal-pad" : "numeric"}
                      textAlign="center"
                      placeholder={isInventoryItemScan ? "0.0" : "0"}
                    />

                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        if (isInventoryItemScan) {
                          const current = parseFloat(measurementValue) || 0;
                          const newValue = current + 1;
                          if (validateMeasurementValue(newValue)) {
                            setMeasurementValue(newValue.toString());
                            
                            // Update Redux immediately
                            if (product?.inventoryItemId) {
                              dispatch(updateActual({ 
                                id: productId, 
                                actualMeasurementValue: newValue,
                                inventoryItemId: product.inventoryItemId
                              }));
                            }
                          }
                        } else {
                          const current = parseInt(quantity) || 0;
                          setQuantity((current + 1).toString());
                        }
                      }}
                    >
                      <Ionicons name="add" size={22} color="#1677ff" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={[styles.button, styles.outline, styles.fullWidthButton]}
                    onPress={handleBackToScan}
                  >
                    <View style={styles.buttonContent}>
                      <Ionicons name="scan-outline" size={18} color="#1677ff" />
                      <Text style={styles.outlineText}>Quét tiếp</Text>
                    </View>
                  </TouchableOpacity>

                  {/* Button Xác nhận chỉ hiện với RETURN type khi đã quét đủ sản phẩm */}
                  {(importType !== "RETURN" || !isInventoryItemScan || isAllProductsScanned) && (
                    <TouchableOpacity
                      style={[styles.button, styles.fullWidthButton, { marginTop: 12 }]}
                      onPress={handleSubmit}
                    >
                      <View style={styles.buttonContent}>
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={18}
                          color="white"
                        />
                        <Text style={styles.buttonText}>
                          {importType === "RETURN" && isInventoryItemScan 
                            ? "Xác nhận các giá trị đo vừa kiểm đếm"
                            : "Xác nhận"
                          }
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Styles giữ nguyên
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f8fa",
  },
  content: {
    flexGrow: 1,
    padding: 20,
    justifyContent: "center",
  },
  animatedContainer: {
    width: "100%",
  },
  centered: {
    alignItems: "center",
    marginBottom: 25,
  },
  successIconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2e2e2e",
    marginVertical: 10,
  },
  subtitle: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    alignItems: "center",
  },
  label: {
    fontWeight: "500",
    fontSize: 16,
    color: "#555",
  },
  value: {
    fontSize: 16,
    color: "#333",
  },
  inventoryValue: {
    fontSize: 16,
    color: "#333",
    textAlign: "right",
    flexShrink: 1,
    flexWrap: "wrap",
    lineHeight: 22,
  },
  valueBold: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1677ff",
  },
  inputContainer: {
    marginVertical: 10,
  },
  inputLabel: {
    fontWeight: "500",
    fontSize: 16,
    color: "#555",
    marginBottom: 10,
  },
  warningContainer: {
    backgroundColor: '#fef2f2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#e63946',
  },
  warningText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '500',
  },
  quantityInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 5,
  },
  input: {
    height: 45,
    borderColor: "#e0e0e0",
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 8,
    fontSize: 18,
    fontWeight: "600",
    width: "40%",
    textAlign: "center",
    backgroundColor: "#fafafa",
  },
  quantityButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    marginHorizontal: 15,
  },
  separator: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 15,
  },
  buttonGroup: {
    flexDirection: "column",
    marginTop: 24,
  },
  button: {
    backgroundColor: "#1677ff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 6,
    elevation: 2,
  },
  fullWidthButton: {
    flex: 0,
    width: "100%",
    marginHorizontal: 0,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#1677ff",
  },
  outlineText: {
    color: "#1677ff",
    fontWeight: "600",
    fontSize: 16,
    marginLeft: 8,
  },
});
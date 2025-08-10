import React, { useState, useEffect } from "react";
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

export default function SuccessPage() {
  const { id, scanMethod } = useLocalSearchParams<{ id: any; scanMethod?: string }>();
  const productId = id;
  const dispatch = useDispatch();

  const importOrderId = useSelector(
    (state: RootState) => state.paper.importOrderId
  );

  const product = useSelector((state: RootState) =>
    state.product.products.find((p) => p.id === productId)
  );

  const [quantity, setQuantity] = useState("0");
  const [measurementValue, setMeasurementValue] = useState("0");

  // Xác định loại input dựa vào scanMethod
  const isInventoryItemScan = scanMethod === 'inventoryItemId';

  const [fadeAnim] = useState(new Animated.Value(0));
  const [translateY] = useState(new Animated.Value(20));

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

  const handleSubmit = () => {
    if (isInventoryItemScan) {
      // Cập nhật measurementValue cho inventory item scan
      const toAdd = parseFloat(measurementValue) || 0;
      const newMeasurementValue = (product?.actualMeasurementValue || 0) + toAdd;

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
        if (product?.inventoryItemId) {
          dispatch(updateActual({ 
            id: productId, 
            actualMeasurementValue: newMeasurementValue 
          }));
        }
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
                        <View style={styles.row}>
                          <Text style={styles.label}>Giá trị đo dự kiến</Text>
                          <Text style={styles.value}>{product.expectMeasurementValue}</Text>
                        </View>

                        <View style={styles.row}>
                          <Text style={styles.label}>Giá trị đo hiện tại</Text>
                          <Text style={styles.valueBold}>
                            {(product?.actualMeasurementValue || 0) + (parseFloat(measurementValue) || 0)}
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
                  <View style={styles.quantityInput}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => {
                        if (isInventoryItemScan) {
                          const current = parseFloat(measurementValue) || 0;
                          if (current >= 1) {
                            setMeasurementValue((current - 1).toString());
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
                        } else {
                          // Chỉ số nguyên cho quantity
                          const numericText = text.replace(/[^0-9]/g, "");
                          setQuantity(numericText);
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
                          setMeasurementValue((current + 1).toString());
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
                    style={[styles.button, styles.outline]}
                    onPress={handleBackToScan}
                  >
                    <View style={styles.buttonContent}>
                      <Ionicons name="scan-outline" size={18} color="#1677ff" />
                      <Text style={styles.outlineText}>Quét tiếp</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleSubmit}
                  >
                    <View style={styles.buttonContent}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={18}
                        color="white"
                      />
                      <Text style={styles.buttonText}>Xác nhận</Text>
                    </View>
                  </TouchableOpacity>
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
    flexDirection: "row",
    justifyContent: "space-between",
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
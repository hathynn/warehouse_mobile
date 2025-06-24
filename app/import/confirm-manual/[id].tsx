import { updateActual } from "@/redux/productSlice";
import { RootState } from "@/redux/store";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, Modal } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Checkbox,
  Input,
  Label,
  Paragraph,
  Square,
  XStack,
  YStack,
} from "tamagui";
import { ChevronDown } from "@tamagui/lucide-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Accordion, AccordionItem } from "@/components/ui/CustomAccordion";
const ConfirmManual = () => {
  const insets = useSafeAreaInsets();
  const [searchId, setSearchId] = useState("");
  const [filtered, setFiltered] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [inputValue, setInputValue] = useState("");

  const { id } = useLocalSearchParams<{ id: string }>();
  const products = useSelector((state: RootState) => state.product.products);
  const dispatch = useDispatch();

  const filteredProducts = filtered
    ? products.filter((p) =>
        (p.name || "").toLowerCase().includes(searchId.trim().toLowerCase())
      )
    : products;

  const handleUpdateQuantity = (productId: number) => {
    setSelectedProductId(productId);
    setInputValue("");
    setModalVisible(true);
  };

  const confirmUpdate = () => {
    const quantity = parseInt(inputValue);
    if (!isNaN(quantity) && selectedProductId !== null) {
      dispatch(updateActual({ id: selectedProductId, actual: quantity }));
    }
    setModalVisible(false);
  };

  return (
    <View className="flex-1">
      <StatusBar backgroundColor="#1677ff" style="light" />

      {/* HEADER */}
      <View
        style={{
          backgroundColor: "#1677ff",
          paddingTop: insets.top,
          paddingBottom: 16,

          paddingHorizontal: 17,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ paddingRight: 12, marginTop: 7 }}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text
          style={{
            color: "white",
            fontSize: 16,
            fontWeight: "bold",
            marginTop: 7,
          }}
        >
          Nhập số lượng thủ công đơn nhập #{id}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-5">
        {/* Tìm kiếm */}
        <YStack alignItems="center" space="$2" marginTop="$3" width="100%">
          <XStack
            alignItems="center"
            backgroundColor="white"
            borderRadius="$4"
            paddingHorizontal="$3"
            flex={1}
            height="$4.5"
            width="100%"
          >
            <Ionicons name="search" size={18} color="#999" />
            <Input
              flex={1}
              placeholder="Tìm theo tên sản phẩm"
              value={searchId}
              onChangeText={setSearchId}
              borderWidth={0}
              paddingHorizontal="$3"
              backgroundColor="white"
            />
          </XStack>

          <XStack width="100%" space="$2">
            <View style={{ flex: 1 }}>
              <Button
                fontSize={14}
                size="$2"
                height={38}
                width="100%"
                onPress={() => setFiltered(true)}
                disabled={!searchId.trim()}
              >
                Tìm
              </Button>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                fontSize={14}
                size="$2"
                height={38}
                width="100%"
                onPress={() => {
                  setFiltered(false);
                  setSearchId("");
                }}
              >
                Tắt
              </Button>
            </View>
          </XStack>
        </YStack>

        {/* Danh sách sản phẩm */}
        <Label
          width="100%"
          textAlign="center"
          fontWeight={600}
          fontSize={15}
          marginTop={20}
        >
          Nhập số lượng thủ công
        </Label>
        {filteredProducts.length > 0 ? (
          <Accordion>
            {filteredProducts.map((product, index) => (
              <AccordionItem
                key={`${product.id}-${index}`}
                header={
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontWeight: "600" }}>
                      Sản phẩm: {product.name}
                    </Text>
                  </View>
                }
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <Text>Số lượng yêu cầu</Text>
                  <Text>{product.expect}</Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 10,
                  }}
                >
                  <Text>Số lượng thực tế</Text>
                  <Text>{product.actual}</Text>
                </View>
                <Button onPress={() => handleUpdateQuantity(product.id)}>
                  Cập nhật số lượng
                </Button>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Text style={{ textAlign: "center", marginTop: 16 }}>
            Không có sản phẩm kiểm đếm
          </Text>
        )}
      </ScrollView>

      {/* Xác nhận */}
      <YStack paddingHorizontal="$4" paddingBottom="$5">
        <XStack justify="center" alignItems="center" space="$2">
          <Checkbox
            size="$4"
            checked={isChecked}
            onCheckedChange={setIsChecked}
          >
            <Checkbox.Indicator>
              <Text>✓</Text>
            </Checkbox.Indicator>
          </Checkbox>

          <Label onPress={() => setIsChecked(!isChecked)} fontSize="$4">
            Tôi xác nhận đã nhập đúng số lượng sản phẩm
          </Label>
        </XStack>

        <YStack marginTop="$1">
          <TouchableOpacity
            disabled={!isChecked}
            onPress={() => router.push("/import/sign/deliver-sign")}
            style={{
              backgroundColor: isChecked ? "#1677ff" : "#ccc",
              borderRadius: 999,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              Ký xác nhận
            </Text>
          </TouchableOpacity>
        </YStack>
      </YStack>

      {/* Modal nhập số lượng */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/10 px-6">
          <View className="bg-white p-6 rounded-xl w-full">
            <Text className="text-lg font-semibold mb-2">
              Nhập số lượng mới
            </Text>
            <Input
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder="Nhập số lượng"
              className="border border-gray-300 p-3 rounded-md mb-4"
            />
            <View className="flex-row justify-end gap-2 mt-3">
              <Button onPress={() => setModalVisible(false)}>Hủy</Button>
              <Button
                backgroundColor="#1677ff"
                color="white"
                onPress={confirmUpdate}
              >
                Cập nhật
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ConfirmManual;

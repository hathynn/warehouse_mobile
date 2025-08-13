import { updateActual } from "@/redux/productSlice";
import { RootState } from "@/redux/store";
import { ImportType } from "@/types/importOrder.type";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import { Text, View, ScrollView, TouchableOpacity, Modal } from "react-native";
import { useDispatch, useSelector } from "react-redux";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";
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
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [inputValue, setInputValue] = useState("");
  const [inventoryUnits, setInventoryUnits] = useState<{[key: string]: string}>({});

  const { id } = useLocalSearchParams<{ id: string }>();
  const products = useSelector((state: RootState) => state.product.products);
  const importType = useSelector((state: RootState) => state.paper.importType);
  const dispatch = useDispatch();
  
  // Services
  const { getItemDetailById } = useItemService();
  const { fetchInventoryItemById } = useInventoryService();
  
  // Check if this is a RETURN import
  const isReturnImport = importType === ImportType.RETURN;

  // Fetch units for inventory items
  useEffect(() => {
    const fetchUnits = async () => {
      const unitsMap: {[key: string]: string} = {};
      
      for (const product of products) {
        if (product.inventoryItemId) {
          try {
            const inventoryItem = await fetchInventoryItemById(product.inventoryItemId);
            
            if (inventoryItem && inventoryItem.itemId) {
              const itemDetails = await getItemDetailById(inventoryItem.itemId);
              
              if (itemDetails && itemDetails.measurementUnit) {
                unitsMap[product.inventoryItemId] = itemDetails.measurementUnit;
              }
            }
          } catch (error) {
            console.error(`Error fetching inventory/item details for ${product.inventoryItemId}:`, error);
          }
        }
      }
      
      setInventoryUnits(unitsMap);
    };

    if (products.length > 0) {
      fetchUnits();
    }
  }, [products, getItemDetailById, fetchInventoryItemById]);

  const filteredProducts = filtered
    ? products.filter((p) =>
        (p.name || "").toLowerCase().includes(searchId.trim().toLowerCase())
      )
    : products;

  // Get unit for a product
  const getUnit = (product: any): string => {
    if (product.inventoryItemId && inventoryUnits[product.inventoryItemId]) {
      return inventoryUnits[product.inventoryItemId];
    }
    return '';
  };

  const handleUpdateQuantity = (productId: string) => {
    setSelectedProductId(productId);
    setInputValue("");
    setModalVisible(true);
  };

  const confirmUpdate = () => {
    const value = parseFloat(inputValue);
    if (!isNaN(value) && selectedProductId !== null) {
      if (isReturnImport) {
        // For RETURN imports, update measurement value
        const updatePayload: any = {
          id: selectedProductId,
          actualMeasurementValue: value
        };
        
        // If measurement value > 0, automatically increase actual quantity by 1
        if (value > 0) {
          const currentProduct = products.find(p => p.id === selectedProductId);
          updatePayload.actual = (currentProduct?.actual || 0) + 1;
        }
        
        dispatch(updateActual(updatePayload));
      } else {
        // For normal imports, update quantity as before
        dispatch(updateActual({ id: selectedProductId, actual: Math.floor(value) }));
      }
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
          {isReturnImport ? `Nhập giá trị đo lường thủ công đơn nhập #{id}` : `Nhập số lượng thủ công đơn nhập #{id}`}
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
          {isReturnImport ? 'Nhập giá trị đo lường thủ công' : 'Nhập số lượng thủ công'}
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
                {isReturnImport ? (
                  // Display measurement values for RETURN imports
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <Text>Giá trị đo lường mong đợi</Text>
                      <Text>
                        {product.expectMeasurementValue || 0}
                        {getUnit(product) && ` ${getUnit(product)}`}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <Text>Giá trị đo lường kiểm đếm</Text>
                      <Text>
                        {product.actualMeasurementValue || 0}
                        {getUnit(product) && ` ${getUnit(product)}`}
                      </Text>
                    </View>
                    <Button onPress={() => handleUpdateQuantity(product.id)}>
                      Cập nhật giá trị đo lường
                    </Button>
                  </>
                ) : (
                  // Display quantity for normal imports
                  <>
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
                  </>
                )}
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
            {isReturnImport ? 'Tôi xác nhận đã nhập đúng giá trị đo lường sản phẩm' : 'Tôi xác nhận đã nhập đúng số lượng sản phẩm'}
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
              {isReturnImport ? 'Nhập giá trị đo lường mới' : 'Nhập số lượng mới'}
            </Text>
            <Input
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType={isReturnImport ? "decimal-pad" : "numeric"}
              placeholder={isReturnImport ? "Nhập giá trị đo lường" : "Nhập số lượng"}
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

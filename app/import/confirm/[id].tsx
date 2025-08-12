import { Accordion, AccordionItem } from "@/components/ui/CustomAccordion";
import { updateActual } from "@/redux/productSlice";
import { RootState } from "@/redux/store";
import { Ionicons } from "@expo/vector-icons";
import { ChevronDown } from "@tamagui/lucide-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState, useEffect } from "react";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";
import {
  Button,
  Checkbox,
  H3,
  H4,
  Input,
  Label,
  Paragraph,
  Square,
  XStack,
  YStack,
} from "tamagui";

const Confirm = () => {
  const insets = useSafeAreaInsets();

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [filtered, setFiltered] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [inventoryUnits, setInventoryUnits] = useState<{[key: string]: string}>({});

  const { id } = useLocalSearchParams<{ id: string }>();
  const products = useSelector((state: RootState) => state.product.products);
  
  // Services
  const { getItemDetailById } = useItemService();
  const { fetchInventoryItemById } = useInventoryService();

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

  const dispatch = useDispatch();

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [inputValue, setInputValue] = useState("");

  const handleUpdateQuantity = (productId: string) => {
    setSelectedProductId(productId);
    setInputValue(""); // reset input
    setModalVisible(true);
  };

  const confirmUpdate = () => {
    const value = parseFloat(inputValue);
    if (!isNaN(value) && selectedProductId !== null) {
      const selectedProduct = filteredProducts.find(p => p.id === selectedProductId);
      
      if (selectedProduct?.inventoryItemId) {
        // Cập nhật giá trị đo lường cho inventory item
        dispatch(updateActual({ 
          id: selectedProductId, 
          actualMeasurementValue: value 
        }));
      } else {
        // Cập nhật số lượng cho sản phẩm thông thường
        dispatch(updateActual({ 
          id: selectedProductId, 
          actual: Math.floor(value) 
        }));
      }
    }
    setModalVisible(false);
  };


  return (
    <View className="flex-1">
      <StatusBar backgroundColor="#1677ff" />

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
          Xác nhận số lượng đơn nhập #{id}
        </Text>
      </View>
      <ScrollView
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="px-5">
          {/* Tìm kiếm */}
          <YStack alignItems="center" space="$2" marginTop="$4" width="100%">
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

          {/* Thông tin sản phẩm */}
          <Label
            width="100%"
            textAlign="center"
            fontWeight={600}
            fontSize={15}
            marginTop={20}
          >
            Thông tin sản phẩm
          </Label>

          <Accordion>
            {filteredProducts.map((product, index) => (
              <AccordionItem
                key={`${product.id}-${index}`}
                header={
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ fontWeight: "600" }}>
                      {product.inventoryItemId ? 
                        `Inventory: ${product.inventoryItemId}` : 
                        `Sản phẩm: ${product.name}`
                      }
                    </Text>
                  </View>
                }
              >
                {product.inventoryItemId ? (
                  // Hiển thị cho inventoryItemId
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <Text>Tên sản phẩm</Text>
                      <Text>{product.name}</Text>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <Text>Giá trị đo lường yêu cầu</Text>
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
                      <Text>Giá trị đo lường thực tế</Text>
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
                  // Hiển thị cho sản phẩm thông thường
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
        </View>
      </ScrollView>

      {/* Nút ký xác nhận */}
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
            Tôi xác nhận đã nhập đúng thông tin sản phẩm
          </Label>
        </XStack>

        <YStack marginTop="$1">
          <TouchableOpacity
            disabled={!isChecked}
            onPress={() => router.push("/import/sign/deliver-sign")}
            className={`px-5 py-4 rounded-full ${
              isChecked ? "bg-[#1677ff]" : "bg-gray-400"
            }`}
          >
            <Text className="text-white font-semibold text-sm text-center">
              Ký xác nhận
            </Text>
          </TouchableOpacity>
        </YStack>
      </YStack>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/10 px-6">
          <View className="bg-white p-6 rounded-xl w-full">
            <Text className="text-lg font-semibold mb-2">
              {filteredProducts.find(p => p.id === selectedProductId)?.inventoryItemId ? 
                "Nhập giá trị đo lường mới" : 
                "Nhập số lượng mới"
              }
            </Text>
            <Input
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder={
                filteredProducts.find(p => p.id === selectedProductId)?.inventoryItemId ? 
                "Nhập giá trị đo lường" : 
                "Nhập số lượng"
              }
              className="border border-gray-300 p-3 rounded-md mb-4"
            />
            <View className="flex-row justify-end gap-2 mt-3">
              <Button
                onPress={() => setModalVisible(false)}
                className="text-gray-500 font-medium"
              >
                Hủy
              </Button>
              <Button
                backgroundColor="#1677ff"
                color="white"
                fontWeight={500}
                onPress={confirmUpdate}
                className="text-gray-500 font-medium"
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

export default Confirm;

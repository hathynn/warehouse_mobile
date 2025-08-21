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
  const [inventoryData, setInventoryData] = useState<{[key: string]: any}>({});

  const { id } = useLocalSearchParams<{ id: string }>();
  const products = useSelector((state: RootState) => state.product.products);
  const importType = useSelector((state: RootState) => state.paper.importType);
  const dispatch = useDispatch();
  
  // Services
  const { getItemDetailById } = useItemService();
  const { fetchInventoryItemById } = useInventoryService();
  
  // Check if this is a RETURN import
  const isReturnImport = importType === ImportType.RETURN;

  // Fetch units and inventory data for inventory items
  useEffect(() => {
    const fetchUnitsAndData = async () => {
      const unitsMap: {[key: string]: string} = {};
      const inventoryMap: {[key: string]: any} = {};
      
      for (const product of products) {
        if (product.inventoryItemId) {
          try {
            const inventoryItem = await fetchInventoryItemById(product.inventoryItemId);
            
            if (inventoryItem) {
              // Store full inventory data including measurementValue
              inventoryMap[product.inventoryItemId] = inventoryItem;
              
              if (inventoryItem.itemId) {
                const itemDetails = await getItemDetailById(inventoryItem.itemId);
                
                if (itemDetails && itemDetails.measurementUnit) {
                  unitsMap[product.inventoryItemId] = itemDetails.measurementUnit;
                }
              }
            }
          } catch (error) {
            console.log(`Error fetching inventory/item details for ${product.inventoryItemId}:`, error);
          }
        }
      }
      
      setInventoryUnits(unitsMap);
      setInventoryData(inventoryMap);
    };

    if (products.length > 0) {
      fetchUnitsAndData();
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

  // Get measurementValue from inventory data
  const getMeasurementValue = (product: any): number => {
    if (product.inventoryItemId && inventoryData[product.inventoryItemId]) {
      return inventoryData[product.inventoryItemId].measurementValue || 0;
    }
    return 0;
  };

  const handleUpdateQuantity = (productId: string, inventoryItemId?: string | null) => {
    // For RETURN imports with measurement values, use inventoryItemId
    // For ORDER/normal imports, use productId
    if (isReturnImport && inventoryItemId) {
      setSelectedProductId(inventoryItemId);
    } else {
      setSelectedProductId(productId);
    }
    setInputValue("");
    setModalVisible(true);
  };

  const confirmUpdate = () => {
    const value = parseFloat(inputValue);
    if (!isNaN(value) && selectedProductId !== null) {
      if (isReturnImport) {
        // For RETURN imports, selectedProductId is inventoryItemId
        const selectedProduct = products.find(p => p.inventoryItemId === selectedProductId);
        if (selectedProduct) {
          const maxMeasurementValue = getMeasurementValue(selectedProduct);
          
          if (maxMeasurementValue > 0 && value > maxMeasurementValue) {
            alert(`Giá trị đo lường không được vượt quá ${maxMeasurementValue}${getUnit(selectedProduct) ? ` ${getUnit(selectedProduct)}` : ''}`);
            return;
          }
        }
        
        // Update measurement value for specific inventory item
        const updatePayload: any = {
          id: selectedProduct?.id,
          actualMeasurementValue: value,
          inventoryItemId: selectedProduct?.inventoryItemId
        };
        
        dispatch(updateActual(updatePayload));
      } else {
        // For ORDER/normal imports, selectedProductId is productId
        const selectedProduct = products.find(p => p.id === selectedProductId);
        
        if (selectedProduct?.inventoryItemId) {
          // If has inventoryItemId, it's ORDER import - update measurement value and possibly quantity
          const maxMeasurementValue = getMeasurementValue(selectedProduct);
          
          if (maxMeasurementValue > 0 && value > maxMeasurementValue) {
            alert(`Giá trị đo lường không được vượt quá ${maxMeasurementValue}${getUnit(selectedProduct) ? ` ${getUnit(selectedProduct)}` : ''}`);
            return;
          }
          
          const updatePayload: any = {
            id: selectedProduct.id,
            actualMeasurementValue: value,
            inventoryItemId: selectedProduct.inventoryItemId
          };
          
          // For ORDER import, automatically increase actual quantity by 1 when measurement value > 0
          if (value > 0) {
            updatePayload.actual = (selectedProduct.actual || 0) + 1;
          }
          
          dispatch(updateActual(updatePayload));
        } else {
          // Normal import without measurement - update quantity only
          dispatch(updateActual({ id: selectedProduct?.id, actual: Math.floor(value) }));
        }
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
          {isReturnImport ? `Nhập giá trị đo lường thủ công đơn nhập ${id}` : `Nhập số lượng thủ công đơn nhập ${id}`}
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
                    {/* <View
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
                    </View> */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 10,
                      }}
                    >
                      <Text>Giá trị đo lường tối đa</Text>
                      <Text style={{ color: '#e63946', fontWeight: 'bold' }}>
                        {getMeasurementValue(product)}
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
                      <Text>Giá trị đo lường thực tế kiểm đếm</Text>
                      <Text>
                        {product.actualMeasurementValue || 0}
                        {getUnit(product) && ` ${getUnit(product)}`}
                      </Text>
                    </View>
                    <Button onPress={() => handleUpdateQuantity(product.id, product.inventoryItemId)}>
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
                    <Button onPress={() => handleUpdateQuantity(product.id, product.inventoryItemId)}>
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
            {isReturnImport && selectedProductId && (
              <View className="mb-3 p-3 bg-red-50 rounded-md">
                <Text className="text-sm text-red-600">
                  ⚠️ Giá trị đo lường không được vượt quá{' '}
                  <Text className="font-bold">
                    {(() => {
                      const selectedProduct = products.find(p => p.inventoryItemId === selectedProductId);
                      if (selectedProduct) {
                        const measurementValue = getMeasurementValue(selectedProduct);
                        const unit = getUnit(selectedProduct);
                        return `${measurementValue}${unit ? ` ${unit}` : ''}`;
                      }
                      return '0';
                    })()}
                  </Text>
                </Text>
              </View>
            )}
            <Input
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType={isReturnImport ? "decimal-pad" : "numeric"}
              placeholder={(() => {
                const selectedProduct = filteredProducts.find(p => p.id === selectedProductId);
                if (!selectedProduct) {
                  return isReturnImport ? "Nhập giá trị đo lường" : "Nhập số lượng";
                }
                
                if (selectedProduct.inventoryItemId) {
                  const actualValue = selectedProduct.actualMeasurementValue || 0;
                  return actualValue !== 0 ? 
                    `${actualValue}${getUnit(selectedProduct) ? ` ${getUnit(selectedProduct)}` : ''}` : 
                    "Nhập giá trị đo lường";
                } else {
                  const actualValue = selectedProduct.actual || 0;
                  return actualValue !== 0 ? String(actualValue) : "Nhập số lượng";
                }
              })()}
              className="border border-gray-300 p-3 rounded-md mb-4"
            />
            <View className="flex-row justify-end gap-2 mt-3">
              <Button onPress={() => setModalVisible(false)}>Hủy</Button>
              <Button
                style={{ backgroundColor: "#1677ff" }}
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

import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Animated,
} from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import useImportOrderDetail from "@/services/useImportOrderDetailService";
import { setProducts } from "@/redux/productSlice";
import { Button } from "tamagui";
import useItemService from "@/services/useItemService";

export default function KiemDemScreen() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  // Lấy dữ liệu từ Redux
  const products = useSelector((state: RootState) => state.product.products);
  const { importOrderDetails, fetchImportOrderDetails } =
    useImportOrderDetail();
  const { getItemDetailById } = useItemService();

  useEffect(() => {
    if (id) {
      fetchImportOrderDetails(Number(id));
    }
  }, [id]);
  useEffect(() => {
    console.log("Redux State Updated:", products);
  }, [products]);

  useEffect(() => {
    const updateProductsWithProviderCode = async () => {
      if (Array.isArray(importOrderDetails) && importOrderDetails.length > 0) {
        // Lấy thông tin providerCode từ API item cho từng product
        const newProducts = await Promise.all(
          importOrderDetails.map(async (item) => {
            const existingProduct = products.find((p) => p.id === item.itemId);
            let providerCode = null;
            try {
              const itemDetail = await getItemDetailById(item.itemId);
              providerCode = itemDetail?.providerCode || null;
              console.log(`🔍 Create-import - Item ${item.itemId} providerCode:`, providerCode);
            } catch (error) {
              console.log(`❌ Create-import - Error fetching item detail for ${item.itemId}:`, error);
            }

            return {
              id: item.itemId,
              name: item.itemName || `Sản phẩm ${item.itemId}`,
              expect: item.expectQuantity,
              actual: existingProduct ? existingProduct.actual : item.actualQuantity, // Giữ actual đã nhập
              providerCode: providerCode,
            };
          })
        );

        dispatch(setProducts(newProducts));
      } else {
        console.warn("Không có dữ liệu để cập nhật Redux.");
      }
    };

    updateProductsWithProviderCode();
  }, [importOrderDetails]);
  

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Animation
  const animatedValues = useMemo(() => {
    const values: { [key: string]: Animated.Value } = {};
    products.forEach((item) => {
      values[item.id] = new Animated.Value(0);
    });
    return values;
  }, [products]);

  const toggleExpand = (id: string) => {
    const isExpanding = expandedId !== id;
    setExpandedId(isExpanding ? id : null);

    Animated.timing(animatedValues[id], {
      toValue: isExpanding ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100 p-2">
      <View className="flex-1 bg-gray-100 px-5">
        {/* Header */}
        <View className="bg-[#1677ff] px-4 py-4 flex-row justify-between items-center rounded-2xl">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">
            Kiểm đếm đơn nhập số <Text className="text-blue-200">{id}</Text>
          </Text>
        </View>

        {/* Danh sách sản phẩm */}
        <FlatList
          data={products}
          className="mt-4"
          keyExtractor={(item) => `${item.id}`}
          renderItem={({ item }) => {
            const rotate = animatedValues[item.id].interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "180deg"],
            });
            console.log("Id", item.id);
            return (
              <View>
                <TouchableOpacity
                  className="bg-white px-7 py-4 rounded-t-3xl flex-row justify-between"
                  onPress={() => toggleExpand(item.id.toString())}
                >
                  <View className="flex-row gap-4 items-center">
                    <View>
                      <Text className="text-xs text-gray-400">Mã hàng hóa</Text>
                      <Text className="font-semibold">{item.id}</Text>
                    </View>
                  </View>
                  <Animated.View style={{ transform: [{ rotate }] }}>
                    <Entypo name="chevron-down" size={14} color="black" />
                  </Animated.View>
                </TouchableOpacity>

                <Animated.View
                  style={{
                    maxHeight: animatedValues[item.id].interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 200],
                    }),
                    overflow: "hidden",
                  }}
                  className="bg-white px-4 mb-2 rounded-b-3xl"
                >
                  <View className="border-b border-gray-100 pb-3">
                    <Text className="text-sm">
                      Số lượng yêu cầu: {item.expect}
                    </Text>
                    <Text className="text-sm">
                      Số lượng thực tế:{" "}
                      {/* {products.find((p) => p.id === item.id)?.actual ?? 0} */}
                      {item.actual}
                    </Text>

                    <View className="justify-end mt-4">
                      <Button
                        onPress={() => router.push(`/import/scan-qr?id=${item.id}`)}
                      >
                        {" "}
                        Nhập số lượng
                      </Button>
                      {/* <TouchableOpacity onPress={() => router.push(`/import/scan-qr?id=${id}`)}>
                        <Text className="text-black font-semibold bg-gray-100 rounded-full text-sm px-4 py-2">
                          Nhập số lượng
                        </Text>
                      </TouchableOpacity> */}
                    </View>
                  </View>
                </Animated.View>
              </View>
            );
          }}
        />
      </View>

      {/* Button Ký xác nhận */}
      <View className="flex-row justify-between mt-2 px-5">
        <TouchableOpacity
          onPress={() => router.push(`/import/confirm/${id}`)}
          pt-2
          className="bg-red-600 px-5 py-4 rounded-full flex-1 ml-2"
        >
          <Text className="text-white font-semibold text-sm text-center">
            Xác nhận thông tin đơn hàng
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

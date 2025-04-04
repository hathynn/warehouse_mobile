import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Animated,
  ActivityIndicator,
} from "react-native";
import Entypo from "@expo/vector-icons/Entypo";
import { ItemType } from "@/types/item.type";
import useItemService from "@/services/useItemService";

export default function WarehouseLocationSelector() {
  const router = useRouter();
  const { loading, fetchItems } = useItemService();
  const [items, setItems] = useState<ItemType[]>([]); // Đảm bảo items luôn là array
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchItems();
      setItems(data || []); // Đảm bảo nếu data là undefined thì setItems([])
    };
    loadData();
  }, []);

  // Hiệu ứng mở rộng
  const animatedValues = useMemo(() => {
    if (!Array.isArray(items)) return {}; // Kiểm tra items có phải array không
  
    return items.reduce((acc, item) => {
      acc[item.id] = new Animated.Value(0);
      return acc;
    }, {} as { [key: string]: Animated.Value });
  }, [items]);
  
  const toggleExpand = (id: string) => {
    if (!animatedValues[id]) return;
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
          <Text className="text-white font-bold text-lg">Sản Phẩm</Text>
        </View>

        {/* Loading */}
        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="black" />
            <Text className="mt-2 text-gray-500">Đang tải sản phẩm...</Text>
          </View>
        ) : items.length === 0 ? (
          <Text className="text-center text-gray-500 mt-10">Không có sản phẩm nào</Text>
        ) : (
          <FlatList
            data={items}
            className="mt-4"
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const rotate = animatedValues[item.id]?.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "180deg"],
              });

              return (
                <View>
                  {/* Mục chính */}
                  <TouchableOpacity
                    className="bg-white p-3 rounded-t-3xl flex-row justify-between"
                    onPress={() => toggleExpand(String(item.id))}
                  >
                    <View className="flex-row gap-4 items-center">
                      <View className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-400">
                        <FontAwesome name="archive" size={20} color="white" />
                      </View>
                      <View>
                        <Text className="text-xs text-gray-400">Tên sản phẩm</Text>
                        <Text className="font-semibold">{item.name} - {item.totalMeasurementValue}{item.measurementUnit}</Text>
                      </View>
                    </View>
                    <Animated.View style={{ transform: [{ rotate }] }}>
                      <Entypo name="chevron-down" size={14} color="black" />
                    </Animated.View>
                  </TouchableOpacity>

                  {/* Chi tiết sản phẩm (dropdown) */}
                  <Animated.View
                    style={{
                      maxHeight: animatedValues[item.id]?.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 150],
                      }),
                      overflow: "hidden",
                    }}
                    className="bg-white px-4 mb-2 rounded-b-3xl"
                  >
                    <View className="border-b border-gray-100 pb-3">
                      <Text className="text-sm">Mã sản phẩm: {item.id}</Text>
                     

                      <View className="flex-row justify-end mt-2">
                        <TouchableOpacity
                          onPress={() => console.log("Chọn:", item)}
                          className="bg-black px-4 py-2 rounded-full"
                        >
                          <Text className="text-white font-semibold text-sm">
                            Chọn sản phẩm này
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Animated.View>
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

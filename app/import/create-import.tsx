import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState, useRef, useEffect, useMemo } from "react";
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

export default function KiemDemScreen() {
  const dispatch = useDispatch();
  const router = useRouter();

  // Lấy danh sách sản phẩm từ Redux
  const products = useSelector((state: RootState) => state.product.products);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Dùng useMemo để tránh tạo lại Animated.Value mỗi lần render
  const animatedValues = useMemo(() => {
    const values: { [key: string]: Animated.Value } = {};
    products.forEach((item) => {
      values[item.id] = new Animated.Value(0);
    });
    return values;
  }, [products]);

  // Xử lý toggle mở rộng sản phẩm
  const toggleExpand = (id: string) => {
    const isExpanding = expandedId !== id;
    setExpandedId(isExpanding ? id : null);

    Animated.timing(animatedValues[id], {
      toValue: isExpanding ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // Vì thay đổi chiều cao nên không thể dùng true
    }).start();
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-100 p-5">
      <View className="flex-1 bg-gray-100 px-5">
        {/* Header */}
        <View className="bg-black px-4 py-4 flex-row justify-between items-center rounded-2xl">
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-lg">
            Kiểm đếm đơn nhập số <Text className="text-blue-200">#136</Text>
          </Text>
        </View>

        {/* Button Thêm Sản Phẩm */}
        <View className="flex items-end mt-4">
          <TouchableOpacity
            onPress={() => router.push("/import/create-location")}
            className="bg-black w-10 h-10 rounded-full flex items-center justify-center"
          >
            <Text className="text-white text-lg font-bold">+</Text>
          </TouchableOpacity>
        </View>

        {/* Danh sách sản phẩm */}
        <FlatList
          data={products}
          className="mt-4"
          keyExtractor={(item, index) =>
            item.id ? `${item.id}-${index}` : `random-${index}`
          }
          renderItem={({ item }) => {
            const rotate = animatedValues[item.id].interpolate({
              inputRange: [0, 1],
              outputRange: ["0deg", "180deg"], // Fix lỗi quay icon
            });

            return (
              <View>
                {/* Item Header */}
                <TouchableOpacity
                  className="bg-white p-3 rounded-t-3xl flex-row justify-between"
                  onPress={() => toggleExpand(item.id)}
                >
                  <View className="flex-row gap-4 items-center">
                    {/* Icon trạng thái */}
                    <View
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        item.location ? "bg-green-500" : "bg-gray-400"
                      }`}
                    >
                      <FontAwesome
                        name={item.location ? "check" : "plus"}
                        size={20}
                        color="white"
                      />
                    </View>

                    {/* Mã hàng */}
                    <View>
                      <Text className="text-xs text-gray-400">Mã hàng hóa</Text>
                      <Text className="font-semibold">{item.id}</Text>
                    </View>
                  </View>

                  {/* Icon dropdown */}
                  <Animated.View style={{ transform: [{ rotate }] }}>
                    <Entypo name="chevron-down" size={14} color="black" />
                  </Animated.View>
                </TouchableOpacity>

                {/* Chi tiết sản phẩm */}
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
                    <Text className="text-sm">Số lượng: {item.quantity}</Text>

                    <View className="flex-row justify-end">
                      <TouchableOpacity>
                        <Text className="text-black font-semibold bg-gray-100 rounded-full text-sm px-4 py-2">
                          Đếm lại
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Hiển thị vị trí nếu có */}
                  {item.location && (
                    <View className="mt-2 pb-5">
                      <Text className="font-bold">Vị trí lưu kho</Text>
                      <Text className="text-sm">{item.location}</Text>
                    </View>
                  )}
                </Animated.View>
              </View>
            );
          }}
        />
      </View>

      {/* Buttons */}
      <View className="flex-row justify-between mt-2 px-5">
        <TouchableOpacity
          onPress={() => router.push("/import/scan-qr")}
          className="bg-black px-5 py-4 rounded-full flex-1 mr-2"
        >
          <Text className="text-white font-semibold text-sm text-center">
            Thêm sản phẩm
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/import/sign")}
          className="bg-red-600 px-5 py-4 rounded-full flex-1 ml-2"
        >
          <Text className="text-white font-semibold text-sm text-center">
            Ký xác nhận
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

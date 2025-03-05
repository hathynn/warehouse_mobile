import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function ReceiptList() {
  const [activeTab, setActiveTab] = useState("request");
  const receipts = [
    { id: "143567", status: "done" },
    { id: "143567", status: "not done" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="bg-black px-4 py-5 flex-row items-center ">
        <Text className="text-white text-lg font-bold ml-4 flex-1">
          Các Phiếu Nhập
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-gray-200">
        <TouchableOpacity
          className={`flex-1 py-2 text-center ${
            activeTab === "request" ? "bg-gray-200" : ""
          }`}
          onPress={() => setActiveTab("request")}
        >
          <Text className="text-center">Theo yêu cầu</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 py-2 text-center ${
            activeTab === "return" ? "bg-gray-200" : ""
          }`}
          onPress={() => setActiveTab("return")}
        >
          <Text className="text-center">Nhập trả</Text>
        </TouchableOpacity>
      </View>

      {/* Danh sách phiếu nhập */}
      <ScrollView className="p-4">
        <View className="flex-row justify-between border-b pb-2 border-gray-300">
          <Text className="font-bold w-1/3">Mã Phiếu Nhập</Text>
          <Text className="font-bold w-1/3 text-center">Chi Tiết</Text>
          <Text className="font-bold w-1/3 text-right">Trạng thái</Text>
        </View>

        {receipts.map((receipt, index) => (
          <View
            key={index}
            className="flex-row justify-between py-2 border-b border-gray-200"
          >
            <TouchableOpacity className="w-1/3">
              <Text className="text-blue-500">#{receipt.id}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-1/3 items-center">
              <Text className="border px-3 py-1 rounded-md">Detail</Text>
            </TouchableOpacity>
            <View className="w-1/3 items-end">
              <Text
                className={`px-3 py-1 rounded-md ${
                  receipt.status === "done"
                    ? "bg-yellow-200 text-yellow-800"
                    : "bg-red-300 text-red-800"
                }`}
              >
                {receipt.status}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Pagination */}
      <View className="flex-row justify-center py-2">
        <Text className="mx-2">1</Text>
        <Text className="mx-2">2</Text>
        <Text className="mx-2">3</Text>
        <Text className="mx-2">...</Text>
        <Text className="mx-2">10</Text>
      </View>
    </SafeAreaView>
  );
}

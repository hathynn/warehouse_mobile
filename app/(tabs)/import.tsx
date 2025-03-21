import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import useImportRequest from "@/services/useImportRequestService";

const queryClient = new QueryClient();

function ReceiptListComponent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"Done" | "Not done">("Not done");

  // Gọi API thực bằng react-query
  const { fetchImportRequests } = useImportRequest();

  const { data: importRequests, isLoading } = useQuery({
    queryKey: ["import-requests"],
    queryFn: fetchImportRequests,
  });

  const receipts =
    importRequests?.filter((receipt: any) => {
      if (activeTab === "Not done") {
        return receipt.status === "Pending" || receipt.status === "Approved";
      } else if (activeTab === "Done") {
        return receipt.status === "Completed";
      }
      return false;
    }) || [];

  // const receipts = importRequests?.filter((receipt : any ) => receipt.status === activeTab) || [];

  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="px-5">
        <View className="bg-black px-4 py-7 flex-row items-center rounded-2xl">
          <Text className="text-white text-lg font-bold ml-4 flex-1">
            Danh sách phiếu nhập
          </Text>
          <TouchableOpacity className="pr-2">
            <Ionicons name="search" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View className="px-5">
        <View className="flex-row my-3 bg-gray-200 rounded-lg p-1">
          {["Done", "Not done"].map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-2 rounded-lg ${
                activeTab === tab ? "bg-white" : "bg-gray-200"
              }`}
              onPress={() => setActiveTab(tab as "Done" | "Not done")}
            >
              <Text
                className={`text-center font-semibold ${
                  activeTab === tab ? "text-black" : "text-gray-500"
                }`}
              >
                {tab === "Not done" ? "Chưa hoàn thành" : "Hoàn thành"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Danh sách phiếu nhập */}
      <ScrollView className="px-5 flex-1">
        {isLoading ? (
          <ActivityIndicator size="large" color="black" className="my-5" />
        ) : receipts.length > 0 ? (
          receipts.map((receipt: any) => (
            <TouchableOpacity
              key={receipt.id}
              className="flex-row items-center py-6 my-2 px-5 rounded-3xl bg-white"
              onPress={() => router.push(`/import/import-order/${receipt.id}`)}
            >
              {/* Icon trạng thái */}
              <View
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  receipt.status === "Completed"
                    ? "bg-green-500"
                    : "bg-gray-400"
                }`}
              >
                <FontAwesome
                  name={receipt.status === "Completed" ? "check" : "spinner"}
                  size={20}
                  color="white"
                />
              </View>

              {/* Mã phiếu nhập */}
              <View className="ml-4 flex-1">
                <Text className="text-gray-500 text-sm">Mã phiếu nhập</Text>
                <Text className="font-semibold text-black">#{receipt.id}</Text>
              </View>

              <TouchableOpacity className="p-2">
                <FontAwesome name="eye" size={20} color="black" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))
        ) : (
          <Text className="text-center text-gray-500 mt-5">
            Không có phiếu nhập
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ReceiptList() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReceiptListComponent />
    </QueryClientProvider>
  );
}

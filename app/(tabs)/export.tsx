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
import useExportRequest from "@/services/useExportRequestService";
import {
  ExportRequestStatus,
  ExportRequestType,
} from "@/types/exportRequest.type";
import { useDispatch, useSelector } from "react-redux";
import { setPaperData } from "@/redux/paperSlice";
import { Button, Input, XStack, YStack } from "tamagui";
import { RootState } from "@/redux/store";

const queryClient = new QueryClient();

function ExportListComponent() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"Done" | "Not done">("Not done");
  const [searchQuery, setSearchQuery] = useState("");
  const dispatch = useDispatch();

  // Gọi fake API qua react-query
  const { fetchExportRequests, fetchExportRequestsByStaffId  } = useExportRequest();
  const { data: exportRequests, isLoading } = useQuery({
    queryKey: ["export-requests", userId],
    queryFn: () =>
      userId
        ? fetchExportRequestsByStaffId(Number(userId), 1, 100)
        : Promise.resolve([]),
    enabled: !!userId, // chỉ chạy khi userId có giá trị
  });
  
  

  // Lọc theo trạng thái dựa vào tab được chọn
  const filteredByStatus =
    exportRequests?.filter((request: ExportRequestType) => {
      if (!request.status) return false;

      if (activeTab === "Not done") {
        return [
          ExportRequestStatus.PROCESSING,
          ExportRequestStatus.CHECKING,
          ExportRequestStatus.CHECKED,
          ExportRequestStatus.WAITING_EXPORT,
          ExportRequestStatus.NOT_STARTED,
        ].includes(request.status);
      } else if (activeTab === "Done") {
        return [
          ExportRequestStatus.COMPLETED,
          ExportRequestStatus.CANCELLED,
        ].includes(request.status);
      }
      return false;
    }) || [];
  // Áp dụng search theo mã phiếu xuất
  const filteredExports = filteredByStatus.filter(
    (request: ExportRequestType) =>
      request.exportRequestId
        .toString()
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
  );

  // Khi nhấn một export request sẽ điều hướng sang màn hình chi tiết theo exportRequestId
  const handleSelectExport = (request: ExportRequestType) => {
    // Nếu cần dispatch dữ liệu lên redux:
    dispatch(
      setPaperData({
        exportRequestId: request.exportRequestId,
        description: request.exportReason || "Không có lý do",
      })
    );
    // Chuyển hướng sang màn hình chi tiết, đường dẫn có thể cấu hình theo setup của bạn
    router.push({
      pathname: '/export/export-detail/[id]',
      params: { id: request.exportRequestId }
    });
  };
  return (
    <SafeAreaView className="flex-1 bg-gray-100">
      {/* Header */}
      <View className="px-5">
        <View className="bg-[#1677ff] px-4 py-5  flex-row items-center rounded-2xl">
          <Text className="text-white text-lg font-bold ml-4 flex-1">
            Danh sách phiếu xuất
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View className="px-5">
        <View className="flex-row my-3 bg-gray-200 rounded-lg p-1">
          {["Done", "Not done"].map((tab) => (
            <TouchableOpacity
              key={tab}
              className={`flex-1 py-2 rounded-lg ${activeTab === tab ? "bg-white" : "bg-gray-200"
                }`}
              onPress={() => setActiveTab(tab as "Done" | "Not done")}
            >
              <Text
                className={`text-center font-semibold ${activeTab === tab ? "text-black" : "text-gray-500"
                  }`}
              >
                {tab === "Not done" ? "Chưa hoàn thành" : "Hoàn thành"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Thanh Search */}
      <XStack
        alignItems="center"
        backgroundColor="white"
        borderRadius="$4"
        paddingHorizontal="$3"
        marginHorizontal="$4"
        height="$4.5"
      >
        <Ionicons name="search" size={18} color="#999" />
        <Input
          flex={1}
          placeholder="Tìm theo mã phiếu xuất"
          value={searchQuery}
          onChangeText={setSearchQuery}
          borderWidth={0}
          paddingHorizontal="$3"
          backgroundColor="white"
        />
      </XStack>

      {/* Danh sách phiếu xuất */}
      <ScrollView className="px-5 flex-1">
        {isLoading ? (
          <ActivityIndicator size="large" color="black" className="my-5" />
        ) : filteredExports.length > 0 ? (
          filteredExports.map((request: ExportRequestType) => (
            <TouchableOpacity
              key={request.exportRequestId}
              onPress={() => handleSelectExport(request)}
              className="flex-row items-center py-6 my-2 px-5 rounded-3xl bg-white"
            >
              {/* Icon trạng thái */}
              <View className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-400">
                <FontAwesome name="spinner" size={20} color="white" />
              </View>

              {/* Thông tin phiếu xuất */}
              <View className="ml-4 flex-1">
                <Text className="text-gray-500 text-sm">Mã phiếu xuất</Text>
                <Text className="font-semibold text-black">
                  #{request.exportRequestId}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text className="text-center text-gray-500 mt-5">
            Không có phiếu xuất
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ExportList() {
  return (
    <QueryClientProvider client={queryClient}>
      <ExportListComponent />
    </QueryClientProvider>
  );
}

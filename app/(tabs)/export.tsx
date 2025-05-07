import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import useExportRequest from "@/services/useExportRequestService";
import {
  ExportRequestStatus,
  ExportRequestType,
} from "@/types/exportRequest.type";
import { useDispatch, useSelector } from "react-redux";
import { setPaperData } from "@/redux/paperSlice";
import { Button, Input, XStack, YStack } from "tamagui";
import { RootState } from "@/redux/store";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const queryClient = new QueryClient();

function ExportListComponent() {
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const { fetchExportRequestsByStaffId } = useExportRequest();
  const { data: exportRequests, isLoading } = useQuery({
    queryKey: ["export-requests", userId],
    queryFn: () =>
      userId
        ? fetchExportRequestsByStaffId(Number(userId), 1, 100)
        : Promise.resolve([]),
    enabled: !!userId,
  });

  const filteredExports =
  exportRequests?.filter(
    (request: ExportRequestType) =>
      request?.exportRequestId &&
      request.exportRequestId.toString().toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];


  const handleSelectExport = (request: ExportRequestType) => {
    dispatch(
      setPaperData({
        exportRequestId: request.exportRequestId,
        description: request.exportReason || "Không có lý do",
      })
    );
    router.push({
      pathname: '/export/export-detail/[id]',
      params: { id: request.exportRequestId }
    });
  };

  return (
    <View className="flex-1">
    <StatusBar backgroundColor="#1677ff" style="light" />

    {/* Header */}
    <View
        style={{
          backgroundColor: "#1677ff",
          paddingTop: insets.top, // tràn đúng theo safe area
          paddingBottom: 16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", marginTop:5 }}>
          Danh sách phiếu xuất
        </Text>
      </View>

    {/* Search */}
    <XStack
      alignItems="center"
      backgroundColor="white"
      borderRadius="$4"
      paddingHorizontal="$3"
      marginHorizontal="$3"
      marginVertical="$2"
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

    {/* List */}
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
            <View className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-400">
              <FontAwesome name="spinner" size={20} color="white" />
            </View>
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
  </View>
  );
}

export default function ExportList() {
  return (
    <QueryClientProvider client={queryClient}>
      <ExportListComponent />
    </QueryClientProvider>
  );
}

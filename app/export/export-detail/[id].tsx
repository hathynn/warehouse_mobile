import React, { useEffect } from "react";
import { ScrollView, View, TextInput } from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { YStack, XStack, Text, Button, Input } from "tamagui";
import useExportRequest from "@/services/useExportRequestService";
import useExportRequestDetail from "@/services/useExportRequestDetailService";

interface RouteParams {
    id: string;
}

const ExportRequestScreen: React.FC = () => {
    const route = useRoute();
    const { id } = route.params as RouteParams;
    const { loading: loadingRequest, exportRequest, fetchExportRequestById } = useExportRequest();
    const {
        loading: loadingDetails,
        exportRequestDetails,
        fetchExportRequestDetails,
    } = useExportRequestDetail();

    useEffect(() => {
        if (id) {
            const requestId = Number(id);
            fetchExportRequestById(requestId);
            fetchExportRequestDetails(requestId, 1, 10);
        }
    }, [id]);

    if (loadingRequest || loadingDetails) {
        return (
            <View className="flex-1 items-center justify-center">
                <Text>Đang tải dữ liệu...</Text>
            </View>
        );
    }

    return (
        <ScrollView className="flex-1 bg-white">
            {/* Header */}
            <XStack className="bg-blue-600 px-4 py-5 items-center">
                <Ionicons name="arrow-back" size={24} color="white" />
                <Text className="text-white font-bold text-lg ml-3">Chi tiết yêu cầu</Text>
            </XStack>

            <YStack className="p-4 space-y-4">
                {/* Thông tin chi tiết */}
                <YStack className="bg-white rounded-xl p-4 shadow-md border border-gray-200">
                    <Text className="font-bold text-base mb-2">Thông tin chi tiết yêu cầu</Text>

                    <XStack justifyContent="space-between" marginBottom={4}>
                        <Text>Mã đơn hàng</Text>
                        <Text className="text-blue-600 font-semibold">
                            #{exportRequest?.exportRequestId}
                        </Text>
                    </XStack>

                    <XStack justifyContent="space-between" marginBottom={4}>
                        <Text>Tình trạng yêu cầu</Text>
                        <Text className="text-red-500 font-semibold">{exportRequest?.status}</Text>
                    </XStack>

                    <XStack justifyContent="space-between" marginBottom={4}>
                        <Text>Ngày tạo đơn</Text>
                        <Text>{exportRequest?.exportDate}</Text>
                    </XStack>

                    <XStack justifyContent="space-between" marginBottom={4}>
                        <Text>Ngày mong muốn xuất</Text>
                        <Text>{exportRequest?.expectedReturnDate}</Text>
                    </XStack>

                    <XStack justifyContent="space-between">
                        <Text>Loại xuất</Text>
                        <Text>{exportRequest?.type}</Text>
                    </XStack>
                </YStack>

                {/* Bảng danh sách mặt hàng */}
                <YStack className="rounded-xl bg-white shadow-md border border-gray-200">
                    <XStack className="bg-gray-100 px-4 py-2 rounded-t-xl">
                        <Text className="flex-1 font-semibold text-xs">Mã hàng</Text>
                        <Text className="w-12 font-semibold text-xs text-center">Cần</Text>
                        <Text className="w-20 font-semibold text-xs text-center">Tồn</Text>
                        <Text className="w-14" />
                    </XStack>

                    {exportRequestDetails.map((detail) => (
                        <XStack
                            key={detail.id}
                            className="px-4 py-3 border-t border-gray-200 items-center"
                        >
                            <Text className="flex-1 text-sm font-medium">#{detail.itemId}</Text>
                            <Text className="w-12 text-center">{detail.quantity}</Text>
                            <Text className="w-20 text-center">{detail.actualQuantity}</Text>
                            <XStack className="w-14 items-center justify-end space-x-2">
                                <Button size="$2" theme="blue" onPress={() => { }}>
                                    Scan
                                </Button>
                                <Ionicons name="help-circle-outline" size={18} color="#ccc" />
                            </XStack>
                        </XStack>
                    ))}
                </YStack>

                {/* Tình trạng tồn kho */}
                <YStack className="bg-white p-4 rounded-xl shadow-md border border-gray-200">
                    <Text className="mb-2">Tình trạng tồn kho</Text>
                    <TextInput
                        placeholder="Nhập tình trạng"
                        className="bg-gray-100 p-3 rounded-md text-sm"
                    />
                </YStack>
            </YStack>
        </ScrollView>
    );
};

export default ExportRequestScreen;

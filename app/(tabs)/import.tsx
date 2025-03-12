import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import {
  useInfiniteQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { FontAwesome, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";

const queryClient = new QueryClient();

const PAGE_SIZE = 5;

const fetchReceipts = async ({
  pageParam = 1,
}: {
  pageParam?: number;
}): Promise<{
  data: { id: string; status: string }[];
  nextPage: number | null;
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const allReceipts = Array.from({ length: 20 }, (_, i) => ({
        id: (100000 + i).toString(),
        status: i % 2 === 0 ? "Done" : "Not done",
      }));
      const paginatedData = allReceipts.slice(
        (pageParam - 1) * PAGE_SIZE,
        pageParam * PAGE_SIZE
      );
      resolve({
        data: paginatedData,
        nextPage:
          pageParam * PAGE_SIZE < allReceipts.length ? pageParam + 1 : null,
      });
    }, 1000);
  });
};

function ReceiptListComponent() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"Done" | "Not done">("Not done");

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["receipts"],
      queryFn: ({ pageParam = 1 }) =>
        fetchReceipts({ pageParam: pageParam as number }),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.nextPage,
    });

  const receipts =
    data?.pages.flatMap((page) =>
      page.data.filter((receipt) => receipt.status === activeTab)
    ) || [];

  return (
    <SafeAreaView className="flex-1 bg-gray-100 ">
      <View></View>
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
      <View className="flex-row  my-3 bg-gray-200 rounded-lg p-1">
        {["Done", "Not done"].map((tab) => (
          <TouchableOpacity
            key={tab}
            className={`flex-1 py-2 rounded-lg ${
              activeTab === tab ? "bg-white" : "bg-gray-200"
            }`}
            onPress={() => setActiveTab(tab as "Not done" | "Done")}
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
      <ScrollView className="  px-5 flex-1">
        {receipts.length > 0 ? (
          receipts.map((receipt) => (
            <TouchableOpacity
              key={receipt.id}
              className="flex-row items-center  py-6 my-2 px-5 rounded-3xl bg-white"
              onPress={() => router.push(`/import/${receipt.id}` as any)}
            >
              {/* Icon trạng thái */}
              <View
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  receipt.status === "Done" ? "bg-green-500" : "bg-gray-400"
                }`}
              >
                <FontAwesome
                  name={receipt.status === "Done" ? "check" : "spinner"}
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

        {isFetchingNextPage && (
          <ActivityIndicator size="large" color="black" className="my-5" />
        )}
      </ScrollView>

      {/* Pagination */}
      <View className="flex-row justify-center items-center py-2">
        <TouchableOpacity
          disabled={!hasNextPage}
          onPress={() => fetchNextPage()}
          className={`px-7 py-4 rounded-full shadow-md ${
            hasNextPage ? "bg-black" : "bg-gray-300"
          }`}
        >
          <Text className="text-white font-bold">
            {hasNextPage ? "Tải thêm" : "Không còn dữ liệu"}
          </Text>
        </TouchableOpacity>
      </View>
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

/*
 import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import {
  useInfiniteQuery,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { FontAwesome, Ionicons } from "@expo/vector-icons";

const queryClient = new QueryClient(); // Khởi tạo QueryClient

const PAGE_SIZE = 5;

// Giả lập API fetch dữ liệu (sau này thay bằng API thật)
const fetchReceipts = async ({
  pageParam = 1,
}: {
  pageParam?: number;
}): Promise<{
  data: { id: string; status: string }[];
  nextPage: number | null;
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const allReceipts = Array.from({ length: 20 }, (_, i) => ({
        id: (100000 + i).toString(),
        status: i % 2 === 0 ? "Done" : "Not done",
      }));
      const paginatedData = allReceipts.slice(
        (pageParam - 1) * PAGE_SIZE,
        pageParam * PAGE_SIZE
      );
      resolve({
        data: paginatedData,
        nextPage:
          pageParam * PAGE_SIZE < allReceipts.length ? pageParam + 1 : null,
      });
    }, 1000);
  });
};

function ReceiptListComponent() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<
      { data: { id: string; status: string }[]; nextPage: number | null },
      Error
    >({
      queryKey: ["receipts"],
      queryFn: ({ pageParam = 1 }) =>
        fetchReceipts({ pageParam: pageParam as number }), // Đảm bảo pageParam được truyền đúng kiểu
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.nextPage,
    });

  const receipts = data?.pages.flatMap((page) => page.data) || [];

  return (
    <SafeAreaView className="flex-1 bg-white">
 
      <View className=" ">
        <View className="bg-black px-4 py-5 flex-row items-center  ">
          <Text className="text-white text-lg font-bold ml-4 flex-1">
            Các Phiếu Nhập
          </Text>
         
        </View>
      </View>

   
      <ScrollView className="px-7 flex-1 ">
        <View className="mt-5  flex-row justify-between items-center border-b pb-2 border-gray-300">
          <Text className="font-bold w-1/3">Trạng thái</Text>
          <Text className="font-bold w-1/3 text-center">Mã phiếu nhập</Text>
          <Text className="font-bold w-1/3 text-right">Chi tiết</Text>
        </View>

        {receipts.map((receipt, index) => (
          <View
            key={index}
            className="flex-row justify-between items-center py-2 border-b border-gray-200"
          >
            <View className="w-1/3 items-start">
              <Text
                className={px-3 py-2 rounded-3xl ${
                  receipt.status === "Done"
                    ? "bg-green-200 text-green-700"
                    : "bg-red-300 text-red-800"
                }}
              >
                {receipt.status}
              </Text>
            </View>
            <TouchableOpacity className="w-1/3 items-center">
              <Text className="text-blue-500">#{receipt.id}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="w-1/3 items-end">
      <FontAwesome
        name="arrow-right" 
        size={16} 
        color="black"
        className="px-5 py-3 "
      />
    </TouchableOpacity>
          </View>
        ))}

    
        {isFetchingNextPage && (
          <ActivityIndicator size="large" color="black" className="my-5" />
        )}
      </ScrollView>

      <View className="flex-row justify-center items-center py-4">
        <TouchableOpacity
          disabled={!hasNextPage}
          onPress={() => fetchNextPage()}
          className={px-7 py-5 rounded-full shadow-mdx-2 ${hasNextPage ? "bg-black" : "bg-white"}}
        >
          <Text className={text-black ${hasNextPage ? "text-white" : "bg-red"} }>
            {hasNextPage ? "Tải thêm" : "Không còn dữ liệu"}
          </Text>
        </TouchableOpacity>
      </View>
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
*/

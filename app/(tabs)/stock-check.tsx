import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  TextInput,
  StyleSheet,
  FlatList,
} from "react-native";
import { ReactNode, useEffect, useState, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { setPaperData } from "@/redux/paperSlice";
import { setProducts } from "@/redux/productSlice";
import { RootState } from "@/redux/store";
import StatusBadge from "@/components/StatusBadge";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useStockCheck from "@/services/useStockCheckService";
import { StockCheckStatus } from "@/types/stockCheck.type";


interface StatusTab {
  key: string;
  title: string;
  status: StockCheckStatus | "ALL";
  count: number;
}

export default function StockCheckList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>(
    StockCheckStatus.IN_PROGRESS
  );

  const user = useSelector((state: RootState) => state.auth.user);
  const userId = user?.id;
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dispatch = useDispatch();

  const { loading, fetchStockChecksByStaff } = useStockCheck();
  const [allStockChecks, setAllStockChecks] = useState([]);
  // const { fetchStockCheckDetails } = useStockCheckDetailService();
  const insets = useSafeAreaInsets();

  // Định nghĩa các tab status cho stock check - simplified workflow
  const getStatusTabs = (): StatusTab[] => {
    const validStockChecks = allStockChecks.filter(
      (stockCheck: any) => stockCheck.status !== StockCheckStatus.CANCELLED &&
                           stockCheck.status !== StockCheckStatus.NOT_STARTED
    );

    return [
      {
        key: "IN_PROGRESS",
        title: "Cần kiểm đếm",
        status: StockCheckStatus.IN_PROGRESS,
        count: validStockChecks.filter(
          (stockCheck: any) => stockCheck.status === StockCheckStatus.IN_PROGRESS
        ).length,
      },
      {
        key: "COUNTED",
        title: "Chờ xác nhận",
        status: StockCheckStatus.COUNTED,
        count: validStockChecks.filter(
          (stockCheck: any) => stockCheck.status === StockCheckStatus.COUNTED
        ).length,
      },
      {
        key: "COUNT_CONFIRMED",
        title: "Đã xác nhận",
        status: StockCheckStatus.COUNT_CONFIRMED,
        count: validStockChecks.filter(
          (stockCheck: any) => stockCheck.status === StockCheckStatus.COUNT_CONFIRMED
        ).length,
      },
      {
        key: "COMPLETED",
        title: "Hoàn tất",
        status: StockCheckStatus.COMPLETED,
        count: validStockChecks.filter(
          (stockCheck: any) => stockCheck.status === StockCheckStatus.COMPLETED
        ).length,
      },
    ];
  };

  const fetchStockCheckList = useCallback(async () => {
    try {
      if (!userId) {
        console.log("User ID not found");
        return;
      }
      const stockChecks = await fetchStockChecksByStaff(Number(userId));
      console.log("Stock checks data:", stockChecks); // Debug để kiểm tra data
      setAllStockChecks(stockChecks);
    } catch (err) {
      console.log("Lỗi khi lấy danh sách kiểm kho:", err);
    }
  }, [fetchStockChecksByStaff, userId]);

  useFocusEffect(
    useCallback(() => {
      fetchStockCheckList();
    }, [fetchStockCheckList])
  );

  // Lọc dữ liệu theo tab active và search
  const getFilteredData = () => {
    let filtered = allStockChecks.filter((stockCheck: any) => {
      // Loại bỏ phiếu kiểm kho đã hủy và chưa bắt đầu
      if (stockCheck.status === StockCheckStatus.CANCELLED) return false;
      if (stockCheck.status === StockCheckStatus.NOT_STARTED) return false;

      // Lọc theo tab
      if (activeTab !== "ALL" && stockCheck.status !== activeTab) return false;

      // Lọc theo search query - sử dụng 'id' từ API
      const matchSearch = stockCheck.id
        ?.toString()
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

      return matchSearch;
    });

    return filtered;
  };

  const handleStockCheck = async (stockCheck: any) => {
    try {
      // const response = await fetchStockCheckDetails(stockCheck.id);

      // const products = response?.map((item: any) => ({
      //   id: item.itemId,
      //   name: item.itemName,
      //   systemQuantity: item.systemQuantity, // Số lượng trong hệ thống
      //   actualQuantity: item.actualQuantity || 0, // Số lượng thực tế kiểm đếm
      //   stockCheckId: stockCheck.id,
      // }));

      // dispatch(setProducts(products));
      // dispatch(
      //   setPaperData({
      //     stockCheckId: stockCheck.id,
      //   })
      // );

      // router.push("/stock-check/scan-qr");
      console.log("Handle stock check for:", stockCheck.id);
    } catch (error) {
      console.log("Lỗi khi tạo phiếu kiểm kho:", error);
    }
  };

  // Render tab item
  const renderTabItem = (tab: StatusTab) => {
    const isActive = activeTab === tab.key;

    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tabItem, isActive && styles.activeTabItem]}
        onPress={() => setActiveTab(tab.key)}
        activeOpacity={0.7}
      >
        <Text style={[styles.tabTitle, isActive && styles.activeTabTitle]}>
          {tab.title}
        </Text>
        {tab.count > 0 && (
          <View style={[styles.tabBadge, isActive && styles.activeTabBadge]}>
            <Text
              style={[
                styles.tabBadgeText,
                isActive && styles.activeTabBadgeText,
              ]}
            >
              {tab.count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render stock check item
  const renderStockCheckItem = ({ item: stockCheck }: { item: any }) => (
    <TouchableOpacity
      style={styles.stockCheckCard}
      onPress={() =>
        router.push({
          pathname: "/stock-check/detail/[id]",
          params: { id: stockCheck.id.toString() },
        })
      }
      activeOpacity={0.7}
    >
      {/* Header phiếu kiểm kho */}
      <View style={styles.stockCheckHeader}>
        <View style={styles.stockCheckIdContainer}>
          <Ionicons name="clipboard-outline" size={20} color="#1677ff" />
          <Text style={styles.stockCheckId}>{stockCheck.id}</Text>
        </View>
        <StatusBadge status={stockCheck.status} flow="import"/>
      </View>

      {/* Nội dung phiếu kiểm kho */}
      <View style={styles.stockCheckContent}>
        {/* <InfoRow
          icon="calendar-outline"
          title="Ngày tạo"
          value={new Date(stockCheck?.createdDate).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        /> */}
        <InfoRow
          icon="time-outline"
          title="Ngày kiểm đếm"
          value={new Date(stockCheck?.countingDate).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })}
        />
  
      </View>

  
    </TouchableOpacity>
  );

  const filteredData = getFilteredData();
  const statusTabs = getStatusTabs();

  return (
    <View style={styles.container}>
      {/* StatusBar */}
      <StatusBar backgroundColor="#1677ff" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>Danh sách kiểm kho</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={18}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm theo mã phiếu kiểm kho"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Status Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
        >
          {statusTabs.map(renderTabItem)}
        </ScrollView>
      </View>

      {/* Stock Check List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1677ff" />
        </View>
      ) : filteredData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="clipboard-outline" size={60} color="#BDBDBD" />
          <Text style={styles.emptyText}>
            {searchQuery
              ? "Không tìm thấy phiếu kiểm kho phù hợp"
              : `Không có phiếu kiểm kho ${statusTabs
                  .find((t) => t.key === activeTab)
                  ?.title.toLowerCase()}`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          renderItem={renderStockCheckItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.stockCheckList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

// Component hiển thị thông tin với icon
const InfoRow = ({
  icon,
  title,
  value,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  value: ReactNode;
}) => (
  <View style={styles.infoRow}>
    {icon && (
      <Ionicons name={icon} size={16} color="#666" style={styles.infoIcon} />
    )}
    <Text style={styles.infoLabel}>{title}</Text>
    <View style={styles.infoValue}>
      {typeof value === "string" || typeof value === "number" ? (
        <Text style={styles.infoValueText}>{value}</Text>
      ) : (
        value
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },
  header: {
    backgroundColor: "#1677ff",
    paddingBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F7FA",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    color: "#333",
  },

  // Tabs Styles
  tabsContainer: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: "#F5F7FA",
  },
  activeTabItem: {
    backgroundColor: "#1677ff",
  },
  tabTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabTitle: {
    color: "white",
    fontWeight: "600",
  },
  tabBadge: {
    backgroundColor: "#E0E0E0",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
    minWidth: 20,
    alignItems: "center",
  },
  activeTabBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  activeTabBadgeText: {
    color: "white",
  },

  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    color: "#757575",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  stockCheckList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 16,
  },
  stockCheckCard: {
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2.5,
    elevation: 2,
    overflow: "hidden",
  },
  stockCheckHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  stockCheckIdContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stockCheckId: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  stockCheckContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  infoValue: {
    flex: 1,
    alignItems: "flex-end",
  },
  infoValueText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  startButton: {
    backgroundColor: "#1677ff",
  },
  continueButton: {
    backgroundColor: "#f39c12",
  },
  viewButton: {
    backgroundColor: "#4CAF50",
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
  },
});
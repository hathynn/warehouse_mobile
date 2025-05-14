import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

interface ImportOrderDetailItem {
  id: number;
  productName: string;
  sku: string;
  expectedQuantity: number;
  countedQuantity: number;
  products: {
    id: number;
    serialNumber: string;
    location: {
      zone: string;
      floor: string;
      row: string;
      batch: string;
    };
  }[];
}

interface ImportOrderDetailsTableProps {
  importOrderDetails: ImportOrderDetailItem[];
}

const ImportOrderDetailsTable: React.FC<ImportOrderDetailsTableProps> = ({
  importOrderDetails,
}) => {
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  // Toggle expanded state for a detail item
  const toggleExpand = (detailId: number) => {
    setExpandedItems((prev) => {
      if (prev.includes(detailId)) {
        return prev.filter((id) => id !== detailId);
      } else {
        return [...prev, detailId];
      }
    });
  };

  // Render a single product item within a detail item
  // const renderProductItem = ({ item, index }) => (
  //   <View style={styles.productItem}>
  //     <View style={styles.productHeader}>
  //       <Text style={styles.productId}>{item.id}</Text>
  //       <Text style={styles.serialNumber}>{item.serialNumber}</Text>
  //     </View>
  //     <View style={styles.locationSection}>
  //       <View style={styles.locationRow}>
  //         <View style={styles.locationItem}>
  //           <Ionicons name="location" size={14} color="#1677ff" />
  //           <Text style={styles.locationLabel}>Zone</Text>
  //           <Text style={styles.locationValue}>{item.location.zone}</Text>
  //         </View>
  //         <View style={styles.locationItem}>
  //           <Ionicons name="layers" size={14} color="#1677ff" />
  //           <Text style={styles.locationLabel}>Floor</Text>
  //           <Text style={styles.locationValue}>{item.location.floor}</Text>
  //         </View>
  //       </View>
  //       <View style={styles.locationRow}>
  //         <View style={styles.locationItem}>
  //           <Ionicons name="reorder-four" size={14} color="#1677ff" />
  //           <Text style={styles.locationLabel}>Row</Text>
  //           <Text style={styles.locationValue}>{item.location.row}</Text>
  //         </View>
  //         <View style={styles.locationItem}>
  //           <Ionicons name="cube" size={14} color="#1677ff" />
  //           <Text style={styles.locationLabel}>Batch</Text>
  //           <Text style={styles.locationValue}>{item.location.batch}</Text>
  //         </View>
  //       </View>
  //     </View>
  //   </View>
  // );

  // Render a detail item with its products
  const renderDetailItem = ({ item }: { item: ImportOrderDetailItem }) => {
    const isExpanded = expandedItems.includes(item.id);
    const progressPercentage = Math.min(
      Math.round((item.countedQuantity / item.expectedQuantity) * 100),
      100
    );
    const progressColor = progressPercentage < 100 ? "#e63946" : "#2ecc71";

    return (
      <View style={styles.detailCard}>
        <TouchableOpacity
          onPress={() => toggleExpand(item.id)}
          style={styles.detailHeader}
        >
          <View style={styles.detailHeaderLeft}>
            <View style={styles.detailIdContainer}>
              <Text style={styles.detailId}>{item.id}</Text>
            </View>
            <View style={styles.detailInfo}>
              <Text
                style={styles.detailName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.productName}
              </Text>
              <Text style={styles.detailSku}>{item.sku}</Text>
            </View>
          </View>
          <View style={styles.expandIconContainer}>
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#666"
            />
          </View>
        </TouchableOpacity>

        <View style={styles.quantitySection}>
          <View style={styles.quantityRow}>
            <View style={styles.quantityItem}>
              <Text style={styles.quantityLabel}>Số lượng mong đợi:</Text>
              <Text style={styles.quantityValue}>{item.expectedQuantity}</Text>
            </View>
            <View style={styles.quantityItem}>
              <Text style={styles.quantityLabel}>Đã kiểm đếm:</Text>
              <Text
                style={[
                  styles.quantityValue,
                  item.countedQuantity < item.expectedQuantity
                    ? styles.incompleteQuantity
                    : styles.completeQuantity,
                ]}
              >
                {item.countedQuantity}
              </Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${progressPercentage}%`,
                    backgroundColor: progressColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{progressPercentage}%</Text>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.productsContainer}>
            <View style={styles.productsHeader}>
              <Text style={styles.productsTitle}>
                Vị trí sản phẩm
              </Text>
            </View>

            {Object.entries(
              item.products.reduce((acc, product) => {
                const locKey = `${product.location.zone}|${product.location.floor}|${product.location.row}|${product.location.batch}`;
                if (!acc[locKey]) acc[locKey] = [];
                acc[locKey].push(product);
                return acc;
              }, {} as Record<string, ImportOrderDetailItem["products"]>)
            ).map(([key, products]) => {
              const [zone, floor, row, batch] = key.split("|");

              return (
                <View key={key} style={styles.productItem}>
                  <View style={styles.locationSection}>
                    <View style={styles.locationRow}>
                      <View style={styles.locationItem}>
                        <Ionicons name="location" size={14} color="#1677ff" />
                        <Text style={styles.locationLabel}>Zone</Text>
                        <Text style={styles.locationValue}>{zone}</Text>
                      </View>
                      <View style={styles.locationItem}>
                        <Ionicons name="layers" size={14} color="#1677ff" />
                        <Text style={styles.locationLabel}>Floor</Text>
                        <Text style={styles.locationValue}>{floor}</Text>
                      </View>
                    </View>
                    <View style={styles.locationRow}>
                      <View style={styles.locationItem}>
                        <Ionicons
                          name="reorder-four"
                          size={14}
                          color="#1677ff"
                        />
                        <Text style={styles.locationLabel}>Row</Text>
                        <Text style={styles.locationValue}>{row}</Text>
                      </View>
                      <View style={styles.locationItem}>
                        <Ionicons name="cube" size={14} color="#1677ff" />
                        <Text style={styles.locationLabel}>Batch</Text>
                        <Text style={styles.locationValue}>{batch}</Text>
                      </View>
                    </View>
                    <Text
                      style={{ marginTop: 8, fontWeight: "600", fontSize: 13 }}
                    >
                      Số lượng: {products.length} sản phẩm
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.detailsHeaderContainer}>
        <Text style={styles.cardTitle}>Chi tiết đơn nhập</Text>
        <View style={styles.detailsCountContainer}>
          <Text style={styles.detailsCountText}>
            {importOrderDetails.length}
          </Text>
        </View>
      </View>

      <View style={styles.searchFilterRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <Text style={styles.searchPlaceholder}>Tìm kiếm sản phẩm...</Text>
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="filter" size={18} color="#1677ff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={importOrderDetails}
        renderItem={renderDetailItem}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.detailSeparator} />}
        contentContainerStyle={styles.detailsList}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  // Header of details section
  detailsHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  detailsCountContainer: {
    backgroundColor: "#1677ff",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  detailsCountText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  searchFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flex: 1,
    marginRight: 10,
  },
  searchPlaceholder: {
    color: "#999",
    marginLeft: 8,
    fontSize: 14,
  },
  filterButton: {
    backgroundColor: "#e6f7ff",
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  detailsList: {
    paddingTop: 8,
  },

  // Detail item styles
  detailCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  detailIdContainer: {
    backgroundColor: "#e6f7ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  detailId: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1677ff",
  },
  detailInfo: {
    flex: 1,
  },
  detailName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  detailSku: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  expandIconContainer: {
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  // Quantity section
  quantitySection: {
    marginBottom: 12,
  },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  quantityItem: {
    flexDirection: "column",
  },
  quantityLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  incompleteQuantity: {
    color: "#e63946",
  },
  completeQuantity: {
    color: "#2ecc71",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  progressBackground: {
    height: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    flex: 1,
    marginRight: 10,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "bold",
    width: 40,
    textAlign: "right",
  },

  // Products container (expanded)
  productsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingTop: 12,
  },
  productsHeader: {
    marginBottom: 12,
  },
  productsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  productsList: {
    borderRadius: 8,
    overflow: "hidden",
  },

  // Individual product
  productItem: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  productHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  productId: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1677ff",
    marginRight: 8,
  },
  serialNumber: {
    fontSize: 13,
    color: "#333",
  },
  locationSection: {
    backgroundColor: "#ffffff",
    borderRadius: 6,
    padding: 8,
  },
  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  locationItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
  },
  locationLabel: {
    fontSize: 12,
    color: "#666",
    marginLeft: 4,
    marginRight: 4,
  },
  locationValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
  },

  // Separators
  detailSeparator: {
    height: 8,
    backgroundColor: "transparent",
  },
  productSeparator: {
    height: 4,
    backgroundColor: "transparent",
  },
});

export default ImportOrderDetailsTable;

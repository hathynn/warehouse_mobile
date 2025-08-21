import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useInventoryService from "@/services/useInventoryService";
import useItemService from "@/services/useItemService";

type Product = {
  id: string;
  name: string;
  actual: number;
  expect: number;
  inventoryItemId?: string;
  actualMeasurementValue?: number;
  expectMeasurementValue?: number;
  itemId?: string;
};

type Props = {
  products: Product[];
  style?: any;
  scrollEnabled?: boolean;
  onItemPress?: (product: Product) => void;
  isReturnType?: boolean; // RETURN type chỉ hiện actual, không so sánh với expect
};

const SimpleProductList: React.FC<Props> = ({
  products,
  style,
  scrollEnabled = true,
  onItemPress,
  isReturnType = false,
}) => {
  const { getItemDetailById } = useItemService();
  const { fetchInventoryItemById } = useInventoryService();
  const [inventoryUnits, setInventoryUnits] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const fetchUnits = async () => {
      const unitsMap: {[key: string]: string} = {};
      
      for (const product of products) {
        // console.log("🔍 Checking product:", {
        //   id: product.id,
        //   inventoryItemId: product.inventoryItemId,
        //   itemId: product.itemId,
        //   name: product.name
        // });
        
        if (product.inventoryItemId) {
          try {
            // console.log(`📡 Fetching inventory item: ${product.inventoryItemId}`);
            const inventoryItem = await fetchInventoryItemById(product.inventoryItemId);
            // console.log("📦 Inventory item response:", inventoryItem);
            
            if (inventoryItem && inventoryItem.itemId) {
              // console.log(`📡 Fetching item details for itemId: ${inventoryItem.itemId}`);
              const itemDetails = await getItemDetailById(inventoryItem.itemId);
              // console.log("📦 Item details response:", itemDetails);
              
              if (itemDetails && itemDetails.measurementUnit) {
                unitsMap[product.inventoryItemId] = itemDetails.measurementUnit;
                // console.log(`✅ Added unit for ${product.inventoryItemId}: ${itemDetails.measurementUnit}`);
              } else {
                console.warn(`⚠️ No measurementUnit found for item ${inventoryItem.itemId}`, itemDetails);
              }
            } else {
              console.warn(`⚠️ Inventory item has no itemId:`, inventoryItem);
            }
          } catch (error) {
            console.log(`❌ Error fetching inventory/item details for ${product.inventoryItemId}:`, error);
          }
        } else {
          console.log("⏭️ Skipping product - not an inventory item");
        }
      }
      
      // console.log("🎯 Final units map:", unitsMap);
      setInventoryUnits(unitsMap);
    };

    if (products.length > 0) {
      fetchUnits();
    }
  }, [products, getItemDetailById]);
  const getStatusIcon = (actual: number, expect: number) => {
    if (actual === expect) {
      return { name: "checkmark-circle" as const, color: "#4CAF50" };
    } else if (actual < expect) {
      return { name: "remove-circle" as const, color: "#F44336" };
    } else {
      return { name: "alert-circle" as const, color: "#FF9800" };
    }
  };

  const getStatusBackground = (actual: number, expect: number) => {
    if (actual === expect) {
      return "#E8F5E9";
    } else if (actual < expect) {
      return "#FFEBEE";
    } else {
      return "#FFF3E0";
    }
  };

  const getDisplayValues = (product: Product) => {
    if (product.inventoryItemId) {
      // For inventory items, use measurement values
      const actual = product.actualMeasurementValue || 0;
      const expect = product.expectMeasurementValue || 0;
      const unit = inventoryUnits[product.inventoryItemId] || '';
      // console.log(`🎯 Display values for ${product.inventoryItemId}:`, {
      //   actual,
      //   expect,
      //   unit,
      //   availableUnits: Object.keys(inventoryUnits),
      //   unitsMap: inventoryUnits
      // });
      return { actual, expect, unit, displayName: product.inventoryItemId };
    } else {
      // For regular products, use quantity values
      const actual = product.actual || 0;
      const expect = product.expect || 0;
      return { actual, expect, unit: '', displayName: product.name };
    }
  };

  const renderItem = ({ item: product }: { item: Product }) => {
    const { actual, expect, unit, displayName } = getDisplayValues(product);
    
    // For RETURN type, don't show status icons or backgrounds
    const showStatus = !isReturnType;
    const { name, color } = showStatus ? getStatusIcon(actual, expect) : { name: "checkmark-circle" as const, color: "#4CAF50" };
    const statusBackground = showStatus ? getStatusBackground(actual, expect) : "#F9F9F9";

    return (
      <TouchableOpacity
        activeOpacity={onItemPress ? 0.7 : 1}
        onPress={() => onItemPress && onItemPress(product)}
      >
        <View style={[styles.item, { backgroundColor: "#FFFFFF" }]}>
          <View style={styles.productInfo}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: statusBackground },
              ]}
            >
              <Ionicons name={name} size={18} color={color} />
            </View>
            <Text style={[styles.productName, product.inventoryItemId && styles.inventoryItemName]} numberOfLines={product.inventoryItemId ? undefined : 1}>
              {displayName}
            </Text>
          </View>

          <View
            style={[
              styles.quantityContainer,
              { backgroundColor: statusBackground },
            ]}
          >
            <Text style={[styles.quantity, { color: isReturnType ? "#4CAF50" : color }]}>
              {actual}{isReturnType ? unit : ''}
              {!isReturnType && (
                <>
                  <Text style={styles.slash}>/</Text>
                  <Text style={styles.expected}>{expect}</Text>
                </>
              )}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.listContainer, style]}>
      <View style={{ maxHeight: 230 }}>
        <ScrollView
          scrollEnabled={products.length > 2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.container}
        >
          <View style={styles.titleWrapper}>
            <Text style={styles.cardTitle}>Danh sách sản phẩm</Text>
          </View>

          {products.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={40} color="#BDBDBD" />
              <Text style={styles.emptyText}>Không có sản phẩm nào</Text>
            </View>
          ) : (
            products.map((product) => {
              const { actual, expect, unit, displayName } = getDisplayValues(product);
              
              // For RETURN type, don't show status icons or backgrounds
              const showStatus = !isReturnType;
              const { name, color } = showStatus ? getStatusIcon(actual, expect) : { name: "checkmark-circle" as const, color: "#4CAF50" };
              const statusBackground = showStatus ? getStatusBackground(actual, expect) : "#F9F9F9";

              return (
                <TouchableOpacity
                  key={`product-${product.id}-${product.inventoryItemId || 'no-inventory'}`}
                  activeOpacity={onItemPress ? 0.7 : 1}
                  onPress={() => onItemPress && onItemPress(product)}
                >
                  <View style={[styles.item, { backgroundColor: "#FFFFFF" }]}>
                    <View style={styles.productInfo}>
                      <View
                        style={[
                          styles.iconContainer,
                          { backgroundColor: statusBackground },
                        ]}
                      >
                        <Ionicons name={name} size={18} color={color} />
                      </View>
                      <Text style={[styles.productName, product.inventoryItemId && styles.inventoryItemName]} numberOfLines={product.inventoryItemId ? undefined : 1}>
                        {displayName}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.quantityContainer,
                        { backgroundColor: statusBackground },
                      ]}
                    >
                      <Text style={[styles.quantity, { color: isReturnType ? "#4CAF50" : color }]}>
                        {actual}{isReturnType ? ` ${unit}` : ''}
                        {!isReturnType && (
                          <>
                            <Text>/</Text>
                            <Text>{expect}</Text>
                          </>
                        )}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.separator} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  container: {
    flexGrow: 1,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  productInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: "400",
    color: "#212121",
    flex: 1,
  },
  inventoryItemName: {
    fontSize: 14,
    fontWeight: "500",
    flexWrap: "wrap",
  },
  quantityContainer: {
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  quantity: {
    fontSize: 15,
    fontWeight: "bold",
  },
  slash: {
    color: "#757575",
    fontWeight: "normal",
    paddingHorizontal: 2,
  },
  expected: {
    color: "#757575",
    fontWeight: "normal",
  },
  separator: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginLeft: 64,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#757575",
    fontSize: 16,
    marginTop: 8,
  },
  titleWrapper: {
    paddingLeft: 16,
    marginTop: 16,
    marginBottom:4,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
});

export default SimpleProductList;

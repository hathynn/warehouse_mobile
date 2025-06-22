import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Product = {
  id: string;
  name: string;
  actual: number;
  expect: number;
};

type Props = {
  products: Product[];
  style?: any;
  scrollEnabled?: boolean;
  onItemPress?: (product: Product) => void;
};

const SimpleProductList: React.FC<Props> = ({
  products,
  style,
  scrollEnabled = true,
  onItemPress,
}) => {
  const getStatusIcon = (actual: number, expect: number) => {
    if (actual === expect) {
      return { name: "checkmark-circle", color: "#4CAF50" };
    } else if (actual < expect) {
      return { name: "remove-circle", color: "#F44336" };
    } else {
      return { name: "alert-circle", color: "#FF9800" };
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

  const renderItem = ({ item: product }: { item: Product }) => {
    const { name, color } = getStatusIcon(product.actual, product.expect);
    const statusBackground = getStatusBackground(product.actual, product.expect);
    
    return (
      <TouchableOpacity 
        activeOpacity={onItemPress ? 0.7 : 1}
        onPress={() => onItemPress && onItemPress(product)}
      >
        <View style={[styles.item, { backgroundColor: "#FFFFFF" }]}>
          <View style={styles.productInfo}>
            <View style={[styles.iconContainer, { backgroundColor: statusBackground }]}>
              <Ionicons name={name} size={18} color={color} />
            </View>
            <Text style={styles.productName} numberOfLines={1}>
              {product.name}
            </Text>
          </View>
          
          <View style={[styles.quantityContainer, { backgroundColor: statusBackground }]}>
            <Text style={[styles.quantity, { color }]}>
              {product.actual}
              <Text style={styles.slash}>/</Text>
              <Text style={styles.expected}>{product.expect}</Text>
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.listContainer, style]}>
    <View style={{ maxHeight: 130 }}>
      <ScrollView
        scrollEnabled={products.length > 2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
      >
        {products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="basket-outline" size={40} color="#BDBDBD" />
            <Text style={styles.emptyText}>Không có sản phẩm nào</Text>
          </View>
        ) : (
          products.map((product) => {
            const { name, color } = getStatusIcon(product.actual, product.expect);
            const statusBackground = getStatusBackground(product.actual, product.expect);

            return (
              <TouchableOpacity
                key={`product-${product.id}`}
                activeOpacity={onItemPress ? 0.7 : 1}
                onPress={() => onItemPress && onItemPress(product)}
              >
                <View style={[styles.item, { backgroundColor: "#FFFFFF" }]}>
                  <View style={styles.productInfo}>
                    <View style={[styles.iconContainer, { backgroundColor: statusBackground }]}>
                      <Ionicons name={name} size={18} color={color} />
                    </View>
                    <Text style={styles.productName} numberOfLines={1}>
                      {product.name}
                    </Text>
                  </View>

                  <View style={[styles.quantityContainer, { backgroundColor: statusBackground }]}>
                    <Text style={[styles.quantity, { color }]}>
                      {product.actual}
                      <Text style={styles.slash}>/</Text>
                      <Text style={styles.expected}>{product.expect}</Text>
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
    fontWeight: "500",
    color: "#212121",
    flex: 1,
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
});

export default SimpleProductList;
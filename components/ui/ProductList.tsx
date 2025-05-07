import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Accordion, AccordionItem } from "./CustomAccordion";

type Product = {
  id: number;
  name: string;
  actual: number;
  expect: number;
};

type Props = {
  products: Product[];
};

const ProductListAccordion: React.FC<Props> = ({ products }) => {
  return (
    <Accordion>
      {products.map((product, idx) => {
        let statusIcon = null;
        if (product.actual === product.expect) {
          statusIcon = (
            <Ionicons name="checkmark-circle" size={20} color="green" />
          );
        } else if (product.actual < product.expect) {
          statusIcon = (
            <Ionicons name="close-circle" size={20} color="red" />
          );
        } else {
          statusIcon = (
            <Ionicons name="alert-circle" size={20} color="orange" />
          );
        }

        return (
          <AccordionItem
            key={`prod-${product.id}-${idx}`}
            header={
              <View style={styles.titleRow}>
                {statusIcon}
                <Text style={styles.titleText}>{product.name}</Text>
              </View>
            }
          >
            <View style={styles.infoRow}>
              <Text>Số lượng yêu cầu</Text>
              <Text>{product.expect}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text>Số lượng thực tế</Text>
              <Text>{product.actual}</Text>
            </View>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  titleText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
});

export default ProductListAccordion;

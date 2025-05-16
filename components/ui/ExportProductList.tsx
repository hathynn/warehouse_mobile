import React from "react";
import { Text, View } from "react-native";
import { Accordion, AccordionItem } from "./CustomAccordion";


type ExportRequestDetail = {
  id: number;
  itemId: number;
  quantity: number;
  actualQuantity: number;
};

type Props = {
  products: ExportRequestDetail[];
};

const ExportProductListAccordion: React.FC<Props> = ({ products }) => {
  return (
    <Accordion>
      {products.map((product, index) => (
        <AccordionItem
          key={product.id}
          header={
            <Text style={{ fontWeight: "600", fontSize: 16 }}>
              Mã sản phẩm: #{product.itemId}
            </Text>
          }
        >
          <View style={{ gap: 8 }}>
            <Text>Số lượng yêu cầu: {product.quantity}</Text>
            <Text>Số lượng thực tế: {product.actualQuantity}</Text>
          </View>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default ExportProductListAccordion;

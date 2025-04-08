import React from "react";
import { Accordion, Paragraph, Square } from "tamagui";
import { ChevronDown } from "@tamagui/lucide-icons";

type Product = {
  id: number;
  actual: number;
};

type Props = {
  products: Product[];
};

const ProductListAccordion: React.FC<Props> = ({ products }) => {
  return (
    <Accordion
      overflow="hidden"
      width="100%"
      type="multiple"
      marginBottom="$3"
      borderRadius="$6"
      marginTop={10}
    >
      {products.map((product, index) => (
        <Accordion.Item key={product.id} value={`product-${index}`}>
          <Accordion.Trigger flexDirection="row" justifyContent="space-between">
            {({ open }: { open: boolean }) => (
              <>
                <Paragraph fontWeight="500">
                  Mã sản phẩm: {product.id}
                </Paragraph>
                <Square animation="quick" rotate={open ? "180deg" : "0deg"}>
                  <ChevronDown size="$1" />
                </Square>
              </>
            )}
          </Accordion.Trigger>
          <Accordion.HeightAnimator animation="medium">
            <Accordion.Content animation="medium" exitStyle={{ opacity: 0 }}>
              <Paragraph>Số lượng thực tế: {product.actual}</Paragraph>
            </Accordion.Content>
          </Accordion.HeightAnimator>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

export default ProductListAccordion;

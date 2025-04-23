import React from "react";
import { Accordion, Paragraph, Square, XStack, YStack } from "tamagui";
import { ChevronDown } from "@tamagui/lucide-icons";
import { CheckCircle, XCircle, AlertCircle } from "@tamagui/lucide-icons";

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
    <Accordion
      overflow="hidden"
      width="100%"
      type="multiple"
      marginBottom="$3"
      borderRadius="$6"
      marginTop={10}
    >
      {products.map((product, index) => {
        let statusIcon;
        let iconColor = "gray";

        if (product.actual === product.expect) {
          statusIcon = <CheckCircle color="green" size="$1" />;
        } else if (product.actual < product.expect) {
          statusIcon = <XCircle color="red" size="$1" />;
        } else {
          statusIcon = <AlertCircle color="orange" size="$1" />;
        }

        return (
          <Accordion.Item key={product.id} value={`product-${index}`}>
            <Accordion.Trigger
              flexDirection="row"
              justifyContent="space-between"
            >
              {({ open }: { open: boolean }) => (
                <XStack
                  alignItems="center"
                  justifyContent="space-between"
                  width="100%"
                >
                  <XStack alignItems="center" space="$2">
                    {statusIcon}
                    <Paragraph fontWeight="500">{product.name}</Paragraph>
                  </XStack>
                  <Square animation="quick" rotate={open ? "180deg" : "0deg"}>
                    <ChevronDown size="$1" />
                  </Square>
                </XStack>
              )}
            </Accordion.Trigger>

            <Accordion.HeightAnimator animation="medium">
              <Accordion.Content animation="medium" exitStyle={{ opacity: 0 }}>
                <YStack space="$2" padding="$2">
                  <XStack justifyContent="space-between" width="100%">
                    <Paragraph>Số lượng yêu cầu</Paragraph>
                    <Paragraph>{product.expect}</Paragraph>
                  </XStack>
                  <XStack justifyContent="space-between" width="100%">
                    <Paragraph>Số lượng thực tế</Paragraph>
                    <Paragraph>{product.actual}</Paragraph>
                  </XStack>
                </YStack>
              </Accordion.Content>
            </Accordion.HeightAnimator>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
};

export default ProductListAccordion;

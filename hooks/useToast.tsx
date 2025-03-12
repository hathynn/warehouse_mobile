import { useState } from "react";
import { Toast, XStack, YStack, Text } from "tamagui";

type ToastType = "success" | "error" | "info";

export const useToast = () => {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>("info");
  const [visible, setVisible] = useState(false);

  const showToast = (msg: string, toastType: ToastType = "info", duration: number = 5000) => {
    setMessage(msg);
    setType(toastType);
    setVisible(true);

    setTimeout(() => {
      setVisible(false);
    }, duration);
  };

  const ToastComponent = visible ? (
    <Toast>
      <XStack backgroundColor={type === "success" ? "green" : type === "error" ? "red" : "blue"} padding={10} borderRadius={8}>
        <Text color="white">{message}</Text>
      </XStack>
    </Toast>
  ) : null;

  return { showToast, ToastComponent };
};

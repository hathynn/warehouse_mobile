import { TouchableOpacity, Text, StyleSheet } from "react-native";

interface Props {
  title: string;
  onPress: () => void;
  style?: any;
  disabled?: boolean;
}

const StyledButton = ({ title, onPress, style, disabled = false }: Props) => {
  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        disabled && styles.buttonDisabled,
        style
      ]} 
      onPress={disabled ? undefined : onPress} 
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, disabled && styles.buttonTextDisabled]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#1677ff",       // màu xanh giống Tamagui theme="active"
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,                // bo tròn max giống borderRadius="$10"
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  buttonTextDisabled: {
    color: "#999",
  },
});

export default StyledButton;

// cách sử dụng
 /*
<StyledButton
  title="Kiểm đếm đơn nhập"
  onPress={async () => {
    // your async logic
  }}
/>

<StyledButton
  title="Xem chứng từ"
  onPress={() => {
    router.push(`/import/paper-detail/${importOrder.paperIds}`);
  }}
  style={{ marginTop: 12 }}
/>

 */
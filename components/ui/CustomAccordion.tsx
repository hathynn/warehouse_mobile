// components/CustomAccordion.tsx
import React, { useState, ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  LayoutAnimation,
  StyleSheet,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type AccordionItemProps = {
  header: ReactNode;
  children: ReactNode;
};

export const AccordionItem: React.FC<AccordionItemProps> = ({ header, children }) => {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(o => !o);
  };

  return (
    <View>
      <TouchableOpacity style={styles.header} onPress={toggle}>
        <View style={styles.headerContent}>{header}</View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} />
      </TouchableOpacity>
      {open && <View style={styles.content}>{children}</View>}
    </View>
  );
};

type AccordionProps = {
  children: ReactNode;
};

export const Accordion: React.FC<AccordionProps> = ({ children }) => {
  const items = React.Children.toArray(children).filter(Boolean) as React.ReactElement[];

  return (
    <View style={styles.container}>
      {items.map((child, idx) => (
        <View key={idx} style={idx > 0 ? styles.separator : undefined}>
          {child}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  separator: {
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f2f2f2",
  },
  headerContent: {
    flex: 1,
  },
  content: {
    padding: 20,
    backgroundColor: 'white',
  },
});

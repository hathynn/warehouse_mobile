import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StyledButton from './StyledButton';

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  enabled: boolean;
}

interface TodoListProps {
  items: TodoItem[];
  onItemToggle: (itemId: string) => void;
  visible: boolean;
  onClose?: () => void;
}

export const TodoList: React.FC<TodoListProps> = ({
  items,
  onItemToggle,
  visible,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Quy trình nhập kho</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Todo Items */}
        <View style={styles.todoContainer}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.todoItem,
                !item.enabled && styles.todoItemDisabled,
              ]}
              onPress={() => item.enabled && onItemToggle(item.id)}
              activeOpacity={item.enabled ? 0.7 : 1}
            >
              <View
                style={[
                  styles.checkbox,
                  item.completed && styles.checkboxCompleted,
                  !item.enabled && styles.checkboxDisabled,
                ]}
              >
                {item.completed && (
                  <Ionicons name="checkmark" size={18} color="white" />
                )}
              </View>
              
              <View style={styles.todoContent}>
                <Text
                  style={[
                    styles.todoTitle,
                    item.completed && styles.todoTitleCompleted,
                    !item.enabled && styles.todoTitleDisabled,
                  ]}
                >
                  {item.title}
                </Text>
                
              </View>

              {!item.enabled && (
                <Ionicons name="lock-closed" size={16} color="#ccc" />
              )}
            </TouchableOpacity>
          ))}
       <StyledButton
            title="Xác nhận"
            onPress={() =>console.log("Xác nhận")}
            style={{ marginTop: 12 }}
          />
        </View>

    
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    width: '85%',
    maxWidth: 350,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  todoContainer: {
    padding: 20,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  todoItemDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#dee2e6',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#1677ff',
    borderColor: '#1677ff',
  },
  checkboxDisabled: {
    borderColor: '#ccc',
    backgroundColor: '#f5f5f5',
  },
  todoContent: {
    flex: 1,
  },
  todoTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  todoTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6c757d',
  },
  todoTitleDisabled: {
    color: '#adb5bd',
  },
  todoStep: {
    fontSize: 12,
    color: '#6c757d',
  },
  todoStepDisabled: {
    color: '#adb5bd',
  },
  progressContainer: {
    padding: 20,
    paddingTop: 0,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1677ff',
    borderRadius: 4,
  },
});
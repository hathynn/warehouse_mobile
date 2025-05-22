import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export enum ImportOrderStatus {
  IN_PROGRESS = "IN_PROGRESS",
  COMPLETED = "COMPLETED", 
  CANCELLED = "CANCELLED",
  COUNTED = "COUNTED",
  CONFIRMED = "CONFIRMED"
}

interface StatusStep {
  status: ImportOrderStatus;
  title: string;
  description: string;
  icon: string;
  date?: string;
}

interface ImportOrderTrackerProps {
  currentStatus: ImportOrderStatus;
  orderId: string;
  createdDate?: string;
  countedDate?: string;
  completedDate?: string;
  confirmedDate?: string;
}

const ImportOrderTracker: React.FC<ImportOrderTrackerProps> = ({
  currentStatus,
  orderId,
  createdDate,
  countedDate,
  completedDate,
  confirmedDate,
}) => {
  
  const getStatusSteps = (): StatusStep[] => {
    return [
      {
        status: ImportOrderStatus.IN_PROGRESS,
        title: "Đang kiểm đếm",
        description: "Đơn nhập đang được kiểm đếm hàng hóa",
        icon: "time-outline",
        date: createdDate,
      },
      {
        status: ImportOrderStatus.COUNTED,
        title: "Đã kiểm đếm",
        description: "Hoàn tất kiểm đếm, chờ xác nhận",
        icon: "checkmark-circle-outline",
        date: countedDate,
      },
      {
        status: ImportOrderStatus.CONFIRMED,
        title: "Đã xác nhận",
        description: "Đơn nhập đã được xác nhận bởi quản lý",
        icon: "shield-checkmark-outline",
        date: confirmedDate,
      },
      {
        status: ImportOrderStatus.COMPLETED,
        title: "Hoàn tất nhập kho",
        description: "Đơn nhập đã được xử lý hoàn tất",
        icon: "cube-outline",
        date: completedDate,
      },
    ];
  };

  const getStatusIndex = (status: ImportOrderStatus): number => {
    const statusOrder = [
      ImportOrderStatus.IN_PROGRESS,
      ImportOrderStatus.COUNTED,
      ImportOrderStatus.CONFIRMED,
      ImportOrderStatus.COMPLETED,
    ];
    return statusOrder.indexOf(status);
  };

  const isStatusCompleted = (stepStatus: ImportOrderStatus): boolean => {
    if (currentStatus === ImportOrderStatus.CANCELLED) return false;
    return getStatusIndex(stepStatus) <= getStatusIndex(currentStatus);
  };

  const isStatusActive = (stepStatus: ImportOrderStatus): boolean => {
    return stepStatus === currentStatus;
  };

  const getStatusColor = (stepStatus: ImportOrderStatus) => {
    if (currentStatus === ImportOrderStatus.CANCELLED) {
      return {
        primary: '#F5F5F5',
        secondary: '#BDBDBD',
        text: '#9E9E9E',
        background: '#FAFAFA'
      };
    }
    
    if (isStatusActive(stepStatus)) {
      return {
        primary: '#FF6B35',
        secondary: '#FF6B35',
        text: '#FF6B35',
        background: '#FFF3F0'
      };
    }
    
    if (isStatusCompleted(stepStatus)) {
      return {
        primary: '#4CAF50',
        secondary: '#4CAF50', 
        text: '#2E7D32',
        background: '#F1F8E9'
      };
    }
    
    return {
      primary: '#E0E0E0',
      secondary: '#BDBDBD',
      text: '#9E9E9E',
      background: '#FAFAFA'
    };
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const steps = getStatusSteps();

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerContent}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>Đơn nhập #{orderId}</Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusDot,
                { backgroundColor: getStatusColor(currentStatus).primary }
              ]} />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(currentStatus).text }
              ]}>
                {getCurrentStatusText(currentStatus)}
              </Text>
            </View>
          </View>
          
          {currentStatus === ImportOrderStatus.CANCELLED && (
            <View style={styles.cancelledBadge}>
              <Ionicons name="close-circle" size={16} color="#F44336" />
              <Text style={styles.cancelledText}>Đã hủy</Text>
            </View>
          )}
        </View>
      </View>

      {/* Timeline */}
      <View style={styles.timelineContainer}>
        {steps.map((step, index) => {
          const colors = getStatusColor(step.status);
          const isLast = index === steps.length - 1;
          const showStep = currentStatus !== ImportOrderStatus.CANCELLED || 
                          getStatusIndex(step.status) <= getStatusIndex(ImportOrderStatus.IN_PROGRESS);

          if (!showStep) return null;

          return (
            <View key={step.status} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                {/* Timeline dot */}
                <View style={[
                  styles.timelineDot,
                  { 
                    backgroundColor: colors.primary,
                    borderColor: colors.secondary,
                  }
                ]}>
                  {isStatusCompleted(step.status) && currentStatus !== ImportOrderStatus.CANCELLED && (
                    <Ionicons 
                      name={isStatusActive(step.status) ? step.icon : "checkmark"} 
                      size={16} 
                      color="white" 
                    />
                  )}
                  {!isStatusCompleted(step.status) && (
                    <Ionicons name={step.icon} size={16} color={colors.secondary} />
                  )}
                </View>
                
                {/* Timeline line */}
                {!isLast && (
                  <View style={[
                    styles.timelineLine,
                    { 
                      backgroundColor: isStatusCompleted(step.status) && 
                                     currentStatus !== ImportOrderStatus.CANCELLED
                        ? '#4CAF50' 
                        : '#E0E0E0' 
                    }
                  ]} />
                )}
              </View>

              {/* Content */}
              <View style={[
                styles.timelineContent,
                { backgroundColor: colors.background }
              ]}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  {step.title}
                </Text>
                <Text style={styles.stepDescription}>
                  {step.description}
                </Text>
                {step.date && isStatusCompleted(step.status) && 
                 currentStatus !== ImportOrderStatus.CANCELLED && (
                  <Text style={styles.stepDate}>
                    {formatDate(step.date)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Action Buttons */}
      {currentStatus !== ImportOrderStatus.CANCELLED && 
       currentStatus !== ImportOrderStatus.COMPLETED && (
        <View style={styles.actionContainer}>
          {currentStatus === ImportOrderStatus.IN_PROGRESS && (
            <TouchableOpacity style={styles.primaryButton}>
              <Ionicons name="scan-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Tiếp tục kiểm đếm</Text>
            </TouchableOpacity>
          )}
          
          {currentStatus === ImportOrderStatus.COUNTED && (
            <TouchableOpacity style={styles.secondaryButton}>
              <Ionicons name="eye-outline" size={20} color="#FF6B35" />
              <Text style={styles.secondaryButtonText}>Chờ xác nhận</Text>
            </TouchableOpacity>
          )}
          
          {currentStatus === ImportOrderStatus.CONFIRMED && (
            <TouchableOpacity style={styles.primaryButton}>
              <Ionicons name="cube-outline" size={20} color="white" />
              <Text style={styles.buttonText}>Xử lý nhập kho</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Completed Status */}
      {currentStatus === ImportOrderStatus.COMPLETED && (
        <View style={styles.actionContainer}>
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#4CAF50' }]}>
            <Ionicons name="document-text-outline" size={20} color="white" />
            <Text style={styles.buttonText}>Xem phiếu nhập</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Help Section */}
      <View style={styles.helpSection}>
        <TouchableOpacity style={styles.helpItem}>
          <Ionicons name="help-circle-outline" size={20} color="#666" />
          <Text style={styles.helpText}>Cần hỗ trợ?</Text>
          <Ionicons name="chevron-forward" size={16} color="#666" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const getCurrentStatusText = (status: ImportOrderStatus): string => {
  switch (status) {
    case ImportOrderStatus.IN_PROGRESS:
      return "Đang kiểm đếm";
    case ImportOrderStatus.COUNTED:
      return "Chờ xác nhận";
    case ImportOrderStatus.CONFIRMED:
      return "Đã xác nhận";
    case ImportOrderStatus.COMPLETED:
      return "Hoàn tất";
    case ImportOrderStatus.CANCELLED:
      return "Đã hủy";
    default:
      return "Không xác định";
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  headerCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cancelledText: {
    color: '#F44336',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  timelineContainer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  timelineItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  timelineLine: {
    width: 2,
    height: 40,
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  stepDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  primaryButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButtonText: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  helpSection: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  helpText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
    marginLeft: 12,
  },
});

export default ImportOrderTracker;
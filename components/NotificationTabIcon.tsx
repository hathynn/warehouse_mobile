import React, { useEffect, useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import useNotificationService from '@/services/useNotificationService';
import { useFocusEffect } from 'expo-router';
import { PusherContext } from '@/contexts/pusher/PusherContext';

interface NotificationTabIconProps {
  color: string;
  size: number;
  focused: boolean;
}

export default function NotificationTabIcon({ color, size, focused }: NotificationTabIconProps) {
  const [unviewedCount, setUnviewedCount] = useState(0);
  const { user, isLoggingOut } = useSelector((state: RootState) => state.auth);
  const { getAllNotifications } = useNotificationService();
  const { latestNotification } = useContext(PusherContext);

  const fetchUnviewedCount = useCallback(async () => {
    if (!user?.id || isLoggingOut) {
      console.warn('No user ID available or logging out - skipping notifications fetch');
      if (isLoggingOut) {
        setUnviewedCount(0); // Clear count during logout
      }
      return;
    }

    try {
      const response = await getAllNotifications(Number(user.id));
      if (response.statusCode >= 200 && response.statusCode < 300 && Array.isArray(response.content)) {
        const unviewed = response.content.filter(notification => !notification.isViewed);
        setUnviewedCount(unviewed.length);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Reset count on error to prevent stale data
      setUnviewedCount(0);
    }
  }, [user, isLoggingOut]);

  useEffect(() => {
    fetchUnviewedCount();
  }, [user]);

  // Listen for new notifications from Pusher
  useEffect(() => {
    if (latestNotification) {
      fetchUnviewedCount();
    }
  }, [latestNotification]);

  return (
    <View style={styles.container}>
      <Ionicons name="notifications" color={color} size={size} />
      {unviewedCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unviewedCount > 99 ? '99+' : unviewedCount.toString()}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -3,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 
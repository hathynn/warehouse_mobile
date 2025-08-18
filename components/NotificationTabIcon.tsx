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

  const { user, isLoggingOut, isLoggedIn, isRestoring } = useSelector((state: RootState) => state.auth);


  const { getAllNotifications } = useNotificationService();
  const { latestNotification } = useContext(PusherContext);

  // Don't process notifications during logout, restoration, or invalid auth state
  if (!isLoggedIn || !user || isLoggingOut || isRestoring) {
    return (
      <View style={{ position: 'relative' }}>
        <Ionicons name="notifications" color={color} size={size} />
      </View>
    );
  }

  const fetchUnviewedCount = useCallback(async () => {

    // Don't fetch if not logged in, logging out, restoring, or user data is incomplete
    if (!isLoggedIn || !user?.id || isLoggingOut || isRestoring || typeof user.id !== 'string') {
      console.warn('NotificationTabIcon: Invalid state for fetching notifications', {
        isLoggedIn,
        hasUserId: !!user?.id,
        isLoggingOut,
        isRestoring,
        userIdType: typeof user?.id
      });

      if (isLoggingOut || isRestoring) {
        setUnviewedCount(0); // Clear count during logout/restoration
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
      console.log('Failed to fetch notifications:', error);
      // Reset count on error to prevent stale data
      setUnviewedCount(0);
    }

  }, [user, isLoggingOut, isRestoring, isLoggedIn]);


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
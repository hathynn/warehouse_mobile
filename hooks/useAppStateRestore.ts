import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreAuthState, startRestore } from '@/redux/authSlice';
import { RootState, store } from '@/redux/store';

export const useAppStateRestore = () => {
  const dispatch = useDispatch();
  const appState = useRef(AppState.currentState);
  const backgroundTime = useRef<number | null>(null);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log(`🔄 App state changed from ${appState.current} to ${nextAppState}`);

      // Track when app goes to background
      if (nextAppState === 'background') {
        backgroundTime.current = Date.now();
        console.log('📱 App went to background');
      }

      // When app comes back to foreground from background
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const timeInBackground = backgroundTime.current ? Date.now() - backgroundTime.current : 0;
        console.log(`📱 App came to foreground after ${Math.round(timeInBackground / 1000)}s in background`);

        // Get FRESH auth state from the store (not from stale selector)
        const currentState = store.getState();
        const { isLoggedIn, user, isLoggingOut, isRestoring } = currentState.auth;

        // Don't restore state if we're in the middle of logging out or already restoring
        if (isLoggingOut || isRestoring) {
          console.log('⏸️ Skipping auth state check - logout/restore in progress');
          appState.current = nextAppState;
          return;
        }

        try {
          // Check if Redux state is inconsistent with AsyncStorage
          const [accessToken, refreshToken] = await Promise.all([
            AsyncStorage.getItem("access_token"),
            AsyncStorage.getItem("refresh_token")
          ]);

          // If we have tokens in storage but no user in Redux, restore the state
          if (accessToken && refreshToken && (!isLoggedIn || !user)) {
            console.log(`🔄 Restoring auth state after app resume (${Math.round(timeInBackground / 1000)}s background)...`);

            // Mark restoration as starting to prevent component interference
            dispatch(startRestore());

            // Always add a base delay to prevent immediate component re-initialization
            const baseDelay = 200;

            // Add extra delay for longer background periods
            let extraDelay = 0;
            if (timeInBackground > 60000) { // 1 minute
              extraDelay = 800;
              console.log('⏳ Long background period detected, adding extra restoration delay...');
            } else if (timeInBackground > 30000) { // 30 seconds
              extraDelay = 400;
              console.log('⏳ Medium background period detected, adding moderate restoration delay...');
            }

            const totalDelay = baseDelay + extraDelay;
            console.log(`⏳ Applying ${totalDelay}ms restoration delay...`);
            await new Promise(resolve => setTimeout(resolve, totalDelay));

            dispatch(restoreAuthState({
              access_token: accessToken,
              refresh_token: refreshToken
            }));

            // Additional delay after restoration to let components settle
            console.log('⏳ Allowing components to settle...');
            await new Promise(resolve => setTimeout(resolve, 300));
            console.log('✅ Restoration process complete');
          }

          // If we have user in Redux but no tokens in storage, clear Redux state
          else if ((isLoggedIn || user) && (!accessToken || !refreshToken)) {
            console.log('🧹 Clearing inconsistent auth state...');
            // This would require a clearAuthState action, but for now we'll let the normal flow handle it
          }
        } catch (error) {
          console.log('❌ Error in app state restoration:', error);
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [dispatch]);
};

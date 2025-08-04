import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restoreAuthState } from '@/redux/authSlice';
import { RootState } from '@/redux/store';

export const useAppStateRestore = () => {
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log(`🔄 App state changed from ${appState.current} to ${nextAppState}`);

      // When app comes back to foreground from background
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('📱 App came to foreground, checking auth state...');

        // Get current auth state safely
        const { isLoggedIn, user, isLoggingOut } = authState;

        // Don't restore state if we're in the middle of logging out
        if (isLoggingOut) {
          console.log('⏸️ Skipping auth state check - logout in progress');
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
            console.log('🔄 Restoring auth state after app resume...');
            dispatch(restoreAuthState({
              access_token: accessToken,
              refresh_token: refreshToken
            }));
          }

          // If we have user in Redux but no tokens in storage, clear Redux state
          else if ((isLoggedIn || user) && (!accessToken || !refreshToken)) {
            console.log('🧹 Clearing inconsistent auth state...');
            // This would require a clearAuthState action, but for now we'll let the normal flow handle it
          }
        } catch (error) {
          console.error('❌ Error in app state restoration:', error);
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [dispatch]); // Remove user and isLoggedIn from dependencies to prevent re-running during logout
};

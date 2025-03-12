import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import { store } from '@/redux/store';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '@/tamagui.config';

export default function Main() {
  return (
      <TamaguiProvider config={tamaguiConfig}>
    <Provider store={store}>
      <Slot />
    </Provider>
    </TamaguiProvider>
  );
}

import { Provider } from 'react-redux';
import { Slot } from 'expo-router';
import { store } from '@/redux/store';

export default function Main() {
  return (
    <Provider store={store}>
      <Slot />
    </Provider>
  );
}

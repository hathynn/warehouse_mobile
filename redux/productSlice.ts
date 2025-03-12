import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Product {
  id: string;
  name: string;
  quantity: number;
  location?: string | null; // 🆕 Thêm trường vị trí
}

interface ProductState {
  products: Product[];
}

const initialState: ProductState = {
  products: [],
};

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
    },
    setProductLocation: (
      state,
      action: PayloadAction<{ productId: string; location: string }>
    ) => {
      const product = state.products.find((p) => p.id === action.payload.productId);
      if (product) {
        product.location = action.payload.location;
      }
    },
    addProduct: (state, action: PayloadAction<Product>) => {
        state.products.push(action.payload);
      },
  },
});

export const { setProducts, setProductLocation, addProduct  } = productSlice.actions;
export default productSlice.reducer;

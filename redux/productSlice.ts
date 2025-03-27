import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Product {
  id: number; // Đổi id thành number
  name: string;
  expect: number;
  actual: number;
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
    addProduct: (state, action: PayloadAction<Product>) => {
      state.products.push(action.payload);
    },
    updateProductActual: (state, action) => {
      const { productId, actual } = action.payload;
      const product = state.products.find((p) => p.id === productId);
      if (product) {
        product.actual = actual; // Cập nhật số lượng mới
      }
    },
    
  },
});

export const { setProducts, addProduct, updateProductActual } = productSlice.actions;
export default productSlice.reducer;

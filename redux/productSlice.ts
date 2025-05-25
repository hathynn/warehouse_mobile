import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Product {
  id: string;
  name: string;
  expect: number;
  actual: number;
  importOrderId: string; 
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
    updateProduct: (state, action: PayloadAction<{ id: string; actual: number }>) => { // Sửa lại id: number
      const product = state.products.find(p => p.id === action.payload.id);
      if (product) {
        product.actual = action.payload.actual;
      }
    },
    updateActual: (state, action: PayloadAction<{ id: string; actual: number }>) => {
      const product = state.products.find((p) => p.id === action.payload.id);
      if (product) {
        product.actual = action.payload.actual;
      }
    },
  },
});

export const { setProducts, addProduct, updateProductActual, updateProduct, updateActual } = productSlice.actions;
export default productSlice.reducer;

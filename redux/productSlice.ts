import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Location {
  zone: string;
  floor: string;
  row: string;
  batch: string;
}

interface Product {
  id: string;
  name: string;
  expect: number;
  actual: number;
  location?: Location | null; // Sửa location thành object
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
      action: PayloadAction<{ productId: string; location: Location }>
    ) => {
      const product = state.products.find((p) => p.id === action.payload.productId);
      if (product) {
        product.location = action.payload.location;
      }
    },
    addProduct: (state, action: PayloadAction<Product>) => {
      state.products.push(action.payload);
    },
    updateProductActual: (
      state,
      action: PayloadAction<{ productId: string; actual: number }>
    ) => {
      const product = state.products.find((p) => p.id === action.payload.productId);
      if (product) {
        product.actual = action.payload.actual;
      }
    },
    
  },
});

export const { setProducts, setProductLocation, addProduct, updateProductActual } = productSlice.actions;
export default productSlice.reducer;

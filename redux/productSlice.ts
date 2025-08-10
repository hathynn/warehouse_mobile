import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Product {
  id: string; // itemId
  name: string;
  expect: number;
  actual: number;
  importOrderId: string;
  inventoryItemId: string | null; // Có thể null
  importOrderDetailId: number; // Thêm field này để mapping
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
        product.actual = actual;
      }
    },
    updateProduct: (state, action: PayloadAction<{ id: string; actual: number }>) => {
      const product = state.products.find(p => p.id === action.payload.id);
      if (product) {
        product.actual = action.payload.actual;
      }
    },
    // Thêm reducer để update bằng inventoryItemId (với kiểm tra null)
    updateProductByInventoryId: (state, action: PayloadAction<{ inventoryItemId: string; actual: number }>) => {
      const product = state.products.find(p => 
        p.inventoryItemId !== null && p.inventoryItemId === action.payload.inventoryItemId
      );
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

export const { 
  setProducts, 
  addProduct, 
  updateProductActual, 
  updateProduct, 
  updateProductByInventoryId, // Export reducer mới
  updateActual 
} = productSlice.actions;
export default productSlice.reducer;
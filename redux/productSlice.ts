import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Product {
  id: string;
  name: string;
  expect: number;
  actual: number;
  importOrderId: string;
  inventoryItemId: string | null;
  importOrderDetailId: number;
  measurementValue: number | 0;
  expectMeasurementValue: number | 0;
  actualMeasurementValue?: number | 0;
  measurementUnit?: string;
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

    // updateActual: (state, action: PayloadAction<{ id: string; actual: number }>) => {
    //   const product = state.products.find((p) => p.id === action.payload.id);

    // Thêm reducer để update bằng inventoryItemId (với measurementValue)
   updateProductByInventoryId: (state, action: PayloadAction<{ inventoryItemId: string; measurementValue: number }>) => {
  const product = state.products.find(p => 
    p.inventoryItemId !== null && p.inventoryItemId === action.payload.inventoryItemId
  );
  if (product) {
    // Chỉ cập nhật measurementValue, không động vào actual
    product.measurementValue = action.payload.measurementValue;
  }
},
    updateActual: (state, action: PayloadAction<{ 
      id: string; 
      actual?: number; 
      actualMeasurementValue?: number;
      inventoryItemId?: string;
    }>) => {
      console.log(`🔄 Redux updateActual - Looking for product ID: ${action.payload.id}, inventoryItemId: ${action.payload.inventoryItemId}`);
      
      let product;
      // Nếu có inventoryItemId, tìm theo inventoryItemId
      if (action.payload.inventoryItemId) {
        product = state.products.find((p) => p.inventoryItemId === action.payload.inventoryItemId);
        console.log(`🔍 Searching by inventoryItemId: ${action.payload.inventoryItemId}`);
      } else {
        // Ngược lại tìm theo id như cũ
        product = state.products.find((p) => p.id === action.payload.id);
        console.log(`🔍 Searching by productId: ${action.payload.id}`);
      }
      

      if (product) {
        console.log(`✅ Found product: ${product.name}, inventoryItemId: ${product.inventoryItemId}`);
        if (action.payload.actual !== undefined) {
          product.actual = action.payload.actual;
          console.log(`📊 Updated actual quantity to: ${action.payload.actual}`);
        }
        if (action.payload.actualMeasurementValue !== undefined) {
          product.actualMeasurementValue = action.payload.actualMeasurementValue;
          console.log(`📏 Updated actualMeasurementValue to: ${action.payload.actualMeasurementValue}`);
        }
      } else {
        console.warn(`❌ Product not found - ID: ${action.payload.id}, inventoryItemId: ${action.payload.inventoryItemId}`);
      }
    },
  },
});

export const { setProducts, addProduct, updateProductActual, updateProduct, updateActual } = productSlice.actions;
export default productSlice.reducer;

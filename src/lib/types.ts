export interface Commodity {
  id: string;
  name: string;
  unit: string;
  category_id?: string;
  sort_order?: number;
}

export interface PricePoint {
  commodity_id: string;
  region_id: number;
  date: string; // YYYY-MM-DD
  price: number;
  source: "bi_hargapangan" | "manual" | "nota_ocr";
  is_filled: boolean;
}

export interface RecipeItem {
  commodity_id: string;
  name: string;
  batch_qty: number; // e.g. 2.0 kg
  unit: string; // e.g. "kg"
}

export interface FixedCost {
  label: string;
  amount: number; // Rupiah per porsi (e.g. 1200 for gas + kemasan)
}

export interface MenuItem {
  id: string;
  name: string;
  sell_price: number; // Harga jual di banner
  batch_yield: number; // Sekali masak jadi berapa porsi (e.g. 8)
  recipe: RecipeItem[];
  fixed_costs: FixedCost[];
  category?: string;
}

export interface DriverResult {
  name: string;
  pct: number; // persentase kenaikan harga komoditas (%)
  rp: number; // kontribusi rupiah per porsi (Rp)
  now: number;
  then: number;
}

export interface MarginCalculation {
  hpp: number;
  margin_pct: number;
  profit_rp: number;
  lines: Array<{
    name: string;
    batch_qty: number | null;
    qty_per_portion: number | null;
    unit_price: number | null;
    subtotal: number;
    is_filled: boolean;
  }>;
  missing_prices: string[];
  filled_prices: string[];
  driver: DriverResult | null;
  biggest_pct: DriverResult | null;
  severity: "critical" | "warning" | "info" | "safe";
  suggested_price: number;
  margin_drop_points: number;
}

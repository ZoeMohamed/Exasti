export type MenuStatus = "sehat" | "tipis" | "rugi" | "diistirahatkan";

export type Menu = {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  price: number;
  modal: number;
  profit: number;
  margin: number;
  status: MenuStatus;
  driver: string;
  servingsPerWeek: number;
  category: string;
};

export type Ingredient = {
  name: string;
  quantity: string;
  unitPrice: number;
  cost: number;
  source: "DATA PASAR" | "HARGA KAMU" | "PERKIRAAN";
  /** Kalimat penjelas di bawah lencana, mis. "harga notamu, digerakkan ikut pasar"
   *  atau penanda forward-fill "memakai harga 2026-09-09" (FR-25, FR-27). */
  sourceNote?: string;
};

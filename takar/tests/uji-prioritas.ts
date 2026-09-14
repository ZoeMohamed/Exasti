import assert from "node:assert/strict";
import { bandingkanPrioritasMenu, dampakMingguan } from "../lib/priority";
import type { Menu } from "../types/menu";

function menu(name: string, profit: number, volume: number, profitRate: number): Menu {
  return {
    id: name,
    name,
    shortName: name,
    icon: "",
    price: 0,
    modal: 0,
    profit,
    profitRate,
    status: profit < 0 ? "rugi" : "tipis",
    driver: "",
    servingsPerWeek: volume,
    category: "",
  };
}

assert.equal(dampakMingguan(1260, 150), 189000);
assert.equal(dampakMingguan(-340, 5), -1700);
assert.equal(dampakMingguan(100, 0), null);

const urut = [
  menu("Telur Balado", -340, 5, -3),
  menu("Ayam Geprek", 1260, 150, 7),
].sort(bandingkanPrioritasMenu);
assert.equal(urut[0]?.name, "Ayam Geprek");

console.log("✓ prioritas memakai dampak rupiah mingguan dan menandai volume kosong");

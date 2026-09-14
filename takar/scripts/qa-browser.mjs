import { mkdir, readFile, writeFile } from "node:fs/promises";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const cdpPort = process.env.QA_CDP_PORT || "9223";
const outputDir = process.env.QA_OUTPUT_DIR || "/tmp/takar-browser-qa";
const registerFirst = process.env.QA_REGISTER === "1";
if (!email || !password) throw new Error("QA_EMAIL dan QA_PASSWORD wajib diisi.");
await mkdir(outputDir, { recursive: true });

const target = await fetch(`http://127.0.0.1:${cdpPort}/json/new?${encodeURIComponent(`${baseUrl}/login`)}`, { method: "PUT" }).then((r) => r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
const consoleEntries = [];
const networkErrors = [];
const pageTimings = [];
socket.addEventListener("message", (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    return;
  }
  if (message.method === "Runtime.consoleAPICalled") {
    consoleEntries.push({ type: message.params.type, text: message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ") });
  }
  if (message.method === "Log.entryAdded") consoleEntries.push({ type: message.params.entry.level, text: message.params.entry.text });
  if (message.method === "Network.loadingFailed") networkErrors.push({ url: message.params.requestId, error: message.params.errorText });
  if (message.method === "Network.responseReceived" && message.params.response.status >= 400) {
    networkErrors.push({ url: message.params.response.url, status: message.params.response.status });
  }
});

function command(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(expression, label, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`Timeout: ${label}`);
}

async function screenshot(name) {
  const image = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, fromSurface: true });
  await writeFile(`${outputDir}/${name}.png`, Buffer.from(image.data, "base64"));
}

async function captureTiming(label) {
  const timing = await evaluate(`(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return nav ? {
      responseStart: Math.round(nav.responseStart),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      complete: Math.round(nav.duration),
      contentReady: Math.round(performance.now()),
    } : null;
  })()`);
  pageTimings.push({ label, ...timing });
}

const setInput = (selector, value, index = 0) => evaluate(`(() => {
  const el = document.querySelectorAll(${JSON.stringify(selector)})[${index}];
  if (!el) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
  setter.call(el, ${JSON.stringify(String(value))});
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
})()`);

await Promise.all([command("Page.enable"), command("Runtime.enable"), command("Network.enable"), command("Log.enable")]);
await command("Network.clearBrowserCookies");
await command("Page.navigate", { url: `${baseUrl}/login` });
await waitFor("document.readyState === 'complete' && (document.querySelector('form') !== null || location.pathname === '/dashboard')", "halaman login");
await screenshot("00-login");
await evaluate("console.error('TAKAR_QA_CONSOLE_PROBE')");
await waitFor("true", "probe", 200);
if (!consoleEntries.some((entry) => entry.text.includes("TAKAR_QA_CONSOLE_PROBE"))) throw new Error("Penangkap konsol tidak menangkap probe.");
consoleEntries.length = 0;

if (registerFirst && await evaluate("document.querySelector('form') !== null")) {
  await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent.includes('Belum punya akun'))?.click(); true");
  await waitFor("document.body?.textContent.includes('Buat akun Takar') === true", "mode daftar");
  await setInput("form input", email, 0);
  await setInput("form input", password, 1);
  await evaluate("document.querySelector('form').requestSubmit(); true");
  await waitFor("location.pathname === '/dashboard'", "daftar langsung ke dashboard", 30000);
} else if (await evaluate("document.querySelector('form') !== null")) {
  await setInput("form input", email, 0);
  await setInput("form input", password, 1);
  await evaluate("document.querySelector('form').requestSubmit(); true");
  await waitFor("location.pathname === '/dashboard'", "login", 20000);
}

await waitFor("!document.querySelector('.animate-pulse') && document.querySelector('main')?.textContent.includes('Ringkasan Warung Hari Ini')", "dashboard lengkap", 20000);
await captureTiming("dashboard-akun-kosong");
await screenshot("00-dashboard");

await command("Page.navigate", { url: `${baseUrl}/dashboard/menu/tambah` });
await waitFor("document.querySelector('input[role=combobox]') !== null", "form tambah menu", 20000);
await captureTiming("tambah-menu");
const bahanResponse = await evaluate("fetch('/api/bahan').then(async r => ({ status: r.status, body: await r.json() }))");
if (bahanResponse.status !== 200 || !bahanResponse.body.saranUmum?.length) throw new Error(`API bahan gagal: ${JSON.stringify(bahanResponse)}`);
await screenshot("01-form-kosong");

await setInput("input[name='batchYield']", "");
await waitFor("document.querySelector(\"input[name='batchYield']\")?.value === ''", "jumlah porsi dapat dikosongkan saat diedit");
if (!await evaluate("document.querySelector(\"input[name='batchYield']\")?.validity.valueMissing === true")) throw new Error("Jumlah porsi kosong tidak ditandai wajib diisi.");
await setInput("input[name='batchYield']", 12);
await waitFor("document.querySelector(\"input[name='batchYield']\")?.value === '12'", "jumlah porsi dapat diganti tanpa nol di depan");

const menuName = `Uji Saus QA ${Date.now()}`;
await setInput("form > div input", menuName, 0);
await setInput("form > div input", 18000, 1);
await setInput("form > div input", 8, 2);
await setInput("form > div input", 1, 3);
await setInput("input[role=combobox]", "saus sambal", 0);
await delay(300);
const searchState = await evaluate("({ value: document.querySelector('input[role=combobox]').value, buttons: [...document.querySelectorAll('[role=listbox] button')].map(b => b.textContent.trim()), pageError: document.querySelector('[role=alert]')?.textContent || '' })");
console.log(JSON.stringify({ searchState }));
await waitFor("[...document.querySelectorAll('[role=listbox] button')].some(b => b.textContent.includes('Saus sambal'))", "saran saus sambal");
await evaluate("[...document.querySelectorAll('[role=listbox] button')].find(b => b.textContent.includes('Saus sambal')).click(); true");
await waitFor("document.querySelector('article') !== null", "kartu saus");
await evaluate("[...document.querySelectorAll('article button')].find(b => b.textContent.includes('Satu kemasan'))?.click(); true");
await delay(100);
await evaluate("[...document.querySelectorAll('article button')].find(b => b.textContent.includes('Perbarui harga') || b.textContent.includes('Harga belanjaku berbeda'))?.click(); true");
await waitFor("document.querySelectorAll('article input[type=number]').length >= 2 && document.querySelector('article input[inputmode=numeric]') !== null", "isian saus lengkap");

for (const [index, value] of [[0, 340], [1, 25]]) {
  await setInput("article input[type=number]", value, index);
  await delay(120);
}
await setInput("article input[inputmode=numeric]", 12500, 0);
await delay(120);
await waitFor("document.querySelector('article').textContent.includes('Rp 500')", "modal saus Rp500");

await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Tambah kemasan grosir'))?.click(); true");
await waitFor("document.querySelector('input[placeholder*=" + JSON.stringify("kotak nasi") + "]') !== null", "isian kemasan grosir");
await setInput("input[placeholder*='kotak nasi']", "Kertas bungkus", 0);
await setInput("input[placeholder='28000']", 28000, 0);
await setInput("input[placeholder='500']", 500, 0);
await waitFor("[...document.querySelectorAll('article')].some(el => el.textContent.includes('Rp 56'))", "kemasan grosir Rp56");
await screenshot("02-saus-500-per-porsi");

await evaluate("document.querySelector('form').requestSubmit(); true");
await waitFor("location.pathname === '/dashboard/menu'", "menu tersimpan", 25000);
await waitFor(`document.body?.textContent.includes(${JSON.stringify(menuName)}) === true`, "menu tampil di daftar", 20000);
const detailHref = await evaluate(`(() => [...document.querySelectorAll('a')].find(a => a.textContent.includes(${JSON.stringify(menuName)}))?.getAttribute('href') || '')()`);
if (!detailHref) throw new Error("Tautan menu uji tidak ditemukan.");
const menuId = detailHref.split("/").filter(Boolean).at(-1);

await command("Page.navigate", { url: `${baseUrl}${detailHref}` });
await waitFor("!document.querySelector('.animate-pulse') && [...document.querySelectorAll('main *')].some(el => el.children.length === 0 && el.textContent.includes('HARGA KAMU')) && document.querySelector('main')?.textContent.includes('Rp 500')", "detail harga pemilik Rp500", 20000);
await screenshot("03-detail-harga-kamu");

await command("Page.navigate", { url: `${baseUrl}/dashboard/menu/${menuId}/edit` });
await waitFor(`location.pathname === '/dashboard/menu/${menuId}/edit' && document.querySelectorAll('article input[type=number]').length >= 2 && document.querySelector('article')?.textContent.includes('Modal bahan ini per porsi')`, "edit resep lengkap", 20000);
const editValues = await evaluate("[...document.querySelectorAll('article')][0] ? [...document.querySelectorAll('article')[0].querySelectorAll('input[type=number]')].map(el => el.value) : []");
if (editValues[0] !== "340" || editValues[1] !== "25") throw new Error(`Takaran asli tidak kembali: ${editValues.join(',')}`);
const editPackagePrice = await evaluate("document.querySelector('article input[inputmode=numeric]')?.value || ''");
if (editPackagePrice !== "12.500") throw new Error(`Harga kemasan berubah saat edit: ${editPackagePrice}`);
await delay(600);
await screenshot("04-edit-takaran-asli");

await command("Page.navigate", { url: `${baseUrl}/dashboard` });
await waitFor(`!document.querySelector('.animate-pulse') && [...document.querySelectorAll('main a')].some(el => el.textContent.includes(${JSON.stringify(menuName)}))`, "dashboard berisi menu", 20000);
await captureTiming("dashboard-berisi-menu");
await screenshot("05-dashboard-berisi-menu");

await command("Page.navigate", { url: `${baseUrl}/dashboard/simulator` });
await waitFor(`document.body?.textContent.includes(${JSON.stringify(menuName)}) === true && !document.body?.textContent.includes('Menyiapkan resep menu')`, "simulator lengkap", 25000);
if (await evaluate("document.querySelector('select')?.value === ''")) throw new Error("Pilihan simulator masih kosong walau menu tersedia.");
await captureTiming("simulator");
await screenshot("06-simulator");

await command("Page.navigate", { url: `${baseUrl}/dashboard/pengaturan` });
await waitFor("document.querySelector('form input') !== null && !document.body?.textContent.includes('Menyiapkan data warung')", "pengaturan lengkap", 20000);
await evaluate("document.querySelector('form').requestSubmit(); true");
await waitFor("document.body?.textContent.includes('Pengaturan warung berhasil disimpan') === true", "simpan pengaturan", 20000);
await captureTiming("pengaturan");
await screenshot("07-pengaturan");

await command("Page.navigate", { url: `${baseUrl}/dashboard/belanja` });
await waitFor("location.pathname === '/dashboard/belanja' && [...document.querySelectorAll('span')].some(el => /[1-9][0-9]* bahan siap dipakai/.test(el.textContent || '')) && !document.body?.textContent.includes('Menyiapkan riwayat belanja')", "halaman catat belanja lengkap", 25000);
await captureTiming("catat-belanja");
await screenshot("08-catat-belanja");

const corruptImageStatus = await evaluate("fetch('/api/ai/parse-nota', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ imageBase64: btoa('bukan gambar'), mimeType: 'image/png' }) }).then(async r => ({ status: r.status, body: await r.json() }))");
if (corruptImageStatus.status !== 415 || corruptImageStatus.body.items?.length) throw new Error(`Berkas rusak tidak ditolak: ${JSON.stringify(corruptImageStatus)}`);

const sampleOcr = await evaluate("fetch('/api/ai/parse-nota', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sampleId: 'toko-sembako' }) }).then(async r => ({ status: r.status, body: await r.json() }))");
const sampleBimoli = sampleOcr.body.items?.find(item => item.nameRaw.includes('Bimoli'));
if (sampleOcr.status !== 200 || sampleBimoli?.match?.matchedName !== "Minyak Goreng Kemasan Bermerk 1" || sampleBimoli?.match?.pricePerUnit !== 19000) {
  throw new Error(`Contoh nota atau pencocokan Bimoli salah: ${JSON.stringify(sampleOcr)}`);
}

const loginScreenshot = (await readFile(`${outputDir}/00-login.png`)).toString("base64");
const nonReceiptResult = await evaluate(`fetch('/api/ai/parse-nota', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ imageBase64: ${JSON.stringify(loginScreenshot)}, mimeType: 'image/png' }) }).then(async r => ({ status: r.status, body: await r.json() }))`);
if (nonReceiptResult.status !== 422 || nonReceiptResult.body.success !== false || nonReceiptResult.body.items?.length || nonReceiptResult.body.source === "error") {
  throw new Error(`Tangkapan layar bukan nota tidak ditolak: ${JSON.stringify(nonReceiptResult)}`);
}

await command("Page.navigate", { url: `${baseUrl}/halaman-yang-tidak-ada` });
await waitFor("document.body?.textContent.includes('Halaman ini tidak tersedia') === true", "404 ramah", 15000);
await captureTiming("halaman-tidak-ada");
await screenshot("09-not-found");

await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await command("Page.navigate", { url: `${baseUrl}/dashboard/menu/tambah` });
await waitFor("location.pathname === '/dashboard/menu/tambah' && document.querySelector('input[role=combobox]') !== null", "form ponsel", 20000);
await delay(400);
if (!await evaluate("document.querySelector('nav a[aria-current=page]') !== null")) throw new Error("Navigasi ponsel tidak menandai halaman aktif.");
await screenshot("10-form-ponsel");
await command("Page.navigate", { url: `${baseUrl}/dashboard/belanja` });
await waitFor("location.pathname === '/dashboard/belanja' && [...document.querySelectorAll('span')].some(el => /[1-9][0-9]* bahan siap dipakai/.test(el.textContent || ''))", "catat belanja ponsel", 25000);
await delay(400);
await screenshot("11-belanja-ponsel");
await command("Emulation.clearDeviceMetricsOverride");
const uiConsole = consoleEntries.filter((entry) =>
  (entry.type === "error" || entry.type === "warning") &&
  !/status (code )?(404|415|422)|status of (404|415|422)/i.test(entry.text),
);
const uiNetwork = networkErrors.filter((entry) =>
  ![404, 415, 422].includes(entry.status) && entry.error !== "net::ERR_ABORTED",
);
consoleEntries.length = 0;
networkErrors.length = 0;

const duplicateStatus = await evaluate(`fetch('/api/menus', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({
  name: 'Tidak boleh tersimpan', sellPrice: 18000, batchYield: 8,
  recipe: [
    { bahan: { jenis: 'pasar', id: 'Daging Ayam Ras Segar' }, pemakaian: { cara: 'per_masak', jumlah: 1, satuan: 'kg' } },
    { bahan: { jenis: 'pasar', id: 'Daging Ayam Ras Segar' }, pemakaian: { cara: 'per_masak', jumlah: 1, satuan: 'kg' } }
  ]
}) }).then(async r => ({ status: r.status, body: await r.json() }))`);
if (duplicateStatus.status !== 422 || duplicateStatus.body.keberatan?.[0]?.indeks !== 1) throw new Error(`Uji duplikat gagal: ${JSON.stringify(duplicateStatus)}`);

const wrongUnitStatus = await evaluate(`fetch('/api/menus', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({
  name: 'Tidak boleh tersimpan 2', sellPrice: 18000, batchYield: 8,
  recipe: [{ bahan: { jenis: 'baru', nama: 'Saus Uji Salah', satuanDasar: 'kg' }, pemakaian: { cara: 'per_kemasan', isi: 340, satuan: 'kg', porsi: 25 }, harga: { hargaKemasan: 12500, isi: 340, satuan: 'kg' } }]
}) }).then(async r => ({ status: r.status, body: await r.json() }))`);
if (wrongUnitStatus.status !== 422) throw new Error(`Uji salah satuan gagal: ${JSON.stringify(wrongUnitStatus)}`);

const unknownPriceStatus = await evaluate(`fetch('/api/prices', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: [{ commodity_id: 'tidak-ada', price: 12345 }] }) }).then(r => r.status)`);
if (unknownPriceStatus !== 422) throw new Error(`Harga yatim tidak ditolak: ${unknownPriceStatus}`);

const legacyResult = await evaluate(`fetch('/api/menus', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({
  name: ${JSON.stringify(`Uji Bentuk Lama ${Date.now()}`)}, sellPrice: 18000, batchYield: 8,
  recipe: [{ commodityId: 'Daging Ayam Ras Segar', batchQty: 0.1 }]
}) }).then(async r => ({ status: r.status, body: await r.json() }))`);
if (legacyResult.status !== 200 || !legacyResult.body.menuId) throw new Error(`Bentuk API lama gagal: ${JSON.stringify(legacyResult)}`);
const legacyDeleted = await evaluate(`fetch('/api/menus/${legacyResult.body.menuId}', { method: 'DELETE' }).then(r => r.ok)`);
if (!legacyDeleted) throw new Error("Menu uji bentuk lama tidak berhasil dibersihkan.");

await command("Emulation.clearDeviceMetricsOverride");
await command("Page.navigate", { url: `${baseUrl}/dashboard/menu/${menuId}` });
await waitFor("document.body?.textContent.includes('Hapus menu') === true", "tombol hapus menu", 20000);
// Teks server dapat tampil sesaat sebelum JavaScript tombol selesai aktif di
// koneksi production. Tunggu hidrasi sebelum mensimulasikan klik manusia.
await delay(700);
await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Hapus menu')?.click(); true");
await waitFor("document.body?.textContent.includes('Ya, hapus permanen') === true", "konfirmasi hapus");
await evaluate("[...document.querySelectorAll('button')].find(b => b.textContent.includes('Ya, hapus permanen'))?.click(); true");
await waitFor("location.pathname === '/dashboard/menu'", "menu dihapus lewat antarmuka", 20000);
await waitFor(`document.body?.textContent.includes(${JSON.stringify(menuName)}) === false`, "daftar segar sesudah hapus", 20000);
const deleted = true;

const badConsole = consoleEntries.filter((entry) => (entry.type === "error" || entry.type === "warning") && !entry.text.includes("status of 422"));
const badNetwork = networkErrors.filter((entry) => ![404, 415, 422].includes(entry.status) && entry.error !== "net::ERR_ABORTED");
const report = { menuName, menuId, editValues, editPackagePrice, corruptImageStatus: corruptImageStatus.status, sampleOcrStatus: sampleOcr.status, nonReceiptStatus: nonReceiptResult.status, duplicateStatus: duplicateStatus.status, wrongUnitStatus: wrongUnitStatus.status, unknownPriceStatus, legacyStatus: legacyResult.status, legacyDeleted, deleted, pageTimings, uiConsole, uiNetwork, postValidationConsole: badConsole, postValidationNetwork: badNetwork, screenshots: ["00-login.png", "00-dashboard.png", "01-form-kosong.png", "02-saus-500-per-porsi.png", "03-detail-harga-kamu.png", "04-edit-takaran-asli.png", "05-dashboard-berisi-menu.png", "06-simulator.png", "07-pengaturan.png", "08-catat-belanja.png", "09-not-found.png", "10-form-ponsel.png", "11-belanja-ponsel.png"] };
console.log(JSON.stringify(report, null, 2));
socket.close();

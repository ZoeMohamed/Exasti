import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
const email = process.env.QA_EMAIL;
const password = process.env.QA_PASSWORD;
const cdpPort = process.env.QA_CDP_PORT || "9223";
const outputDir = process.env.QA_OUTPUT_DIR || "/tmp/takar-browser-qa";
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
await evaluate("console.error('TAKAR_QA_CONSOLE_PROBE')");
await waitFor("true", "probe", 200);
if (!consoleEntries.some((entry) => entry.text.includes("TAKAR_QA_CONSOLE_PROBE"))) throw new Error("Penangkap konsol tidak menangkap probe.");
consoleEntries.length = 0;

if (await evaluate("document.querySelector('form') !== null")) {
  await setInput("form input", email, 0);
  await setInput("form input", password, 1);
  await evaluate("document.querySelector('form').requestSubmit(); true");
  await waitFor("location.pathname === '/dashboard'", "login", 20000);
}

await command("Page.navigate", { url: `${baseUrl}/dashboard/menu/tambah` });
await waitFor("document.querySelector('input[role=combobox]') !== null", "form tambah menu", 20000);
const bahanResponse = await evaluate("fetch('/api/bahan').then(async r => ({ status: r.status, body: await r.json() }))");
if (bahanResponse.status !== 200 || !bahanResponse.body.saranUmum?.length) throw new Error(`API bahan gagal: ${JSON.stringify(bahanResponse)}`);
await screenshot("01-form-kosong");

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
await delay(150);
await evaluate("[...document.querySelectorAll('article button')].find(b => b.textContent.includes('Perbarui harga'))?.click(); true");
await waitFor("document.querySelectorAll('article input[type=number]').length === 4", "isian saus lengkap");

for (const [index, value] of [[0, 340], [1, 25], [2, 12500], [3, 340]]) {
  await setInput("article input[type=number]", value, index);
  await delay(120);
}
await waitFor("document.querySelector('article').textContent.includes('Rp 500')", "modal saus Rp500");
await screenshot("02-saus-500-per-porsi");

await evaluate("document.querySelector('form').requestSubmit(); true");
await waitFor("location.pathname === '/dashboard/menu'", "menu tersimpan", 25000);
await waitFor(`document.body?.textContent.includes(${JSON.stringify(menuName)}) === true`, "menu tampil di daftar", 20000);
const detailHref = await evaluate(`(() => [...document.querySelectorAll('a')].find(a => a.textContent.includes(${JSON.stringify(menuName)}))?.getAttribute('href') || '')()`);
if (!detailHref) throw new Error("Tautan menu uji tidak ditemukan.");
const menuId = detailHref.split("/").filter(Boolean).at(-1);

await command("Page.navigate", { url: `${baseUrl}${detailHref}` });
await waitFor("document.body?.textContent.includes('HARGA KAMU') === true", "label harga pemilik", 20000);
const detailText = await evaluate("document.body.innerText");
if (!detailText.includes("Rp 500")) throw new Error("Detail tidak menampilkan modal saus Rp500.");
await screenshot("03-detail-harga-kamu");

await command("Page.navigate", { url: `${baseUrl}/dashboard/menu/${menuId}/edit` });
await waitFor(`location.pathname === '/dashboard/menu/${menuId}/edit' && document.querySelectorAll('article input[type=number]').length >= 4`, "edit resep lengkap", 20000);
const editValues = await evaluate("[...document.querySelectorAll('article input[type=number]')].map(el => el.value)");
if (editValues[0] !== "340" || editValues[1] !== "25") throw new Error(`Takaran asli tidak kembali: ${editValues.join(',')}`);
await screenshot("04-edit-takaran-asli");

await command("Page.navigate", { url: `${baseUrl}/dashboard/belanja` });
await waitFor("location.pathname === '/dashboard/belanja' && [...document.querySelectorAll('span')].some(el => /[1-9][0-9]* bahan siap dipakai/.test(el.textContent || '')) && !document.body?.textContent.includes('Menyiapkan riwayat belanja')", "halaman catat belanja lengkap", 25000);
await screenshot("05-catat-belanja");
const uiConsole = consoleEntries.filter((entry) => entry.type === "error" || entry.type === "warning");
const uiNetwork = networkErrors.filter((entry) => entry.error !== "net::ERR_ABORTED");
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

const deleted = await evaluate(`fetch('/api/menus/${menuId}', { method: 'DELETE' }).then(r => r.ok)`);
if (!deleted) throw new Error("Menu uji tidak berhasil dibersihkan.");

const badConsole = consoleEntries.filter((entry) => (entry.type === "error" || entry.type === "warning") && !entry.text.includes("status of 422"));
const badNetwork = networkErrors.filter((entry) => entry.status !== 422 && entry.error !== "net::ERR_ABORTED");
const report = { menuName, menuId, editValues, duplicateStatus: duplicateStatus.status, wrongUnitStatus: wrongUnitStatus.status, unknownPriceStatus, legacyStatus: legacyResult.status, legacyDeleted, deleted, uiConsole, uiNetwork, postValidationConsole: badConsole, postValidationNetwork: badNetwork, screenshots: ["01-form-kosong.png", "02-saus-500-per-porsi.png", "03-detail-harga-kamu.png", "04-edit-takaran-asli.png", "05-catat-belanja.png"] };
console.log(JSON.stringify(report, null, 2));
socket.close();

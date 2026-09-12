"use client";

export default function SettingsPage() {
  return (
    <div className="bg-white p-6 sm:p-8 brutal-card">
      <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
        Pengaturan Warung
      </h1>
      <p className="mt-1 text-ink/80">
        Sesuaikan profil warung dan parameter biaya otomatis.
      </p>
      <form className="mt-8 max-w-2xl space-y-6">
        <label className="block font-heading text-sm font-bold">
          Nama Warung
          <input
            defaultValue="Warung Bu Krisna"
            className="mt-1 w-full bg-cream p-3 brutal-border-2"
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="font-heading text-sm font-bold">
            Kota / Kabupaten
            <select className="mt-1 w-full bg-cream p-3 font-mono brutal-border-2">
              <option>Kota Semarang</option>
              <option>Kab. Sleman</option>
            </select>
          </label>
          <label className="font-heading text-sm font-bold">
            Jenis Warung
            <select className="mt-1 w-full bg-cream p-3 brutal-border-2">
              <option>Warung Ayam Geprek & Sambal</option>
              <option>Warteg / Nasi Rames</option>
            </select>
          </label>
        </div>
        <fieldset>
          <legend className="mb-2 font-heading text-sm font-bold">
            Kebiasaan Pembeli Terbanyak:
          </legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {["Makan di Tempat", "Bungkus (Takeaway)", "Campur 50:50"].map(
              (item, index) => (
                <label
                  key={item}
                  className={`p-3 text-center text-xs font-heading font-bold brutal-border-2 ${index === 1 ? "bg-warning-yellow" : "bg-white"}`}
                >
                  <input
                    type="radio"
                    name="serving"
                    defaultChecked={index === 1}
                    className="mr-1"
                  />
                  {item}
                </label>
              ),
            )}
          </div>
        </fieldset>
        <div className="bg-cream p-4 font-mono text-xs brutal-border-2">
          <b>STATUS DATA PASAR: </b>
          <span className="bg-bright-green px-2 py-0.5 border border-ink">
            TERHUBUNG AKTIF
          </span>
          <p className="mt-2">Terakhir diperbarui: Hari ini, 06:00 WIB.</p>
        </div>
        <button
          type="submit"
          className="brutal-btn bg-ink px-6 py-3 font-heading font-extrabold text-cream"
        >
          Simpan Pengaturan
        </button>
      </form>
    </div>
  );
}

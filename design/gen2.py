from pathlib import Path
exec(open('gen.py').read().split('# ══ S1')[0])   # pakai ulang HEAD/TAIL/ico/konstanta

# ══ S5 · Hasil pertama — Main ══
write('Main.dc.html', f'''<div style="{SHELL}; justify-content: center; padding-top: 48px">
  <div style="font-size: 17px; font-weight: 600; {MUTED}">Ayam Geprek</div>
  <div style="height: 36px"></div>
  <div style="font-size: 19px; font-weight: 500">Untungmu</div>
  <div style="height: 6px"></div>
  <div style="font-size: 64px; font-weight: 700; letter-spacing: -0.035em; line-height: 1">Rp 3.085</div>
  <div style="height: 6px"></div>
  <div style="font-size: 19px; {MUTED}">per porsi</div>
  <div style="height: 32px"></div>
  <div style="display: flex; gap: 28px; font-size: 16px">
    <div><span style="{MUTED}">Modal</span> <span style="font-weight: 500">Rp 14.915</span></div>
    <div><span style="{MUTED}">Jual</span> <span style="font-weight: 500">Rp 18.000</span></div>
  </div>
  <div style="height: 28px"></div>
  <div style="border-top: 1.5px solid #E7E5E4; padding-top: 18px;
              display: flex; flex-direction: column; gap: 10px; font-size: 14px; line-height: 1.5">
    <div style="display: flex; gap: 8px; align-items: flex-start; {MUTED}">
      {ico('check', 16)}<span><span style="color: #1C1917; font-weight: 500">92%</span> harga dari data Bank Indonesia</span>
    </div>
    <div style="display: flex; gap: 8px; align-items: flex-start; {MUTED}">
      {ico('info', 16)}<span>Belum dikurangi sewa dan listrik bulanan</span>
    </div>
  </div>
  <div style="flex-grow: 1; min-height: 28px"></div>
  <div style="display: flex; flex-direction: column; gap: 10px">
    <button style="{BTN}">Tambah menu lain</button>
    <button style="{BTN2}">Nanti saja</button>
  </div>
</div>''')

# ══ S6 · Dashboard ══
def baris(nama, rupiah, persen, bar, status, sub):
    warna = {'warn': AMB, 'ok': GRN}[status]
    lbl = {'warn': 'warn', 'ok': 'check'}[status]
    return f'''<div style="padding: 16px 0; border-bottom: 1px solid #E7E5E4">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px">
        <span style="color: {warna}; display: flex">{ico(lbl, 18)}</span>
        <span style="flex-grow: 1; font-size: 17px; font-weight: 600">{nama}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px">
        <div style="flex-grow: 1; height: 10px; background: #E7E5E4; border-radius: 5px; overflow: hidden">
          <div style="width: {bar}%; height: 100%; background: {warna}; border-radius: 5px"></div>
        </div>
        <div style="font-size: 17px; font-weight: 600; white-space: nowrap">{rupiah}</div>
        <div style="font-size: 14px; {MUTED}; width: 40px; text-align: right">({persen})</div>
      </div>
      <div style="font-size: 14px; {MUTED}; margin-top: 7px">{sub}</div>
    </div>'''

write('Dashboard.dc.html', f'''<div style="{SHELL}; padding-top: 24px">
  <div style="display: flex; align-items: baseline; justify-content: space-between">
    <div style="font-size: 20px; font-weight: 600">Warung Bu Sri</div>
    <div style="font-size: 14px; {MUTED}">12 Sep</div>
  </div>
  <div style="display: flex; gap: 7px; align-items: center; font-size: 13px; color: {GRN}; margin-top: 6px">
    {ico('check', 15, 2.5)}<span>Harga hari ini sudah masuk</span>
  </div>
  <div style="height: 20px"></div>
  {baris('Ayam Geprek', 'Rp 1.260', '7%', 10, 'warn', 'turun dari Rp 3.085')}
  {baris('Nasi Goreng', 'Rp 3.600', '24%', 34, 'ok', 'tetap')}
  {baris('Rendang', 'Rp 6.160', '22%', 31, 'ok', 'tetap')}
  {baris('Es Teh Manis', 'Rp 2.740', '68%', 97, 'ok', 'tetap')}
  <div style="height: 20px"></div>
  <div style="display: flex; gap: 8px; align-items: flex-start; font-size: 13px; line-height: 1.5; {MUTED}">
    {ico('info', 15)}<span>Angka untung belum dikurangi sewa dan listrik bulanan.</span>
  </div>
</div>''')

# ══ S7 · Detail menu ══
def rincian(nama, takaran, harga, tanda=False):
    edit = f'<span style="color: #A8A29E; display: flex">{ico("pencil", 14)}</span>' if tanda else ''
    return f'''<div style="display: flex; align-items: center; gap: 8px; padding: 9px 0; font-size: 15px">
      <span style="flex-grow: 1">{nama}</span>
      <span style="{MUTED}; font-size: 13px">{takaran}</span>
      <span style="font-weight: 500; width: 76px; text-align: right">{harga}</span>{edit}
    </div>'''

spark = ''.join(
    f'<div style="width: 7px; height: {h}px; background: #D6D3D1; border-radius: 1px; align-self: flex-end"></div>'
    for h in [30, 29, 28, 28, 26, 24, 25, 21, 18, 16, 13, 11])

write('DetailMenu.dc.html', f'''<div style="{SHELL}; padding-top: 24px">
  <div style="font-size: 22px; font-weight: 600">Ayam Geprek</div>
  <div style="height: 18px"></div>
  <div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap">
    <span style="font-size: 17px; {MUTED}; text-decoration: line-through">Rp 3.085</span>
    <span style="font-size: 30px; font-weight: 700; letter-spacing: -0.02em; color: {AMB}">Rp 1.260</span>
    <span style="font-size: 15px; {MUTED}">(7%)</span>
  </div>
  <div style="height: 14px"></div>
  <div style="display: flex; gap: 3px; height: 32px">{spark}</div>
  <div style="font-size: 12px; {MUTED}; margin-top: 6px">30 hari terakhir</div>

  <div style="height: 24px"></div>
  <div style="border: 2px solid #1C1917; border-radius: 12px; padding: 18px; background: #FFFFFF">
    <div style="display: flex; gap: 8px; align-items: center; font-size: 13px; font-weight: 600;
                letter-spacing: 0.06em; text-transform: uppercase; color: {AMB}">
      {ico('warn', 15)}<span>Gara-gara</span>
    </div>
    <div style="height: 10px"></div>
    <div style="font-size: 20px; font-weight: 600; line-height: 1.3">Daging ayam naik 20%</div>
    <div style="font-size: 15px; {MUTED}; margin-top: 4px">61% dari modal menu ini</div>
    <div style="height: 16px"></div>
    <div style="border-top: 1px solid #E7E5E4; padding-top: 14px">
      <div style="font-size: 15px; font-weight: 600; margin-bottom: 4px">Bukan cabai</div>
      <div style="font-size: 15px; line-height: 1.5; {MUTED}">
        Cabai memang naik 58%, tapi di menumu cabai cuma 9% modal.</div>
    </div>
  </div>

  <div style="height: 22px"></div>
  <div style="font-size: 15px; line-height: 1.5">Kalau mau untungmu balik seperti dulu:</div>
  <div style="font-size: 26px; font-weight: 700; margin: 6px 0 14px">jual Rp 20.000</div>
  <button style="{BTN}">Ubah harga jual</button>

  <div style="height: 26px"></div>
  <div style="display: flex; align-items: center; gap: 6px; font-size: 16px; font-weight: 600;
              padding-bottom: 6px; border-bottom: 1.5px solid #E7E5E4">
    <span style="flex-grow: 1">Rincian modal</span>{ico('chev', 18)}
  </div>
  {rincian('Ayam', '2 kg → 8 porsi', 'Rp 10.125')}
  {rincian('Beras', '1,2 kg', 'Rp 2.362')}
  {rincian('Cabai rawit', '1 ons', 'Rp 956')}
  {rincian('Bawang merah', '80 gram', 'Rp 325')}
  {rincian('Minyak goreng', '240 ml', 'Rp 645')}
  {rincian('Kemasan', '', 'Rp 386', True)}
  {rincian('Gas, bumbu &amp; listrik', 'perkiraan', 'Rp 500', True)}
  <div style="display: flex; padding: 12px 0 0; border-top: 1.5px solid #E7E5E4;
              font-size: 16px; font-weight: 600">
    <span style="flex-grow: 1">Modal per porsi</span><span>Rp 15.299</span>
  </div>
</div>''')

# ══ S12 · Menu planner ══
def item(nama, rupiah, persen, dampak=None, aksi=None, warna='#1C1917'):
    d = (f'<div style="font-size: 13px; {MUTED}; margin-top: 4px">{dampak}</div>') if dampak else ''
    a = ''
    if aksi:
        a = ('<div style="display: flex; gap: 8px; margin-top: 12px">' + ''.join(
            f'<div style="flex-grow: 1; display: flex; align-items: center; justify-content: center; '
            f'min-height: 44px; border: 1.5px solid #D6D3D1; border-radius: 8px; background: #FFFFFF; '
            f'font-size: 14px; font-weight: 500">{t}</div>' for t in aksi) + '</div>')
    return f'''<div style="padding: 13px 0; border-bottom: 1px solid #E7E5E4">
      <div style="display: flex; align-items: baseline; gap: 10px">
        <span style="flex-grow: 1; font-size: 16px; font-weight: 500">{nama}</span>
        <span style="font-size: 17px; font-weight: 600; color: {warna}">{rupiah}</span>
        <span style="font-size: 13px; {MUTED}; width: 42px; text-align: right">({persen})</span>
      </div>{d}{a}
    </div>'''

def grup(judul, jumlah, warna, ikon, isi):
    return f'''<div style="margin-top: 22px">
      <div style="display: flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600;
                  letter-spacing: 0.08em; text-transform: uppercase; color: {warna}">
        {ico(ikon, 15)}<span>{judul}</span>
        <span style="{MUTED}; font-weight: 500; letter-spacing: 0">· {jumlah} menu</span>
      </div>
      <div style="height: 4px"></div>{isi}
    </div>'''

write('MenuPlanner.dc.html', f'''<div style="{SHELL}; padding-top: 24px">
  <div style="display: flex; align-items: baseline; justify-content: space-between">
    <div style="font-size: 20px; font-weight: 600">Menu Warungmu</div>
    <div style="font-size: 14px; {MUTED}">12 Sep</div>
  </div>
  <div style="font-size: 13px; {MUTED}; margin-top: 6px; line-height: 1.5">
    Diurutkan dari yang paling menggerus untungmu — bukan dari persennya.</div>

  {grup('Rugi', 1, RED, 'down',
    item('Telur Balado', '−Rp 340', '−3%', 'sekitar −Rp 1.700 seminggu', ['jual Rp 12.000', 'istirahatkan'], RED))}

  {grup('Tipis', 2, AMB, 'warn',
    item('Ayam Geprek', 'Rp 1.260', '7%', 'sekitar Rp 189.000 seminggu — paling besar', ['jual Rp 20.000', 'istirahatkan'], AMB)
    + item('Soto', 'Rp 1.100', '9%', 'sekitar Rp 33.000 seminggu', None, AMB))}

  {grup('Sehat', 3, GRN, 'check',
    item('Rendang', 'Rp 6.160', '22%', 'sekitar Rp 61.600 seminggu')
    + item('Nasi Goreng', 'Rp 3.600', '24%', 'sekitar Rp 288.000 seminggu')
    + item('Es Teh Manis', 'Rp 2.740', '68%', 'sekitar Rp 137.000 seminggu'))}

  <div style="height: 20px"></div>
  <div style="padding: 14px; background: #F5F5F4; border-radius: 10px;
              display: flex; gap: 8px; align-items: flex-start">
    <span style="{MUTED}; display: flex">{ico('info', 16)}</span>
    <div style="font-size: 13px; line-height: 1.55; {MUTED}">
      Angka mingguan perkiraan dari jumlah porsi yang kamu sebutkan.
      Belum dikurangi sewa dan listrik bulanan.</div>
  </div>
</div>''')

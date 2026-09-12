from pathlib import Path

HEAD = '''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
  <style>
    body {
      margin: 0;
      font-family: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
      background: #FAFAF9;
      color: #1C1917;
      -webkit-font-smoothing: antialiased;
      font-variant-numeric: tabular-nums;
    }
    a { color: oklch(0.48 0.15 27); text-decoration: none; }
    a:hover { color: oklch(0.40 0.15 27); }
    * { box-sizing: border-box; }
  </style>
</helmet>
'''
TAIL = '''</x-dc>
</body>
</html>
'''

# ── ikon SVG stroke-based, grid 24 ──
def ico(kind, size=18, sw=2):
    p = {
      'warn': '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      'check': '<polyline points="20 6 9 17 4 12"/>',
      'down': '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
      'chev': '<polyline points="6 9 12 15 18 9"/>',
      'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      'search': '<circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.65" y2="16.65"/>',
      'pencil': '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
      'info': '<circle cx="12" cy="12" r="9"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    }[kind]
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="{sw}" stroke-linecap="round" '
            f'stroke-linejoin="round" style="flex-shrink: 0">{p}</svg>')

SHELL = ('display: flex; flex-direction: column; min-height: 100%; '
         'padding: 28px 20px 24px; gap: 0')
H1 = 'margin: 0; font-size: 26px; line-height: 1.25; font-weight: 600; letter-spacing: -0.01em'
MUTED = 'color: #78716C'
BTN = ('display: flex; align-items: center; justify-content: center; min-height: 52px; '
       'border-radius: 10px; font-size: 17px; font-weight: 600; border: none; '
       'background: #1C1917; color: #FAFAF9; width: 100%')
BTN2 = ('display: flex; align-items: center; justify-content: center; min-height: 52px; '
        'border-radius: 10px; font-size: 17px; font-weight: 500; '
        'border: 1.5px solid #D6D3D1; background: transparent; color: #1C1917; width: 100%')
FIELD = ('display: flex; align-items: center; min-height: 56px; padding: 0 16px; '
         'border: 1.5px solid #D6D3D1; border-radius: 10px; background: #FFFFFF; font-size: 18px')
RED = 'oklch(0.48 0.15 27)'
GRN = 'oklch(0.46 0.09 155)'
AMB = 'oklch(0.55 0.12 70)'

def write(name, body):
    Path(name).write_text(HEAD + body + TAIL, encoding='utf-8')
    print(f"  {name}")

# ══ S1 · Daftar warung ══
write('Daftar.dc.html', f'''<div style="{SHELL}">
  <div style="font-size: 13px; font-weight: 600; letter-spacing: 0.08em; {MUTED}; text-transform: uppercase">Takar</div>
  <div style="height: 40px"></div>
  <h1 style="{H1}">Warungmu di mana?</h1>
  <p style="margin: 8px 0 0; font-size: 15px; line-height: 1.5; {MUTED}">
    Harga bahan beda-beda tiap kota.</p>
  <div style="height: 24px"></div>
  <div style="{FIELD}; gap: 10px; color: #78716C">
    {ico('search', 20)}<span style="color: #1C1917">Kota Semarang</span>
  </div>
  <div style="height: 28px"></div>
  <div style="font-size: 15px; font-weight: 500; margin-bottom: 8px">
    Namanya? <span style="{MUTED}; font-weight: 400">— boleh dilewati</span></div>
  <div style="{FIELD}; color: #A8A29E">Warungku</div>
  <div style="flex-grow: 1; min-height: 32px"></div>
  <button style="{BTN}">Lanjut</button>
</div>''')

# ══ S2 · Pilih menu ══
def chip(label, primary=False):
    base = ('display: flex; align-items: center; justify-content: center; min-height: 60px; '
            'border-radius: 10px; font-size: 17px; font-weight: 500; padding: 0 12px; text-align: center')
    if primary:
        return f'<div style="{base}; border: 2px solid #1C1917; background: #FFFFFF">{label}</div>'
    return f'<div style="{base}; border: 1.5px solid #D6D3D1; background: #FFFFFF">{label}</div>'

write('PilihMenu.dc.html', f'''<div style="{SHELL}">
  <div style="font-size: 13px; {MUTED}">Langkah 2 dari 4</div>
  <div style="height: 20px"></div>
  <h1 style="{H1}">Menu apa yang<br>paling laku?</h1>
  <p style="margin: 10px 0 0; font-size: 15px; line-height: 1.5; {MUTED}">
    Satu dulu saja. Yang lain bisa ditambah nanti.</p>
  <div style="height: 28px"></div>
  <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px">
    {chip('Ayam Geprek', True)}
    {chip('Nasi Goreng')}
    {chip('Soto')}
    {chip('Bakso')}
    {chip('Nasi Rames')}
    {chip('Lainnya')}
  </div>
  <div style="flex-grow: 1; min-height: 24px"></div>
  <button style="{BTN}">Lanjut</button>
</div>''')

# ══ S3 · Harga jual ══
write('HargaJual.dc.html', f'''<div style="{SHELL}">
  <div style="font-size: 13px; {MUTED}">Langkah 3 dari 4</div>
  <div style="height: 20px"></div>
  <h1 style="{H1}">Ayam Geprek dijual<br>berapa seporsi?</h1>
  <div style="height: 32px"></div>
  <div style="display: flex; align-items: baseline; gap: 10px; padding: 20px 18px;
              border: 2px solid #1C1917; border-radius: 12px; background: #FFFFFF">
    <span style="font-size: 22px; font-weight: 500; {MUTED}">Rp</span>
    <span style="font-size: 40px; font-weight: 600; letter-spacing: -0.02em">18.000</span>
  </div>
  <div style="height: 16px"></div>
  <div style="display: flex; gap: 8px; align-items: flex-start; font-size: 14px;
              line-height: 1.5; {MUTED}">
    {ico('info', 16)}<span>Harga yang tertulis di bannermu sekarang.</span>
  </div>
  <div style="flex-grow: 1; min-height: 24px"></div>
  <button style="{BTN}">Lanjut</button>
</div>''')

# ══ S4 · Isi resep (batch) ══
def bahan(nama, jml, satuan, catatan=None):
    note = (f'<div style="font-size: 13px; {MUTED}; padding: 6px 0 0 2px; '
            f'display: flex; gap: 6px; align-items: flex-start">{ico("info", 14)}'
            f'<span>{catatan}</span></div>') if catatan else ''
    return f'''<div>
      <div style="display: flex; align-items: center; gap: 10px">
        <div style="flex-grow: 1; font-size: 16px; font-weight: 500">{nama}</div>
        <div style="width: 76px; height: 46px; border: 1.5px solid #D6D3D1; border-radius: 8px;
                    background: #FFFFFF; display: flex; align-items: center; justify-content: flex-end;
                    padding: 0 12px; font-size: 17px; font-weight: 500">{jml}</div>
        <div style="width: 68px; height: 46px; border: 1.5px solid #D6D3D1; border-radius: 8px;
                    background: #FFFFFF; display: flex; align-items: center; justify-content: space-between;
                    padding: 0 8px 0 10px; font-size: 15px; color: #57534E">
          <span>{satuan}</span>{ico('chev', 14)}
        </div>
      </div>{note}
    </div>'''

write('IsiResep.dc.html', f'''<div style="{SHELL}">
  <div style="font-size: 13px; {MUTED}">Langkah 4 dari 4</div>
  <div style="height: 16px"></div>
  <h1 style="{H1}">Sekali masak Ayam Geprek,<br>kamu <span style="border-bottom: 2px solid {AMB}">beli</span> apa saja?</h1>
  <p style="margin: 10px 0 0; font-size: 14px; line-height: 1.5; {MUTED}">
    Tulis yang kamu beli — kalau ada tulang yang dibuang, tetap hitung.</p>
  <div style="height: 22px"></div>
  <div style="display: flex; flex-direction: column; gap: 14px">
    {bahan('Ayam', '2', 'kg')}
    {bahan('Beras', '1,2', 'kg')}
    {bahan('Cabai rawit', '1', 'ons')}
    {bahan('Bawang merah', '80', 'gram')}
    {bahan('Minyak goreng', '240', 'ml')}
  </div>
  <div style="height: 14px"></div>
  <div style="display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: #57534E">
    {ico('plus', 18)}<span>tambah bahan</span>
  </div>
  <div style="height: 20px"></div>
  <div style="border-top: 1.5px solid #E7E5E4; padding-top: 20px;
              display: flex; align-items: center; gap: 10px">
    <div style="flex-grow: 1; font-size: 17px; font-weight: 600">Jadi berapa porsi?</div>
    <div style="width: 64px; height: 48px; border: 2px solid #1C1917; border-radius: 8px;
                background: #FFFFFF; display: flex; align-items: center; justify-content: center;
                font-size: 19px; font-weight: 600">8</div>
    <span style="font-size: 15px; {MUTED}">porsi</span>
  </div>
  <div style="height: 20px"></div>
  <div style="display: flex; gap: 10px; align-items: flex-start; padding: 14px;
              background: #F5F5F4; border-radius: 10px">
    <div style="width: 4px; align-self: stretch; background: #D6D3D1; border-radius: 2px"></div>
    <div style="flex-grow: 1">
      <div style="display: flex; justify-content: space-between; font-size: 15px; font-weight: 500">
        <span>Gas, bumbu &amp; listrik</span><span>Rp 500</span></div>
      <div style="font-size: 13px; {MUTED}; margin-top: 3px">perkiraan kami · bisa diubah nanti</div>
    </div>
  </div>
  <div style="flex-grow: 1; min-height: 20px"></div>
  <div style="display: flex; justify-content: space-between; font-size: 14px; {MUTED}; margin-bottom: 12px">
    <span>modal bahan sementara</span><span style="font-weight: 500; color: #1C1917">Rp 109.700</span>
  </div>
  <button style="{BTN}">Lihat untungku</button>
</div>''')

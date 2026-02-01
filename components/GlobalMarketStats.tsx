import React, { useEffect, useRef, memo } from 'react';

// Fungsi Helper: Mendeteksi apakah warna background TERANG atau GELAP
const isLightColor = (hex: string) => {
    if (!hex) return false;
    const c = hex.substring(1);      // Hapus tanda #
    const rgb = parseInt(c, 16);   // Convert ke desimal
    const r = (rgb >> 16) & 0xff;  // Ambil Merah
    const g = (rgb >>  8) & 0xff;  // Ambil Hijau
    const b = (rgb >>  0) & 0xff;  // Ambil Biru
    
    // Rumus Luma (Kecerahan) standar
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; 
    return luma > 128; // Jika > 128 berarti terang (Light Mode)
};

const TradingViewWidget = ({ symbol, title }: { symbol: string, title: string }) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 1. AMBIL WARNA TEMA SAAT INI DARI CSS VARIABLES
    const rootStyle = getComputedStyle(document.documentElement);
    // Ambil warna Accent User (Default Emerald jika tidak ketemu)
    const primaryColor = rootStyle.getPropertyValue('--color-primary').trim() || '#10b981'; 
    // Ambil warna Background Card User
    const surfaceColor = rootStyle.getPropertyValue('--bg-surface').trim() || '#27272a';

    // 2. TENTUKAN MODE (LIGHT / DARK) BERDASARKAN BACKGROUND
    // Agar teks grafik tetap terbaca (kontras)
    const themeMode = isLightColor(surfaceColor) ? "light" : "dark";

    if (container.current) {
        // Bersihkan container (cegah duplikat saat re-render)
        container.current.innerHTML = ""; 

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
        script.type = "text/javascript";
        script.async = true;
        
        // 3. INJECT CONFIG DENGAN WARNA DINAMIS
        script.innerHTML = JSON.stringify({
          "symbols": [[ title, symbol + "|1D" ]],
          "chartOnly": false,
          "width": "100%",
          "height": "100%",
          "locale": "id",
          "colorTheme": themeMode, // <--- DINAMIS: Ikuti kecerahan background
          "autosize": true,
          "showVolume": false,
          "showMA": false,
          "hideDateRanges": false,
          "hideMarketStatus": false,
          "hideSymbolLogo": true,
          "scalePosition": "right",
          "scaleMode": "Normal",
          "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
          "fontSize": "10",
          "noTimeScale": false,
          "valuesTracking": "1",
          "changeMode": "price-and-percent",
          "chartType": "area",
          "maLineWidth": 1,
          "maLength": 9,
          "lineWidth": 2,
          "lineType": 0,
          "dateRanges": [ "1d|1", "1m|30", "3m|60", "12m|1D", "60m|1W", "all|1M" ],
          
          // --- COLOR SETTINGS (DINAMIS) ---
          "backgroundColor": surfaceColor, // Background mengikuti tema kartu
          "upColor": primaryColor,         // Warna Naik mengikuti Accent User
          "downColor": "#f7525f",          // Warna Turun tetap Merah (standar finance)
          "borderUpColor": primaryColor,
          "borderDownColor": "#f7525f",
          "wickUpColor": primaryColor,
          "wickDownColor": "#f7525f"
        });
        
        container.current.appendChild(script);
    }
  }, [symbol]); // Re-run effect jika symbol berubah

  return (
    // Style container mengikuti background surface agar seamless saat loading
    <div 
        className="tradingview-widget-container h-[350px] w-full rounded-xl overflow-hidden border border-white/10 shadow-lg"
        style={{ backgroundColor: 'var(--bg-surface)' }} 
    >
      <div ref={container} className="h-full w-full"></div>
    </div>
  );
};

const GlobalMarketStats = memo(() => {
  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center gap-2 mb-2 px-1">
          {/* Garis dekorasi mengikuti warna primary */}
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}></div>
          <h3 className="text-sm font-bold opacity-70 uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>Global Market Stats</h3>
      </div>

      {/* 1. KURS RUPIAH (USD/IDR) */}
      <div className="space-y-2">
          <p className="text-xs opacity-60 font-bold ml-1" style={{ color: 'var(--text-main)' }}>🇺🇸 USD to 🇮🇩 IDR (Exchange Rate)</p>
          <TradingViewWidget title="USD/IDR" symbol="FX_IDC:USDIDR" />
      </div>

      {/* 2. HARGA EMAS (XAU/IDR) */}
      <div className="space-y-2">
          <p className="text-xs opacity-60 font-bold ml-1" style={{ color: 'var(--text-main)' }}>🥇 Gold Price (IDR / Troy Ounce)</p>
          <TradingViewWidget title="Gold (IDR)" symbol="IDC:XAUIDR" />
          <p className="text-[10px] opacity-40 italic ml-1" style={{ color: 'var(--text-main)' }}>* Grafik Emas Global (XAU) dikonversi ke Rupiah.</p>
      </div>
    </div>
  );
});

export default GlobalMarketStats;
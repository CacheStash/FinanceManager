import React, { useEffect, useRef, memo, useState } from 'react';

// Fungsi Helper: Mendeteksi kecerahan background
const isLightColor = (hex: string) => {
    if (!hex) return false;
    const c = hex.substring(1);      
    const rgb = parseInt(c, 16);   
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >>  8) & 0xff;
    const b = (rgb >>  0) & 0xff;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; 
    return luma > 128; 
};

interface WidgetProps {
    symbol: string;
    title: string;
    customRanges?: string[];
    // Prop baru untuk memaksa re-render saat toggle ditekan
    keyId?: string; 
}

const TradingViewWidget = ({ symbol, title, customRanges, keyId }: WidgetProps) => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const primaryColor = rootStyle.getPropertyValue('--color-primary').trim() || '#10b981'; 
    const surfaceColor = rootStyle.getPropertyValue('--bg-surface').trim() || '#27272a';
    const themeMode = isLightColor(surfaceColor) ? "light" : "dark";

    const defaultRanges = [
        "1d|15",   // 1 Hari (15 Menit)
        "1w|60",   // 1 Minggu (1 Jam)
        "1m|240",  // 1 Bulan (4 Jam)
        "12m|1D",  // 1 Tahun (Harian)
        "60m|1W",  // 5 Tahun (Mingguan)
        "all|1M"   // Semua
    ];

    if (container.current) {
        container.current.innerHTML = ""; 

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
        script.type = "text/javascript";
        script.async = true;
        
        script.innerHTML = JSON.stringify({
          "symbols": [[ title, symbol ]],
          "chartOnly": false,
          "width": "100%",
          "height": "100%",
          "locale": "id",
          "colorTheme": themeMode,
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
          "lineWidth": 2,
          "lineType": 0,
          "dateRanges": customRanges || defaultRanges,
          "backgroundColor": surfaceColor, 
          "upColor": primaryColor,         
          "downColor": "#f7525f",          
          "borderUpColor": primaryColor,
          "borderDownColor": "#f7525f",
          "wickUpColor": primaryColor,
          "wickDownColor": "#f7525f"
        });
        
        container.current.appendChild(script);
    }
  }, [symbol, customRanges, keyId]); // Re-render jika keyId berubah

  return (
    <div 
        className="tradingview-widget-container h-[350px] w-full rounded-xl overflow-hidden border border-white/10 shadow-lg"
        style={{ backgroundColor: 'var(--bg-surface)' }} 
    >
      <div ref={container} className="h-full w-full"></div>
    </div>
  );
};

const GlobalMarketStats = memo(() => {
  // STATE: Kontrol Mode Grafik Emas
  const [goldMode, setGoldMode] = useState<'IDR' | 'USD'>('IDR');

  // CONFIG 1: DATA RUPIAH (Safe Mode 5 Hari)
  const goldRangesIDR = [
      "5d|1D",   // Min 5 Hari (Harian) - Agar tidak error
      "1m|1D",   
      "3m|1D",   
      "12m|1D",  
      "60m|1W",  
      "all|1M"   
  ];

  // CONFIG 2: DATA USD (Full 24 Jam)
  const goldRangesUSD = [
      "1d|5",    // 1 Hari (Detail 5 Menit) <--- INI YG KAMU CARI
      "5d|15",   // 5 Hari (Detail 15 Menit)
      "1m|60",   
      "3m|120",
      "12m|1D",
      "all|1M"
  ];

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center gap-2 mb-2 px-1">
          <div className="w-1 h-4 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}></div>
          <h3 className="text-sm font-bold opacity-70 uppercase tracking-wider" style={{ color: 'var(--text-main)' }}>Global Market Stats</h3>
      </div>

      {/* 1. KURS RUPIAH (USD/IDR) */}
      <div className="space-y-2">
          <p className="text-xs opacity-60 font-bold ml-1" style={{ color: 'var(--text-main)' }}>🇺🇸 USD to 🇮🇩 IDR (Exchange Rate)</p>
          <TradingViewWidget title="USD/IDR" symbol="FX_IDC:USDIDR" />
      </div>

      {/* 2. HARGA EMAS (DYNAMIC) */}
      <div className="space-y-2">
          <div className="flex justify-between items-end mb-1">
             <p className="text-xs opacity-60 font-bold ml-1" style={{ color: 'var(--text-main)' }}>
                🥇 Gold Analytics
             </p>
             
             {/* TOGGLE BUTTONS */}
             <div className="flex bg-white/5 p-0.5 rounded-lg border border-white/10">
                <button 
                    onClick={() => setGoldMode('IDR')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                        goldMode === 'IDR' 
                        ? 'bg-indigo-600 text-white shadow' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    🇮🇩 Harga (Rp)
                </button>
                <button 
                    onClick={() => setGoldMode('USD')}
                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                        goldMode === 'USD' 
                        ? 'bg-emerald-600 text-white shadow' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    🌎 Tren 24 Jam
                </button>
             </div>
          </div>

          {/* LOGIC TOGGLE WIDGET */}
          {goldMode === 'IDR' ? (
              // WIDGET 1: RUPIAH / GRAM (Calculated)
              // Range: 5 Hari (Harian)
              <TradingViewWidget 
                keyId="idr-chart"
                title="Gold (IDR/gr)" 
                symbol="(TVC:GOLD*FX_IDC:USDIDR)/31.1035" 
                customRanges={goldRangesIDR} 
              />
          ) : (
              // WIDGET 2: USD / OUNCE (Raw Data)
              // Range: 1 Hari (5 Menit) - INTRADAY BISA DISINI
              <TradingViewWidget 
                keyId="usd-chart"
                title="Gold Trend (USD)" 
                symbol="TVC:GOLD" 
                customRanges={goldRangesUSD} 
              />
          )}

          <p className="text-[10px] opacity-40 italic ml-1 mt-1" style={{ color: 'var(--text-main)' }}>
              {goldMode === 'IDR' 
                ? "* Menampilkan Harga Real Rupiah. Range min: 5 Hari." 
                : "* Menampilkan Grafik Global (USD) untuk melihat detail pergerakan menit/jam."}
          </p>
      </div>
    </div>
  );
});

export default GlobalMarketStats;
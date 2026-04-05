import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Settings, Download, Plus, Minus, Type, Image as ImageIcon, RotateCw, Eraser, RefreshCw, Move, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, History, Save, UploadCloud, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';

const getCssFontFamily = (font: string) => {
  switch(font) {
    case 'helvetica': return 'Helvetica, Arial, sans-serif';
    case 'times': return '"Times New Roman", Times, serif';
    case 'courier': return '"Courier New", Courier, monospace';
    case 'ocr-b': return '"OCR-B", "OCR B Std", "Share Tech Mono", monospace';
    case 'news-gothic': return '"News Gothic MT", "News Gothic", "News Cycle", sans-serif';
    case 'franklin-gothic': return '"Franklin Gothic Medium", "Libre Franklin", sans-serif';
    case 'dot-matrix': return '"Codystar", "DotGothic16", monospace';
    default: return 'sans-serif';
  }
};

interface RecentConfig {
  id: string;
  mode: 'single' | 'multiple';
  singleSerial: string;
  multiStart: number;
  multiCount: number;
  timestamp: number;
}

const fontOptions = [
  { value: 'helvetica', label: 'Helvetica (Sans)' },
  { value: 'times', label: 'Times (Serif)' },
  { value: 'courier', label: 'Courier (Mono)' },
  { value: 'ocr-b', label: 'OCR-B (Machine)' },
  { value: 'news-gothic', label: 'News Gothic (Condensed)' },
  { value: 'franklin-gothic', label: 'Franklin Gothic (Medium)' },
  { value: 'dot-matrix', label: 'Dot Matrix (Dot Dot)' },
];

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [position, setPosition] = useState({ x: 50, y: 50 }); // percentages
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [singleSerial, setSingleSerial] = useState('786');
  const [multiStart, setMultiStart] = useState(786);
  const [multiCount, setMultiCount] = useState(10);
  const [fontSize, setFontSize] = useState(48);
  const [color, setColor] = useState('#ff0000');
  const [fontFamily, setFontFamily] = useState('helvetica');
  const [fontWeight, setFontWeight] = useState('bold');
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false);
  const [rotation, setRotation] = useState(90);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  // Recent configs state
  const [recentConfigs, setRecentConfigs] = useState<RecentConfig[]>(() => {
    try {
      const saved = localStorage.getItem('recentCashMemoConfigs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Cover-up feature state
  const [enableCover, setEnableCover] = useState(false);
  const [coverColor, setCoverColor] = useState('#b5d6c8'); // Default to a light green similar to the memo
  const [coverWidth, setCoverWidth] = useState(120);
  const [coverHeight, setCoverHeight] = useState(60);

  const [pdfSize, setPdfSize] = useState<'original' | 'a4' | 'letter' | 'legal'>('original');

  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setImageDimensions({ width: img.width, height: img.height });
          setImage(event.target?.result as string);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRotateImage = () => {
    if (!image) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Rotate 90 degrees clockwise
      canvas.width = img.height;
      canvas.height = img.width;
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      const newImage = canvas.toDataURL('image/jpeg', 1.0);
      setImage(newImage);
      setImageDimensions({ width: canvas.width, height: canvas.height });
    };
    img.src = image;
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });
  };

  const handleNudge = (dx: number, dy: number) => {
    setPosition(prev => ({
      x: Math.max(0, Math.min(100, prev.x + dx)),
      y: Math.max(0, Math.min(100, prev.y + dy))
    }));
  };

  const exportSettings = () => {
    const settings = {
      position, fontSize, color, fontFamily, fontWeight, rotation, enableCover, coverColor, coverWidth, coverHeight, pdfSize
    };
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cash-memo-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const settings = JSON.parse(event.target?.result as string);
        if (settings.position) setPosition(settings.position);
        if (settings.fontSize) setFontSize(settings.fontSize);
        if (settings.color) setColor(settings.color);
        if (settings.fontFamily) setFontFamily(settings.fontFamily);
        if (settings.fontWeight) setFontWeight(settings.fontWeight);
        if (settings.rotation !== undefined) setRotation(settings.rotation);
        if (settings.enableCover !== undefined) setEnableCover(settings.enableCover);
        if (settings.coverColor) setCoverColor(settings.coverColor);
        if (settings.coverWidth) setCoverWidth(settings.coverWidth);
        if (settings.coverHeight) setCoverHeight(settings.coverHeight);
        if (settings.pdfSize) setPdfSize(settings.pdfSize);
      } catch (err) {
        alert("Invalid settings file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  useEffect(() => {
    const updateScale = () => {
      if (imageRef.current && imageDimensions.width > 0) {
        setPreviewScale(imageRef.current.width / imageDimensions.width);
      }
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [image, imageDimensions]);

  const generatePDF = async () => {
    if (!image) return;
    setIsGenerating(true);

    try {
      // Save to recent configs
      const newConfig: RecentConfig = {
        id: Date.now().toString(),
        mode,
        singleSerial,
        multiStart,
        multiCount,
        timestamp: Date.now()
      };
      
      const filteredConfigs = recentConfigs.filter(c => 
        !(c.mode === mode && c.singleSerial === singleSerial && c.multiStart === multiStart && c.multiCount === multiCount)
      );
      const updatedConfigs = [newConfig, ...filteredConfigs].slice(0, 10); // Keep last 10
      setRecentConfigs(updatedConfigs);
      localStorage.setItem('recentCashMemoConfigs', JSON.stringify(updatedConfigs));

      // Small delay to allow UI to update to loading state
      await new Promise(resolve => setTimeout(resolve, 100));

      const pdf = new jsPDF({
        orientation: imageDimensions.width > imageDimensions.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: pdfSize === 'original' ? [imageDimensions.width, imageDimensions.height] : pdfSize
      });

      const pageSize = pdf.internal.pageSize;
      const pageW = pageSize.getWidth();
      const pageH = pageSize.getHeight();

      const scale = Math.min(pageW / imageDimensions.width, pageH / imageDimensions.height);
      const imgDrawW = imageDimensions.width * scale;
      const imgDrawH = imageDimensions.height * scale;
      const offsetX = (pageW - imgDrawW) / 2;
      const offsetY = (pageH - imgDrawH) / 2;

      const serialsToGenerate = mode === 'single' 
        ? [singleSerial] 
        : Array.from({ length: multiCount }, (_, i) => (multiStart + i).toString());

      for (let i = 0; i < serialsToGenerate.length; i++) {
        if (i > 0) {
          pdf.addPage(pdfSize === 'original' ? [imageDimensions.width, imageDimensions.height] : pdfSize, imageDimensions.width > imageDimensions.height ? 'landscape' : 'portrait');
        }

        // Add background image
        pdf.addImage(image, 'JPEG', offsetX, offsetY, imgDrawW, imgDrawH);

        // Calculate absolute position
        const absX = offsetX + (position.x / 100) * imgDrawW;
        const absY = offsetY + (position.y / 100) * imgDrawH;

        // Draw cover-up box if enabled
        if (enableCover) {
          const cx = absX;
          const cy = absY;
          const w = coverWidth * scale;
          const h = coverHeight * scale;
          const angleRad = (rotation * Math.PI) / 180; // CSS rotation is clockwise

          const dx = w / 2;
          const dy = h / 2;
          
          // Calculate 4 corners of the rotated rectangle
          const corners = [
            { x: -dx, y: -dy },
            { x: dx, y: -dy },
            { x: dx, y: dy },
            { x: -dx, y: dy }
          ];

          const rotatedCorners = corners.map(c => ({
            x: cx + (c.x * Math.cos(angleRad) - c.y * Math.sin(angleRad)),
            y: cy + (c.x * Math.sin(angleRad) + c.y * Math.cos(angleRad))
          }));

          pdf.setFillColor(coverColor);
          // Draw two triangles to form the rotated rectangle
          pdf.triangle(
            rotatedCorners[0].x, rotatedCorners[0].y,
            rotatedCorners[1].x, rotatedCorners[1].y,
            rotatedCorners[2].x, rotatedCorners[2].y,
            'F'
          );
          pdf.triangle(
            rotatedCorners[0].x, rotatedCorners[0].y,
            rotatedCorners[2].x, rotatedCorners[2].y,
            rotatedCorners[3].x, rotatedCorners[3].y,
            'F'
          );
        }

        // Draw text using high-res canvas to support custom fonts exactly as they appear in the browser
        const text = serialsToGenerate[i];
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const scaleMult = 4; // High-res multiplier for crisp printing
          const pxSize = fontSize * scale * scaleMult;
          const cssFont = getCssFontFamily(fontFamily);
          
          ctx.font = `${fontWeight} ${pxSize}px ${cssFont}`;
          const metrics = ctx.measureText(text);
          const textWidth = metrics.width;
          const textHeight = pxSize * 1.5; 
          
          const maxDim = Math.ceil(Math.max(textWidth, textHeight) * 2);
          canvas.width = maxDim;
          canvas.height = maxDim;
          
          // Re-set font after resizing canvas
          ctx.font = `${fontWeight} ${pxSize}px ${cssFont}`;
          ctx.fillStyle = color;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          ctx.translate(maxDim / 2, maxDim / 2);
          ctx.rotate((rotation * Math.PI) / 180); // Canvas rotation is clockwise, matching CSS
          ctx.fillText(text, 0, 0);
          
          const textDataUrl = canvas.toDataURL('image/png');
          const imgW = maxDim / scaleMult;
          const imgH = maxDim / scaleMult;
          
          pdf.addImage(textDataUrl, 'PNG', absX - imgW / 2, absY - imgH / 2, imgW, imgH);
        }
      }

      pdf.save('cash-memos.pdf');
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("An error occurred while generating the PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  const loadConfig = (config: RecentConfig) => {
    setMode(config.mode);
    setSingleSerial(config.singleSerial);
    setMultiStart(config.multiStart);
    setMultiCount(config.multiCount);
  };

  const clearHistory = () => {
    setRecentConfigs([]);
    localStorage.removeItem('recentCashMemoConfigs');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <FileText className="text-blue-600" />
              Cash Memo Serial Generator
            </h1>
            <p className="text-gray-500 mt-1">Upload your blank cash memo, position the serial number, and generate copies.</p>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={exportSettings}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Save size={16} /> Export Settings
            </button>
            <label className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer">
              <UploadCloud size={16} /> Import Settings
              <input type="file" accept=".json" className="hidden" onChange={importSettings} />
            </label>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Controls */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Step 1: Upload */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                Upload Image
              </h2>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-gray-500" />
                  <p className="text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                </div>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>

            {/* Step 2: Configuration */}
            <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 ${!image ? 'opacity-50 pointer-events-none' : ''}`}>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                Configure Serial
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
                  <div className="flex rounded-md shadow-sm">
                    <button
                      onClick={() => setMode('single')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-md border ${mode === 'single' ? 'bg-blue-50 border-blue-500 text-blue-700 z-10' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      Single
                    </button>
                    <button
                      onClick={() => setMode('multiple')}
                      className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-md border-t border-b border-r ${mode === 'multiple' ? 'bg-blue-50 border-blue-500 text-blue-700 z-10' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                    >
                      Multiple (Auto)
                    </button>
                  </div>
                </div>

                {mode === 'single' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                    <input 
                      type="text" 
                      value={singleSerial} 
                      onChange={(e) => setSingleSerial(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Start Number</label>
                      <input 
                        type="number" 
                        value={multiStart} 
                        onChange={(e) => setMultiStart(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Count</label>
                      <input 
                        type="number" 
                        value={multiCount} 
                        onChange={(e) => setMultiCount(parseInt(e.target.value) || 1)}
                        min="1"
                        max="500"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {recentConfigs.length > 0 && (
                  <div className="pt-3 pb-1">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
                        <History size={12}/> Recently Generated
                      </label>
                      <button 
                        onClick={clearHistory}
                        className="text-xs text-red-500 hover:text-red-700 hover:underline"
                      >
                        Clear History
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentConfigs.map(config => (
                        <button
                          key={config.id}
                          onClick={() => loadConfig(config)}
                          className="text-xs px-2 py-1 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 hover:border-blue-200 rounded transition-colors"
                        >
                          {config.mode === 'single' 
                            ? `Single: ${config.singleSerial}` 
                            : `Multi: ${config.multiStart} to ${config.multiStart + config.multiCount - 1} (${config.multiCount})`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center justify-between">
                      <span className="flex items-center gap-1"><Type size={14}/> Font</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white flex items-center justify-between"
                      >
                        <span className="truncate">{fontOptions.find(o => o.value === fontFamily)?.label}</span>
                        <ChevronDown size={16} className="text-gray-500" />
                      </button>
                      
                      {isFontDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsFontDropdownOpen(false)} />
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                            {fontOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => {
                                  setFontFamily(option.value);
                                  setIsFontDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition-colors flex flex-col gap-1 border-b border-gray-100 last:border-0 ${fontFamily === option.value ? 'bg-blue-50' : ''}`}
                              >
                                <span className="text-xs font-medium text-gray-500">{option.label}</span>
                                <span 
                                  style={{ 
                                    fontFamily: getCssFontFamily(option.value),
                                    fontWeight: fontWeight,
                                    color: color
                                  }}
                                  className="text-lg truncate"
                                >
                                  {mode === 'single' ? singleSerial : multiStart}
                                </span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Type size={14}/> Weight</label>
                    <select
                      value={fontWeight}
                      onChange={(e) => setFontWeight(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1"><Type size={14}/> Size</label>
                    <input 
                      type="number" 
                      value={fontSize} 
                      onChange={(e) => setFontSize(parseInt(e.target.value) || 12)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => setColor(e.target.value)}
                        className="h-9 w-full rounded-md cursor-pointer border border-gray-300 p-0.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <RotateCw size={14}/> Text Rotation: {rotation}°
                  </label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="range" 
                      min="0" 
                      max="360" 
                      step="1"
                      value={rotation} 
                      onChange={(e) => setRotation(parseInt(e.target.value) || 0)}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <input 
                      type="number" 
                      value={rotation} 
                      onChange={(e) => setRotation(parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-between mt-2">
                    {[0, 90, 180, 270].map(deg => (
                      <button 
                        key={deg}
                        onClick={() => setRotation(deg)}
                        className={`text-xs px-2 py-1 rounded border ${rotation === deg ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cover-up feature */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input 
                      type="checkbox" 
                      checked={enableCover}
                      onChange={(e) => setEnableCover(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                      <Eraser size={16} /> Hide Previous Number
                    </span>
                  </label>

                  {enableCover && (
                    <div className="space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Cover Color (Pick from image background)</label>
                        <input 
                          type="color" 
                          value={coverColor} 
                          onChange={(e) => setCoverColor(e.target.value)}
                          className="h-8 w-full rounded-md cursor-pointer border border-gray-300 p-0.5"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Box Width</label>
                          <input 
                            type="number" 
                            value={coverWidth} 
                            onChange={(e) => setCoverWidth(parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Box Height</label>
                          <input 
                            type="number" 
                            value={coverHeight} 
                            onChange={(e) => setCoverHeight(parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fine-tune Position */}
                <div className="pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                    <Move size={14}/> Fine-tune Position
                  </label>
                  <div className="flex items-center justify-center gap-6">
                    <div className="grid grid-cols-3 gap-1">
                      <div />
                      <button onClick={() => handleNudge(0, -0.1)} className="p-2 bg-gray-100 hover:bg-gray-200 hover:text-blue-600 rounded flex items-center justify-center transition-colors" title="Move Up"><ArrowUp size={16}/></button>
                      <div />
                      <button onClick={() => handleNudge(-0.1, 0)} className="p-2 bg-gray-100 hover:bg-gray-200 hover:text-blue-600 rounded flex items-center justify-center transition-colors" title="Move Left"><ArrowLeft size={16}/></button>
                      <div className="p-2 flex items-center justify-center text-[10px] text-gray-400 font-medium text-center leading-tight">0.1%<br/>step</div>
                      <button onClick={() => handleNudge(0.1, 0)} className="p-2 bg-gray-100 hover:bg-gray-200 hover:text-blue-600 rounded flex items-center justify-center transition-colors" title="Move Right"><ArrowRight size={16}/></button>
                      <div />
                      <button onClick={() => handleNudge(0, 0.1)} className="p-2 bg-gray-100 hover:bg-gray-200 hover:text-blue-600 rounded flex items-center justify-center transition-colors" title="Move Down"><ArrowDown size={16}/></button>
                      <div />
                    </div>
                    <div className="text-xs text-gray-500 space-y-2 bg-gray-50 p-3 rounded-lg border border-gray-200 min-w-[100px]">
                      <div className="flex justify-between">
                        <span className="font-medium">X:</span> 
                        <span className="font-mono">{position.x.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Y:</span> 
                        <span className="font-mono">{position.y.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Step 3: Generate */}
            <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4 ${!image ? 'opacity-50 pointer-events-none' : ''}`}>
               <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                Generate
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PDF Page Size</label>
                <select 
                  value={pdfSize} 
                  onChange={(e) => setPdfSize(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="original">Original Image Size</option>
                  <option value="a4">A4 (210 x 297 mm)</option>
                  <option value="letter">Letter (8.5 x 11 in)</option>
                  <option value="legal">Legal (8.5 x 14 in)</option>
                </select>
              </div>

              <button
                onClick={generatePDF}
                disabled={isGenerating || !image}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Download size={20} />
                )}
                {isGenerating ? 'Generating PDF...' : 'Download PDF'}
              </button>
            </div>

          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ImageIcon className="text-gray-500" />
                  Preview & Position
                </h2>
                {image && (
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleRotateImage}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors font-medium"
                    >
                      <RefreshCw size={16} /> Rotate Image
                    </button>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-md border border-gray-200 font-medium hidden sm:inline-block">
                      Click on the image to position
                    </span>
                  </div>
                )}
              </div>

              <div className="flex-1 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative flex items-center justify-center min-h-[400px]">
                {!image ? (
                  <div className="text-center text-gray-400 p-8">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Upload a blank cash memo image to see the preview.</p>
                  </div>
                ) : (
                  <div 
                    className="relative inline-block cursor-crosshair max-w-full max-h-full overflow-auto"
                    onClick={handleImageClick}
                  >
                    <img 
                      ref={imageRef}
                      src={image} 
                      alt="Cash Memo Preview" 
                      className="max-w-full h-auto object-contain shadow-md"
                      style={{ maxHeight: '70vh' }}
                      onLoad={() => {
                        if (imageRef.current && imageDimensions.width > 0) {
                          setPreviewScale(imageRef.current.width / imageDimensions.width);
                        }
                      }}
                    />
                    
                    {/* Cover-up Box Preview */}
                    {enableCover && (
                      <div 
                        className="absolute pointer-events-none"
                        style={{
                          left: `${position.x}%`,
                          top: `${position.y}%`,
                          width: `${coverWidth * previewScale}px`,
                          height: `${coverHeight * previewScale}px`,
                          backgroundColor: coverColor,
                          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                          transformOrigin: 'center center',
                          zIndex: 10
                        }}
                      />
                    )}

                    {/* Text Preview */}
                    <div 
                      className="absolute pointer-events-none whitespace-nowrap"
                      style={{
                        left: `${position.x}%`,
                        top: `${position.y}%`,
                        color: color,
                        fontSize: `${fontSize * previewScale}px`,
                        fontFamily: getCssFontFamily(fontFamily),
                        fontWeight: fontWeight,
                        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                        textShadow: enableCover ? 'none' : '0 0 2px rgba(255,255,255,0.8)',
                        zIndex: 20
                      }}
                    >
                      {mode === 'single' ? singleSerial : multiStart}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

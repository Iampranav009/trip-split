import React, { useState, useEffect, useRef } from 'react';
import { Plus, Minus, X, Divide, Delete } from 'lucide-react';

interface CalculatorInputProps {
  value: number;
  onChange: (val: number) => void;
}

export const CalculatorInput: React.FC<CalculatorInputProps> = ({ value, onChange }) => {
  const [expression, setExpression] = useState(value > 0 ? value.toString() : '');
  const [preview, setPreview] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state if prop changes externally (e.g. reset)
  useEffect(() => {
    if (value === 0 && expression !== '') {
      setExpression('');
      setPreview(null);
    }
  }, [value]);

  const evaluate = (expr: string): number | null => {
    if (!expr) return null;
    try {
      const safeExpr = expr.replace(/×/g, '*').replace(/÷/g, '/');
      if (/[^0-9+\-*/().\s]/.test(safeExpr)) return null;
      // eslint-disable-next-line no-new-func
      const result = new Function('return ' + safeExpr)();
      return isFinite(result) ? result : null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    const res = evaluate(expression);
    setPreview(res);
    if (res !== null) {
      onChange(res);
    } else {
      const parsed = parseFloat(expression);
      if (!isNaN(parsed)) {
        onChange(parsed);
      } else if (expression === '') {
        onChange(0);
      }
    }
  }, [expression, onChange]);

  const handleBtnClick = (char: string) => {
    setExpression(prev => prev + char);
  };

  const handleClear = () => {
    setExpression('');
    setPreview(null);
    onChange(0);
  };

  const handleDelete = () => {
    setExpression(prev => prev.slice(0, -1));
  };

  const handleQuickMult = (factor: number) => {
    setExpression(prev => {
      if (!prev) return '';
      const lastChar = prev.trim().slice(-1);
      if (['+', '-', '*', '/', '×', '÷'].includes(lastChar)) {
        return prev + factor;
      }
      return prev + ` * ${factor}`;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl pointer-events-none">₹</div>
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="0"
          className="w-full pl-10 pr-24 py-4 text-3xl font-bold text-gray-800 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none shadow-sm placeholder:text-gray-300"
        />
        {preview !== null && preview !== parseFloat(expression || '0') && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 font-semibold text-lg bg-emerald-50 px-2 py-1 rounded">
            = {Math.round(preview * 100) / 100}
          </div>
        )}
      </div>

      {/* Interactive Keypad Grid */}
      <div className="grid grid-cols-4 gap-2">
        {/* Row 1 */}
        <button type="button" onClick={handleClear} className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm flex justify-center items-center active:scale-95 transition-transform">C</button>
        <button type="button" onClick={() => handleBtnClick(' / ')} className="p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm flex justify-center items-center active:scale-95 transition-transform"><Divide size={18} /></button>
        <button type="button" onClick={() => handleBtnClick(' * ')} className="p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm flex justify-center items-center active:scale-95 transition-transform"><X size={18} /></button>
        <button type="button" onClick={handleDelete} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex justify-center items-center active:scale-95 transition-transform"><Delete size={18} /></button>

        {/* Row 2 */}
        <button type="button" onClick={() => handleBtnClick('7')} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform shadow-sm">7</button>
        <button type="button" onClick={() => handleBtnClick('8')} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform shadow-sm">8</button>
        <button type="button" onClick={() => handleBtnClick('9')} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform shadow-sm">9</button>
        <button type="button" onClick={() => handleBtnClick(' - ')} className="p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm flex justify-center items-center active:scale-95 transition-transform"><Minus size={18} /></button>

        {/* Row 3 */}
        <button type="button" onClick={() => handleBtnClick('4')} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform shadow-sm">4</button>
        <button type="button" onClick={() => handleBtnClick('5')} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform shadow-sm">5</button>
        <button type="button" onClick={() => handleBtnClick('6')} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform shadow-sm">6</button>
        <button type="button" onClick={() => handleBtnClick(' + ')} className="p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm flex justify-center items-center active:scale-95 transition-transform"><Plus size={18} /></button>

        {/* Row 4 */}
        <button type="button" onClick={() => handleBtnClick('1')} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform shadow-sm">1</button>
        <button type="button" onClick={() => handleBtnClick('2')} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform shadow-sm">2</button>
        <button type="button" onClick={() => handleBtnClick('3')} className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform shadow-sm">3</button>
        <button type="button" onClick={() => handleBtnClick('.')} className="p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform">.</button>

        {/* Row 5 */}
        <button type="button" onClick={() => handleBtnClick('0')} className="col-span-2 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform shadow-sm">0</button>
        <button type="button" onClick={() => handleBtnClick('00')} className="col-span-2 p-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-base flex justify-center items-center active:scale-95 transition-transform shadow-sm">00</button>
      </div>

      {/* Quick Multipliers */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1 items-center">
        <span className="text-xs font-semibold text-gray-400 shrink-0 mr-1">Quick:</span>
        {[2, 3, 4, 5, 6].map(m => (
          <button
            key={m}
            type="button"
            onClick={() => handleQuickMult(m)}
            className="flex-shrink-0 px-3.5 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-semibold hover:bg-indigo-100 active:scale-95 transition-transform"
          >
            ×{m}
          </button>
        ))}
      </div>
    </div>
  );
};

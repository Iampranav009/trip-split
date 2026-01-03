import React, { useState, useEffect } from 'react';
import { Plus, Minus, X, Divide, Delete } from 'lucide-react';

interface CalculatorInputProps {
  value: number;
  onChange: (val: number) => void;
}

export const CalculatorInput: React.FC<CalculatorInputProps> = ({ value, onChange }) => {
  const [expression, setExpression] = useState(value > 0 ? value.toString() : '');
  const [preview, setPreview] = useState<number | null>(null);

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
      // sanitize: allow only numbers, operators, parens, decimal
      // replace 'x' with '*' for eval
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
    }
  }, [expression, onChange]);

  const handleBtnClick = (char: string) => {
    setExpression(prev => prev + char);
  };

  const handleQuickMult = (factor: number) => {
    setExpression(prev => {
        // If empty, assume base is 0? No, maybe just append.
        // If prev ends with operator, just append number.
        // If prev is number, append * factor.
        if (!prev) return '';
        const lastChar = prev.trim().slice(-1);
        if (['+', '-', '*', '/'].includes(lastChar)) {
            return prev + factor;
        }
        return prev + ` * ${factor}`;
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">₹</div>
        <input
          type="text"
          inputMode="none" // Prevent mobile keyboard for this demo to show custom buttons, or allow it. Let's allow typing but provide buttons too.
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="0"
          className="w-full pl-10 pr-24 py-4 text-3xl font-bold text-gray-800 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand focus:border-transparent outline-none shadow-sm placeholder:text-gray-300"
        />
        {preview !== null && preview !== parseFloat(expression || '0') && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600 font-semibold text-lg bg-emerald-50 px-2 py-1 rounded">
                = {Math.round(preview * 100) / 100}
            </div>
        )}
      </div>

      {/* Operators */}
      <div className="grid grid-cols-5 gap-2">
        <button onClick={() => handleBtnClick('+')} className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex justify-center items-center"><Plus size={20} /></button>
        <button onClick={() => handleBtnClick('-')} className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex justify-center items-center"><Minus size={20} /></button>
        <button onClick={() => handleBtnClick(' * ')} className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex justify-center items-center"><X size={20} /></button>
        <button onClick={() => handleBtnClick(' / ')} className="p-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex justify-center items-center"><Divide size={20} /></button>
        <button onClick={() => setExpression(prev => prev.slice(0, -1))} className="p-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex justify-center items-center"><Delete size={20} /></button>
      </div>

      {/* Quick Multipliers */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
        {[2, 3, 4, 5, 6].map(m => (
            <button
                key={m}
                onClick={() => handleQuickMult(m)}
                className="flex-shrink-0 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full text-sm font-semibold hover:bg-indigo-100 active:scale-95 transition-transform"
            >
                ×{m}
            </button>
        ))}
      </div>
    </div>
  );
};

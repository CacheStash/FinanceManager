import React from 'react';
import { Delete, Check } from 'lucide-react';

interface CalculatorInputProps {
  value: number;
  onChange: (val: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const CalculatorInput: React.FC<CalculatorInputProps> = ({ value, onChange, onConfirm, onClose }) => {
  const [display, setDisplay] = React.useState(value === 0 ? '' : value.toString());

  const handlePress = (key: string) => {
    if (key === 'OK') {
      onConfirm();
      return;
    }
    if (key === 'DEL') {
      setDisplay(prev => prev.slice(0, -1));
      return;
    }
    if (key === '.') {
      if (display.includes('.')) return;
      setDisplay(prev => prev + '.');
      return;
    }
    // Simple logic, ignoring advanced math for this basic version to match screenshot visuals
    setDisplay(prev => prev + key);
  };

  React.useEffect(() => {
    const num = parseFloat(display);
    if (!isNaN(num)) onChange(num);
    else if (display === '') onChange(0);
  }, [display]);

  const btnClass = "flex items-center justify-center text-xl font-medium bg-[#27272a] hover:bg-[#3f3f46] active:bg-[#52525b] text-white py-4 border-r border-b border-gray-800";

  return (
    <div className="flex flex-col h-full bg-[#18181b]">
       <div className="flex justify-between items-center p-4 bg-[#27272a] border-b border-gray-700">
         <span className="text-gray-400">Amount</span>
         <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-white tracking-widest">
                {display || '0'}
            </span>
            <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full"><Delete className="w-5 h-5"/></button>
         </div>
       </div>
       <div className="grid grid-cols-4 flex-1">
          {['7','8','9','/','4','5','6','*','1','2','3','-','00','0','000','+'].map(k => (
              <button key={k} onClick={() => handlePress(k)} className={btnClass}>{k}</button>
          ))}
       </div>
       <div className="grid grid-cols-2">
         <button onClick={() => handlePress('DEL')} className={`${btnClass} col-span-1 border-r-0`}><Delete className="w-6 h-6"/></button>
         <button onClick={() => handlePress('OK')} className={`${btnClass} col-span-1 bg-rose-500 hover:bg-rose-600 text-white border-none`}>OK</button>
       </div>
    </div>
  );
};

export default CalculatorInput;
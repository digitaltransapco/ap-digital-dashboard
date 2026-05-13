'use client';

import { useCallback, useState } from 'react';
import { Upload, FileText } from 'lucide-react';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function FileDropzone({ onFile, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) onFile(file);
    },
    [onFile],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <label
      className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 cursor-pointer transition-all
        ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50/40'}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input type="file" accept=".csv" className="hidden" onChange={handleChange} disabled={disabled} />
      <div className="flex flex-col items-center gap-3 text-center">
        {isDragging
          ? <FileText className="w-12 h-12 text-indigo-500" />
          : <Upload className="w-12 h-12 text-gray-400" />}
        <div>
          <p className="text-base font-medium text-gray-700">
            {isDragging ? 'Drop your CSV here' : 'Drag & drop the Booking Paymentwise CSV'}
          </p>
          <p className="text-sm text-gray-500 mt-1">or click to browse · .csv files only</p>
        </div>
      </div>
    </label>
  );
}

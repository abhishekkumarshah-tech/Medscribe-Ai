import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function ErrorNotice({ message, className = '' }: { message: string; className?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className={`flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 ${className}`}>
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}

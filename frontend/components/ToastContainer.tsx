"use client";

import { CheckCircle, X, AlertCircle } from 'lucide-react';
import { ToastType } from '@/hooks/useToast';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: number) => void;
}

export default function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-slide-in-right"
        >
          <div
            className={`bg-white rounded-xl shadow-2xl border-2 px-4 py-3 max-w-md ${
              toast.type === 'success'
                ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50'
                : 'border-red-200 bg-gradient-to-r from-red-50 to-rose-50'
            }`}
          >
            <div className="flex items-start gap-3">
              {toast.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p
                  className={`text-sm font-semibold ${
                    toast.type === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => onRemove(toast.id)}
                className={`flex-shrink-0 hover:opacity-70 transition-opacity ${
                  toast.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  subMessage?: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ 
  message, 
  subMessage, 
  isVisible, 
  onClose, 
  duration = 4000 
}: ToastProps) {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <>
      <div className="fixed top-4 right-4 z-[70] animate-slide-in-right">
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 text-green-700 px-4 sm:px-6 py-3 sm:py-4 rounded-xl shadow-lg max-w-md">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1">
              <div className="text-sm sm:text-base font-semibold">{message}</div>
              {subMessage && (
                <div className="text-xs sm:text-sm mt-1">{subMessage}</div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-green-600 hover:text-green-800 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
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
    </>
  );
}

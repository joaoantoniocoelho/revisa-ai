"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Coins, ShoppingCart } from "lucide-react";

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

export default function CreditsModal({
  isOpen,
  onClose,
  title,
  message,
}: CreditsModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative bg-white rounded-card-lg border border-border shadow-card-hover max-w-md w-full animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-card flex items-center justify-center">
              <Coins className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-muted hover:text-gray-900 rounded transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">{message}</p>
          <Link
            href="/billing"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-white text-sm font-medium rounded-card hover:bg-primary-hover transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Comprar créditos
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-muted hover:text-gray-700 transition-colors"
          >
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}

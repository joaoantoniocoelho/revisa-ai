"use client";

import { useState, useCallback } from 'react';

export function useUpgradeModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [features, setFeatures] = useState<string[]>([]);

  const showUpgradeModal = useCallback((
    modalTitle: string,
    modalMessage: string,
    modalFeatures: string[] = []
  ) => {
    setTitle(modalTitle);
    setMessage(modalMessage);
    setFeatures(modalFeatures);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    title,
    message,
    features,
    showUpgradeModal,
    closeModal,
  };
}

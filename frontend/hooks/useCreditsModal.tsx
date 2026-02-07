"use client";

import { useState, useCallback } from 'react';

export function useCreditsModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const showCreditsModal = useCallback((modalTitle: string, modalMessage: string) => {
    setTitle(modalTitle);
    setMessage(modalMessage);
    setIsOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    title,
    message,
    showCreditsModal,
    closeModal,
  };
}

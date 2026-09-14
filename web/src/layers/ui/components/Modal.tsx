/**
 * Modal 组件
 * 统一的模态框组件
 */

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { modalVariants } from '../../styles';
import { cn } from '../../../shared/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  className,
}) => {
  useEffect(() => {
    if (!open || !closeOnEsc) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, closeOnEsc, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const content = (
    <>
      {/* Overlay */}
      <div
        className={modalVariants.overlay}
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div className={cn(modalVariants.content, className)}>
        {/* Header */}
        {title && (
          <div className={modalVariants.header}>
            <h2 className={modalVariants.title}>{title}</h2>
            <button
              onClick={onClose}
              className={modalVariants.close}
              aria-label="Close"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className={modalVariants.body}>{children}</div>

        {/* Footer */}
        {footer && <div className={modalVariants.footer}>{footer}</div>}
      </div>
    </>
  );

  return createPortal(content, document.body);
};

Modal.displayName = 'Modal';

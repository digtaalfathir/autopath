import React from 'react';
import { IconX } from './Icons';

export function AboutModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-dialog about-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">About</span>
          <button className="modal-close" onClick={onClose}><IconX size={14} /></button>
        </div>
        <div className="about-body">
          <div className="about-logo">
            <svg viewBox="0 0 48 48" fill="none" width="48" height="48">
              <rect width="48" height="48" rx="11" fill="#2563EB"/>
              <path d="M38 24 L31 36.1 L17 36.1 L10 24 L17 11.9 L31 11.9 Z"
                    fill="none" stroke="#FFFFFF" strokeWidth="2.8"
                    strokeLinejoin="round" strokeLinecap="round"/>
              <g stroke="#FFFFFF" strokeWidth="1.9" strokeLinecap="round">
                <line x1="24" y1="17.8" x2="18.5" y2="28.1"/>
                <line x1="24" y1="17.8" x2="29.5" y2="28.1"/>
                <line x1="18.5" y1="28.1" x2="29.5" y2="28.1"/>
              </g>
              <g fill="#FFFFFF">
                <circle cx="24" cy="17.8" r="2.8"/>
                <circle cx="18.5" cy="28.1" r="2.8"/>
                <circle cx="29.5" cy="28.1" r="2.8"/>
              </g>
            </svg>
          </div>
          <div className="about-product">
            <span className="about-brand">Autopath</span>
            <span className="about-name">Workflow Studio</span>
            <span className="about-version">Version 1.1.0</span>
          </div>
          <p className="about-desc">
            Visual RPA Workflow Designer.<br />
            Design the path, the bot walks it.
          </p>
          <div className="about-meta">
            <div className="about-meta__row">
              <span>Platform</span>
              <strong>Electron 28 + React 18</strong>
            </div>
            <div className="about-meta__row">
              <span>Author</span>
              <strong>Rifky Andigta Al-Fathir</strong>
            </div>
            <div className="about-meta__row">
              <span>License</span>
              <strong>MIT</strong>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn--secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

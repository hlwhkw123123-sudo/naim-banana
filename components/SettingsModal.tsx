
import React from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSize: string;
  onSizeChange: (size: string) => void;
}

const SIZES = ['512x512', '1024x1024', '2048x2048'];

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentSize, onSizeChange }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
      <div 
        className="bg-dark-surface rounded-2xl p-8 w-full max-w-md shadow-2xl relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <h2 id="settings-modal-title" className="text-2xl font-bold mb-6 text-dark-text">Settings</h2>
        
        <div>
          <label className="block text-dark-subtle text-sm mb-2 font-semibold">Output Image Size</label>
          <p className="text-dark-subtle text-xs mb-4">
            Note: This setting will apply to text-to-image generation. Image editing preserves the original image dimensions.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SIZES.map(size => (
              <button
                key={size}
                onClick={() => onSizeChange(size)}
                className={`py-3 rounded-lg text-sm font-semibold transition-colors ${
                  currentSize === size
                    ? 'bg-banana-yellow text-black'
                    : 'bg-[#111] hover:bg-gray-700'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 text-right">
          <button
            onClick={onClose}
            className="bg-banana-yellow text-black font-bold py-2 px-6 rounded-lg transition-transform hover:scale-105 active:scale-100"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

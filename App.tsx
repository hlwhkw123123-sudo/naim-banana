
import React, { useState, useCallback, useMemo } from 'react';
import { editImageWithGemini } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import { getDailyGenerationCount, incrementDailyGenerationCount } from './utils/rateLimiter';
import { Spinner } from './components/Spinner';
import { UploadIcon, SparklesIcon, DownloadIcon, SettingsIcon, UndoIcon, RedoIcon } from './components/Icons';
import { SettingsModal } from './components/SettingsModal';

// NOTE: The MAX_EDITS is managed by component state and resets with each new image.
// The daily generation limit is now managed via localStorage.
const MAX_EDITS = 10;
const DAILY_IMAGE_GENERATION_LIMIT = 1;

export default function App() {
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [editCount, setEditCount] = useState<number>(0);
  // Initialize generation count from localStorage for persistence.
  const [generatedToday, setGeneratedToday] = useState<number>(getDailyGenerationCount);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [outputSize, setOutputSize] = useState('1024x1024');

  const currentImage = useMemo(() => history[historyIndex], [history, historyIndex]);
  const canUndo = useMemo(() => historyIndex > 0, [historyIndex]);
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history]);

  const canEdit = useMemo(() => editCount < MAX_EDITS, [editCount]);
  const canGenerate = useMemo(() => generatedToday < DAILY_IMAGE_GENERATION_LIMIT, [generatedToday]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (!canGenerate && history.length === 0) {
        setError('You have reached your daily image generation limit.');
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        
        const img = new Image();
        img.onload = () => {
          const ratio = img.width / img.height;
          if (Math.abs(ratio - 1) < 0.05) {
            setAspectRatio('1:1');
          } else if (ratio > 1) {
            setAspectRatio('16:9');
          } else {
            setAspectRatio('9:16');
          }
        };
        img.src = base64;

        setHistory([base64]);
        setHistoryIndex(0);
        setEditCount(0);
        
        if (history.length === 0) {
            // This is the first generation of the day. Increment the persistent counter.
            const newCount = incrementDailyGenerationCount();
            setGeneratedToday(newCount);
        }

      } catch (err) {
        setError('Failed to load image. Please try again.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleEditSubmit = useCallback(async () => {
    if (!prompt || !currentImage || !canEdit) {
      if (!canEdit) setError(`You've reached the maximum of ${MAX_EDITS} edits for this image.`);
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const base64Data = currentImage.split(',')[1];
      const mimeType = currentImage.match(/data:(.*);base64,/)?.[1] || 'image/png';
      
      const newImageBase64 = await editImageWithGemini(base64Data, mimeType, prompt);
      const newImageSrc = `data:${mimeType};base64,${newImageBase64}`;

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newImageSrc);

      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setEditCount(prev => prev + 1);
      setPrompt('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to edit image: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, currentImage, canEdit, history, historyIndex, outputSize]);

  const handleSaveImage = useCallback(() => {
    if (!currentImage) return;

    const link = document.createElement('a');
    link.href = currentImage;
    const mimeType = currentImage.match(/data:(.*);base64,/)?.[1] || 'image/png';
    const extension = mimeType.split('/')[1] || 'png';
    link.download = `naim-banana-edit-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentImage]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
        setHistoryIndex(prev => prev - 1);
    }
  }, [canUndo]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
        setHistoryIndex(prev => prev + 1);
    }
  }, [canRedo]);


  const ImageUploadArea = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-dark-surface rounded-2xl border-2 border-dashed border-dark-subtle p-8 text-center cursor-pointer hover:border-banana-yellow transition-colors">
      <UploadIcon className="w-16 h-16 text-dark-subtle mb-4" />
      <h2 className="text-xl font-semibold text-dark-text">Upload an Image</h2>
      <p className="text-dark-subtle mt-1">
        {canGenerate ? 'You have 1 free image generation today.' : 'Daily generation limit reached.'}
      </p>
      <input
        type="file"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        onChange={handleImageUpload}
        accept="image/png, image/jpeg, image/webp"
        disabled={isLoading || !canGenerate}
      />
    </div>
  );
  
  const aspectRatioClasses: { [key: string]: string } = {
    '1:1': 'aspect-square',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col font-sans">
      <header className="w-full p-4 flex justify-between items-center sticky top-0 bg-dark-bg/80 backdrop-blur-sm z-10">
        <h1 className="text-2xl font-bold text-banana-yellow">Naim Banana</h1>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 rounded-full hover:bg-dark-surface transition-colors"
          aria-label="Open settings"
        >
          <SettingsIcon className="w-6 h-6 text-dark-subtle" />
        </button>
      </header>

      <main className="flex-grow flex flex-col lg:flex-row p-4 lg:p-8 gap-8 items-stretch">
        <div className="w-full lg:w-1/3 lg:max-w-md flex flex-col gap-4 order-2 lg:order-1">
          <div className="bg-dark-surface rounded-2xl p-6 flex-grow flex flex-col justify-between shadow-lg">
            <div>
              <label htmlFor="prompt-input" className="block text-dark-subtle text-sm mb-2">Describe the changes you want to make.</label>
              <textarea
                id="prompt-input"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='e.g., "Add a retro filter" or "Make the sky purple"'
                className="w-full h-32 p-3 bg-[#111] rounded-lg resize-none focus:ring-2 focus:ring-banana-yellow focus:outline-none transition-shadow"
                disabled={!currentImage || isLoading || !canEdit}
              />
            </div>

            <div className="mt-4">
               {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
               <div className="flex justify-between items-center text-sm text-dark-subtle mb-4">
                 <span>Edit Count:</span>
                 <span className="font-mono text-dark-text">{editCount} / {MAX_EDITS}</span>
               </div>
               <div className="flex justify-between items-center text-sm text-dark-subtle mb-4">
                 <span>Daily Generations:</span>
                 <span className="font-mono text-dark-text">{DAILY_IMAGE_GENERATION_LIMIT - generatedToday} / {DAILY_IMAGE_GENERATION_LIMIT}</span>
               </div>
              
              <div className="flex flex-col gap-2">
                 <div className="flex gap-2">
                    <button
                        onClick={handleUndo}
                        disabled={!canUndo || isLoading}
                        className="flex-1 bg-dark-subtle text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                        aria-label="Undo last edit"
                    >
                        <UndoIcon className="w-5 h-5" />
                        Undo
                    </button>
                     <button
                        onClick={handleRedo}
                        disabled={!canRedo || isLoading}
                        className="flex-1 bg-dark-subtle text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                        aria-label="Redo last edit"
                    >
                        <RedoIcon className="w-5 h-5" />
                        Redo
                    </button>
                    <button
                        onClick={handleSaveImage}
                        disabled={!currentImage || isLoading}
                        className="p-3 bg-dark-subtle text-white font-bold rounded-lg flex items-center justify-center transition-colors hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed"
                        aria-label="Save image"
                    >
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                 </div>
                <button
                  onClick={handleEditSubmit}
                  disabled={!prompt || !currentImage || isLoading || !canEdit}
                  className="w-full bg-banana-yellow text-black font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-100 disabled:bg-dark-subtle disabled:cursor-not-allowed disabled:scale-100"
                >
                  {isLoading ? (
                    <>
                      <Spinner /> Generating...
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="w-5 h-5" /> Generate Edit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-2/3 flex-grow flex items-center justify-center order-1 lg:order-2">
          <div className={`${aspectRatioClasses[aspectRatio]} w-full max-w-full lg:max-h-[80vh] bg-black rounded-4xl flex items-center justify-center relative shadow-2xl overflow-hidden`}>
            {isLoading && !currentImage && (
              <div className="flex flex-col items-center justify-center text-dark-text">
                <Spinner />
                <p className="mt-4">Loading your image...</p>
              </div>
            )}
            {!currentImage && !isLoading && <ImageUploadArea />}
            {currentImage && (
              <img
                src={currentImage}
                alt="User generated content"
                className={`object-contain w-full h-full transition-opacity duration-300 ${isLoading ? 'opacity-50' : 'opacity-100'}`}
              />
            )}
             {isLoading && currentImage && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Spinner />
                </div>
            )}
          </div>
        </div>
      </main>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentSize={outputSize}
        onSizeChange={setOutputSize}
      />
    </div>
  );
}

import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Pen, RotateCcw, Check, X } from 'lucide-react';

interface SignatureCanvasProps {
  title: string;
  onSave: (signature: string) => void;
  onClose: () => void;
  existingSignature?: string;
}

export const SignatureCanvasComponent: React.FC<SignatureCanvasProps> = ({
  title,
  onSave,
  onClose,
  existingSignature
}) => {
  const sigCanvasRef = useRef<SignatureCanvas>(null);

  const clearSignature = () => {
    sigCanvasRef.current?.clear();
  };

  const saveSignature = () => {
    if (sigCanvasRef.current?.isEmpty()) {
      alert('Veuillez signer avant de valider');
      return;
    }

    const dataUrl = sigCanvasRef.current?.toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-[#29235C] flex items-center gap-2">
            <Pen className="w-5 h-5" />
            {title}
          </h3>
          <button
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4">
            <p className="text-center text-gray-600 mb-4">
              Signez dans la zone ci-dessous avec votre doigt ou un stylet
            </p>

            <div className="border border-gray-200 rounded-lg bg-gray-50">
              <SignatureCanvas
                ref={sigCanvasRef}
                canvasProps={{
                  className: 'w-full h-48 rounded-lg',
                  style: { background: 'white' }
                }}
                penColor="#29235C"
                minWidth={1}
                maxWidth={3}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <button
              onClick={clearSignature}
              className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Effacer
            </button>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 min-h-[44px] text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveSignature}
                className="flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] bg-[#E72C63] text-white rounded-lg hover:bg-[#d12656] transition-colors"
              >
                <Check className="w-5 h-5" />
                Valider
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
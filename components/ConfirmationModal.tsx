import React from 'react';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  onConfirm,
  onCancel,
  variant = 'danger'
}) => {
  if (!isOpen) return null;

  const iconColor = variant === 'danger' ? 'text-red-500' : variant === 'warning' ? 'text-orange-500' : 'text-blue-500';
  const confirmButtonBg = variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : variant === 'warning' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600';
  const Icon = variant === 'danger' ? AlertTriangle : variant === 'warning' ? AlertTriangle : Info;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Icona */}
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 ${iconColor} flex items-center justify-center`}>
            <Icon size={48} strokeWidth={2} />
          </div>
        </div>

        {/* Titolo */}
        <h3 className="text-2xl font-black text-black text-center mb-4">
          {title}
        </h3>

        {/* Messaggio */}
        <p className="text-sm text-gray-600 text-center mb-8 leading-relaxed">
          {message}
        </p>

        {/* Pulsanti */}
        <div className="flex gap-4">
          <button 
            onClick={onCancel} 
            className="flex-1 bg-white border-2 border-gray-200 text-gray-700 py-4 px-6 rounded-2xl font-black text-base hover:bg-gray-50 active:scale-95 transition-all"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={`flex-1 ${confirmButtonBg} text-white py-4 px-6 rounded-2xl font-black text-base active:scale-95 transition-all shadow-lg`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

interface AlertModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}

export const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  title,
  message,
  buttonText = 'Ok',
  onClose,
  variant = 'info'
}) => {
  if (!isOpen) return null;

  const iconColor = variant === 'danger' ? 'text-red-500' : variant === 'warning' ? 'text-orange-500' : variant === 'success' ? 'text-green-500' : 'text-blue-500';
  const buttonBg = variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : variant === 'warning' ? 'bg-orange-500 hover:bg-orange-600' : variant === 'success' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600';
  const Icon = variant === 'success' ? CheckCircle : variant === 'danger' ? AlertTriangle : variant === 'warning' ? AlertTriangle : Info;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Icona */}
        <div className="flex justify-center mb-6">
          <div className={`w-16 h-16 ${iconColor} flex items-center justify-center`}>
            <Icon size={48} strokeWidth={2} />
          </div>
        </div>

        {/* Titolo */}
        <h3 className="text-2xl font-black text-black text-center mb-4">
          {title}
        </h3>

        {/* Messaggio */}
        <p className="text-sm text-gray-600 text-center mb-8 leading-relaxed">
          {message}
        </p>

        {/* Pulsante */}
        <button 
          onClick={onClose} 
          className={`w-full ${buttonBg} text-white py-4 px-6 rounded-2xl font-black text-base active:scale-95 transition-all shadow-lg`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default ConfirmationModal;

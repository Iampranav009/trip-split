import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isDangerous?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isDangerous = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onCancel}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-scale-in">
                {/* Header with gradient accent */}
                <div className={`h-2 ${isDangerous ? 'bg-gradient-to-r from-rose-500 to-red-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}></div>

                <div className="p-6">
                    {/* Icon */}
                    <div className={`w-16 h-16 rounded-full ${isDangerous ? 'bg-rose-100' : 'bg-indigo-100'} flex items-center justify-center mx-auto mb-4 animate-pop`}>
                        <AlertTriangle
                            size={32}
                            className={isDangerous ? 'text-rose-600' : 'text-indigo-600'}
                            strokeWidth={2.5}
                        />
                    </div>

                    {/* Close button */}
                    <button
                        onClick={onCancel}
                        className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>

                    {/* Title */}
                    <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                        {title}
                    </h3>

                    {/* Message */}
                    <p className="text-gray-600 text-center mb-6">
                        {message}
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all active:scale-95"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onCancel();
                            }}
                            className={`flex-1 px-4 py-3 text-white font-semibold rounded-xl transition-all active:scale-95 shadow-lg ${isDangerous
                                    ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                                }`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useRef } from 'react';
import { Upload, Camera, Check } from 'lucide-react';
import imageCompression from 'browser-image-compression';

const AVATAR_BOY = "/images/avatar_boy.png";
const AVATAR_GIRL = "/images/avatar_girl.png";

// Additional default avatars (you can add more)
const DEFAULT_AVATARS = [
    AVATAR_BOY,
    AVATAR_GIRL,
];

interface AvatarSelectorProps {
    currentAvatar?: string;
    onSelect: (avatarUrl: string, isCustom?: boolean) => void;
    showUpload?: boolean;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({
    currentAvatar,
    onSelect,
    showUpload = true
}) => {
    const [selectedAvatar, setSelectedAvatar] = useState<string>(currentAvatar || AVATAR_BOY);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSelectDefault = (avatar: string) => {
        setSelectedAvatar(avatar);
        onSelect(avatar, false);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            // Compress image
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 400,
                useWebWorker: true
            };

            const compressedFile = await imageCompression(file, options);

            // Convert to base64 for storage
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setSelectedAvatar(base64String);
                onSelect(base64String, true);
                setUploading(false);
            };
            reader.readAsDataURL(compressedFile);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please try again.');
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Default Avatars */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Choose a default avatar
                </label>
                <div className="flex gap-4 justify-center flex-wrap">
                    {DEFAULT_AVATARS.map((avatar, index) => (
                        <button
                            key={index}
                            onClick={() => handleSelectDefault(avatar)}
                            className={`relative rounded-full p-1 transition-all ${selectedAvatar === avatar && !selectedAvatar.startsWith('data:')
                                    ? 'ring-4 ring-indigo-500 scale-110'
                                    : 'opacity-60 hover:opacity-100 hover:scale-105'
                                }`}
                        >
                            <img
                                src={avatar}
                                alt={`Avatar ${index + 1}`}
                                className="w-20 h-20 rounded-full border-2 border-white shadow-lg"
                            />
                            {selectedAvatar === avatar && !selectedAvatar.startsWith('data:') && (
                                <div className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-1 shadow-lg">
                                    <Check size={16} strokeWidth={3} />
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Upload */}
            {showUpload && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-px bg-gray-200 flex-1"></div>
                        <span className="text-sm text-gray-500">or</span>
                        <div className="h-px bg-gray-200 flex-1"></div>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 hover:border-indigo-400 rounded-2xl p-6 transition-all flex flex-col items-center gap-3 active:scale-98 disabled:opacity-50"
                    >
                        {uploading ? (
                            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <>
                                {selectedAvatar.startsWith('data:') ? (
                                    <div className="relative">
                                        <img
                                            src={selectedAvatar}
                                            alt="Custom avatar"
                                            className="w-20 h-20 rounded-full border-4 border-indigo-500 shadow-lg"
                                        />
                                        <div className="absolute -bottom-1 -right-1 bg-indigo-600 text-white rounded-full p-1.5 shadow-lg">
                                            <Check size={16} strokeWidth={3} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600">
                                        <Camera size={32} />
                                    </div>
                                )}
                                <div className="text-center">
                                    <p className="font-semibold text-gray-700">
                                        {selectedAvatar.startsWith('data:') ? 'Change Custom Avatar' : 'Upload Custom Avatar'}
                                    </p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        JPG, PNG or GIF • Max 5MB
                                    </p>
                                </div>
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

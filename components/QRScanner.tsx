import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera } from 'lucide-react';

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const frameRef = useRef<number>(0);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState('');
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let active = true;

        const start = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                });
                if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
                streamRef.current = stream;
                const video = videoRef.current;
                if (!video) return;
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play();
                    setReady(true);
                    frameRef.current = requestAnimationFrame(tick);
                };
            } catch (err: any) {
                if (!active) return;
                setError(
                    err.name === 'NotAllowedError'
                        ? 'Camera permission denied. Please allow camera access in your browser settings.'
                        : 'Camera not available on this device. Please enter the code manually.'
                );
            }
        };

        const tick = () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || !active) return;
            if (video.readyState < video.HAVE_ENOUGH_DATA) {
                frameRef.current = requestAnimationFrame(tick);
                return;
            }
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) return;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert',
            });
            if (code) {
                active = false;
                streamRef.current?.getTracks().forEach(t => t.stop());
                onScan(code.data);
                return;
            }
            frameRef.current = requestAnimationFrame(tick);
        };

        start();

        return () => {
            active = false;
            cancelAnimationFrame(frameRef.current);
            streamRef.current?.getTracks().forEach(t => t.stop());
        };
    }, [onScan]);

    return (
        <div className="relative rounded-2xl overflow-hidden bg-black w-full" style={{ aspectRatio: '1/1' }}>
            {error ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-3">
                    <Camera size={40} className="text-gray-500" />
                    <p className="text-gray-300 text-sm leading-relaxed">{error}</p>
                    <button
                        onClick={onClose}
                        className="mt-1 bg-white/10 text-white text-sm font-semibold px-5 py-2.5 rounded-xl active:scale-95 transition-all"
                    >
                        Enter code manually
                    </button>
                </div>
            ) : (
                <>
                    <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="absolute inset-0 bg-black/50" />

                        {/* Viewfinder */}
                        <div className="relative w-52 h-52 z-10">
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white rounded-tl-xl" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white rounded-tr-xl" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white rounded-bl-xl" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white rounded-br-xl" />

                            {/* Scanning line */}
                            {ready && (
                                <div className="absolute left-2 right-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent rounded-full animate-scan-line" />
                            )}
                        </div>
                    </div>

                    <p className="absolute bottom-4 left-0 right-0 text-center text-white/70 text-xs font-medium pointer-events-none">
                        Align QR code within the frame
                    </p>
                </>
            )}

            {/* Close button */}
            <button
                onClick={onClose}
                className="absolute top-3 right-3 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white active:scale-90 transition-all z-20"
            >
                <X size={18} />
            </button>
        </div>
    );
};

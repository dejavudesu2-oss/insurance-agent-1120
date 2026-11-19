import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

export interface TakePictureOptions {
  quality?: number;
  base64?: boolean;
  width?: number;
  doNotSave?: boolean;
}

export interface TakePictureResponse {
  uri: string;
  base64?: string;
  width: number;
  height: number;
}

export interface RNCameraProps {
  type?: 'environment' | 'user';
  flashMode?: 'off' | 'on' | 'auto' | 'torch';
  captureAudio?: boolean;
  autoStart?: boolean;
  previewOverrideDataUrl?: string | null;
  className?: string;
  children?: React.ReactNode;
  onCameraReady?: () => void;
  onMountError?: (event: { message: string }) => void;
}

export interface RNCameraHandle {
  takePictureAsync: (options?: TakePictureOptions) => Promise<TakePictureResponse>;
  startStream: () => Promise<boolean>;
  stopStream: () => void;
  isStreaming: () => boolean;
}

const CameraConstants = {
  Type: {
    back: 'environment' as const,
    front: 'user' as const,
  },
  FlashMode: {
    off: 'off' as const,
    on: 'on' as const,
    auto: 'auto' as const,
    torch: 'torch' as const,
  },
};

type RNCameraComponent = React.ForwardRefExoticComponent<
  RNCameraProps & React.RefAttributes<RNCameraHandle>
> & {
  Constants: typeof CameraConstants;
};

const RNCameraBase = forwardRef<RNCameraHandle, RNCameraProps>(
  (
    {
      type = CameraConstants.Type.back,
      flashMode = CameraConstants.FlashMode.off,
      captureAudio = false,
      autoStart = true,
      previewOverrideDataUrl = null,
      className = '',
      children,
      onCameraReady,
      onMountError,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const overrideImgRef = useRef<HTMLImageElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [streaming, setStreaming] = useState(false);

    const stopStream = useCallback(() => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setStreaming(false);
    }, []);

    const startStream = useCallback(async (): Promise<boolean> => {
      stopStream();
      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        typeof navigator.mediaDevices.getUserMedia !== 'function'
      ) {
        onMountError?.({
          message: 'Camera hardware API unavailable in this browser context.',
        });
        return false;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: type },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: captureAudio,
        });

        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
        }

        // Apply hardware torch constraint when supported on mobile devices
        const videoTrack = mediaStream.getVideoTracks()[0];
        if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
          const capabilities = (videoTrack as any).getCapabilities?.() || {};
          if (capabilities.torch) {
            await videoTrack
              .applyConstraints({
                advanced: [{ torch: flashMode === 'torch' || flashMode === 'on' }] as any,
              })
              .catch(() => {});
          }
        }

        setStreaming(true);
        onCameraReady?.();
        return true;
      } catch (err: any) {
        setStreaming(false);
        onMountError?.({
          message:
            err?.message ||
            'Physical camera unavailable or permission declined. Upload a document image or stage a physical specimen card below.',
        });
        return false;
      }
    }, [type, captureAudio, flashMode, stopStream, onCameraReady, onMountError]);

    useEffect(() => {
      if (autoStart && !previewOverrideDataUrl) {
        startStream();
      } else if (previewOverrideDataUrl) {
        stopStream();
      }
      return () => {
        stopStream();
      };
    }, [autoStart, type, previewOverrideDataUrl, startStream, stopStream]);

    useImperativeHandle(
      ref,
      () => ({
        startStream,
        stopStream,
        isStreaming: () => streaming,
        takePictureAsync: async (
          options: TakePictureOptions = {}
        ): Promise<TakePictureResponse> => {
          const quality = options.quality ?? 0.92;
          const canvas = document.createElement('canvas');

          // Case 1: Staged specimen or uploaded document image inside RNCamera viewfinder
          if (previewOverrideDataUrl && overrideImgRef.current) {
            const img = overrideImgRef.current;
            const targetW = options.width || img.naturalWidth || 960;
            const aspect =
              img.naturalWidth && img.naturalHeight
                ? img.naturalHeight / img.naturalWidth
                : 0.63;
            const targetH = Math.round(targetW * aspect);
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Unable to initialize capture canvas.');
            }
            ctx.drawImage(img, 0, 0, targetW, targetH);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const rawBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
            return {
              uri: dataUrl,
              base64: options.base64 ? rawBase64 : undefined,
              width: targetW,
              height: targetH,
            };
          }

          // Case 2: Live hardware video stream capture
          const video = videoRef.current;
          if (!video || !streaming || video.videoWidth === 0) {
            throw new Error(
              'No active camera frame detected. Start your device camera, upload a photo, or stage a physical specimen card first.'
            );
          }

          const targetW = options.width || video.videoWidth;
          const targetH = Math.round((targetW * video.videoHeight) / video.videoWidth);
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Unable to initialize capture canvas.');
          }
          ctx.drawImage(video, 0, 0, targetW, targetH);

          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const rawBase64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          return {
            uri: dataUrl,
            base64: options.base64 ? rawBase64 : undefined,
            width: targetW,
            height: targetH,
          };
        },
      }),
      [previewOverrideDataUrl, streaming, startStream, stopStream]
    );

    return (
      <div
        data-testid="rncamera-viewfinder"
        className={`relative overflow-hidden bg-slate-950 ${className}`}
      >
        {previewOverrideDataUrl ? (
          <img
            ref={overrideImgRef}
            src={previewOverrideDataUrl}
            alt="Staged physical identity document inside camera viewfinder"
            className="h-full w-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className={`h-full w-full object-cover ${
              type === 'user' ? '-scale-x-100' : ''
            }`}
          />
        )}
        {children}
      </div>
    );
  }
);

RNCameraBase.displayName = 'RNCamera';

export const RNCamera: RNCameraComponent = Object.assign(RNCameraBase, {
  Constants: CameraConstants,
});

export default RNCamera;

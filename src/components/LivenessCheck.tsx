import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, AlertTriangle, Trash2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BlockchainService from '@/services/BlockchainService';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type Riddle = {
  id: string;
  question: string;
  answer?: string;
};

const LivenessCheck = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [referencePicture, setReferencePicture] = useState<string | null>(null);
  const [isFundsLocked, setIsFundsLocked] = useState(true);
  const [showFundsUnlockedMessage, setShowFundsUnlockedMessage] = useState(false); // New state for message display
  const [address, setAddress] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isSecureContext, setIsSecureContext] = useState<boolean>(true);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [showRiddleVerification, setShowRiddleVerification] = useState(false);
  const [riddle, setRiddle] = useState<Riddle | null>(null);
  const [riddleAnswer, setRiddleAnswer] = useState('');
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [faceTag, setFaceTag] = useState('person1'); // Simulate face identity for testing
  const [referenceFaceTag, setReferenceFaceTag] = useState<string | null>(null); // Track the face tag of the reference picture

  // Initialize component and check camera availability
  useEffect(() => {
    const initialize = async () => {
      try {
        const userAddress = await BlockchainService.connectWallet();
        setAddress(userAddress);

        const response = await axios.get(`${API_BASE_URL}/api/liveness/${userAddress}`);
        setReferencePicture(response.data.referencePicture);
        setIsFundsLocked(response.data.isFundsLocked);
        setReferenceFaceTag(response.data.faceTag || 'person1'); // Load the reference face tag if available

        setIsSecureContext(window.isSecureContext || window.location.hostname === 'localhost');

        // Check camera availability
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          setHasCameraAccess(devices.some(device => device.kind === 'videoinput'));
        } catch (error) {
          setHasCameraAccess(false);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to initialize liveness check",
          variant: "destructive",
        });
      }
    };

    initialize();

    return () => {
      stopCamera();
    };
  }, [toast]);

  // Start the webcam
  const startCamera = useCallback(async () => {
    if (!isSecureContext) {
      toast({
        title: "Secure Context Required",
        description: "Camera access requires HTTPS. Please host the app on HTTPS or use localhost.",
        variant: "destructive",
      });
      return;
    }

    setIsCameraLoading(true);

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await new Promise((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = resolve;
          }
        });
        await videoRef.current.play();
        setStream(mediaStream);
        setIsCameraActive(true);
        setVerificationFailed(false); // Reset verification state when camera starts
        console.log('Camera started successfully');
      } else {
        throw new Error('Video element not found');
      }
    } catch (error: any) {
      console.error('Camera error:', error);
      let errorMessage = "Failed to access the camera. Please grant permission and try again.";
      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera access denied. Please enable camera permissions in your browser settings.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera found. Please ensure a camera is connected and try again.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera is in use by another application. Please close other apps and try again.";
      }
      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCameraLoading(false);
    }
  }, [isSecureContext, toast]);

  // Stop the webcam
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setVerificationFailed(false); // Reset verification state when camera stops
      console.log('Camera stopped');
    }
  }, [stream]);

  // Capture a photo from the webcam
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      console.error('Video or canvas element not available');
      return null;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      console.error('Could not get canvas context');
      return null;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg');
    return base64; // Return clean base64 string without query parameters
  }, []);

  // Set the reference picture
  const handleSetReference = useCallback(async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive",
      });
      return;
    }

    const photo = capturePhoto();
    if (!photo) {
      toast({
        title: "Error",
        description: "Failed to capture reference photo",
        variant: "destructive",
      });
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/api/liveness/reference/${address}`, {
        referencePicture: photo,
        faceTag: faceTag, // Send faceTag as a separate field
      });
      setReferencePicture(photo);
      setReferenceFaceTag(faceTag); // Store the face tag of the reference picture
      stopCamera();
      toast({
        title: "Success",
        description: "Reference picture set successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to set reference picture",
        variant: "destructive",
      });
    }
  }, [address, capturePhoto, faceTag, stopCamera, toast]);

  // Initiate riddle verification before removing reference picture
  const initiateRemoveReference = useCallback(async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/riddle/${address}`);
      const fetchedRiddle = response.data;
      if (!fetchedRiddle || !fetchedRiddle.question) {
        throw new Error("No riddle available. Please set a riddle in the Inheritance Dashboard.");
      }
      setRiddle(fetchedRiddle);
      setShowRiddleVerification(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.error || error.message || "Failed to fetch riddle",
        variant: "destructive",
      });
    }
  }, [address, toast]);

  // Verify riddle answer and remove reference picture if correct
  const verifyRiddleAndRemove = useCallback(async () => {
    if (!address || !riddle) {
      toast({
        title: "Error",
        description: "Wallet not connected or riddle not loaded",
        variant: "destructive",
      });
      return;
    }

    try {
      // Verify the riddle answer
      const response = await axios.post(`${API_BASE_URL}/api/riddle/verify/${address}`, {
        riddleId: riddle.id,
        answer: riddleAnswer,
      });

      if (response.data.success) {
        // If riddle is verified, remove the reference picture
        await axios.delete(`${API_BASE_URL}/api/liveness/reference/${address}`);
        setReferencePicture(null);
        setReferenceFaceTag(null); // Reset the reference face tag
        setShowRiddleVerification(false);
        setRiddleAnswer('');
        setRiddle(null);
        toast({
          title: "Success",
          description: "Riddle verified and reference picture removed successfully",
        });
      } else {
        throw new Error("Incorrect answer");
      }
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.response?.data?.error || error.message || "Incorrect riddle answer",
        variant: "destructive",
      });
    }
  }, [address, riddle, riddleAnswer, toast]);

  // Cancel riddle verification
  const cancelRiddleVerification = useCallback(() => {
    setShowRiddleVerification(false);
    setRiddleAnswer('');
    setRiddle(null);
  }, []);

  // Verify the liveness check
  const handleVerify = useCallback(async () => {
    if (!address) {
      toast({
        title: "Error",
        description: "Wallet not connected",
        variant: "destructive",
      });
      return;
    }

    const photo = capturePhoto();
    if (!photo) {
      toast({
        title: "Error",
        description: "Failed to capture photo for verification",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/liveness/verify/${address}`, {
        capturedPicture: photo,
        faceTag: faceTag, // Send faceTag as a separate field
      });
      if (response.data.success) {
        setIsFundsLocked(false);
        setShowFundsUnlockedMessage(true); // Show the message only after successful verification
        setVerificationFailed(false);
        stopCamera();
        toast({
          title: "Verified",
          description: "Liveness check passed. Funds unlocked.",
        });
      } else {
        setVerificationFailed(true);
        toast({
          title: "Verification Failed",
          description: response.data.error || "Face does not match the reference picture",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setVerificationFailed(true);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to verify liveness",
        variant: "destructive",
      });
    }
  }, [address, capturePhoto, faceTag, stopCamera, toast]);

  // Toggle face tag to simulate different faces
  const toggleFaceTag = () => {
    setFaceTag((prev) => (prev === 'person1' ? 'person2' : 'person1'));
  };

  return (
    <div className="grid-bg">
      <div className="mb-6">
        <h2 className="text-2xl font-mono font-bold mb-1">
          LIVENESS <span className="text-neo-accent">CHECK</span>
        </h2>
        <p className="text-white/70 font-mono">Verify your identity to access your funds</p>
      </div>

      <div className="bg-black/30 neo-brutalist p-6 flex flex-col items-center">
        <div className={`relative w-[640px] h-[480px] border ${verificationFailed ? 'border-red-500' : 'border-white/10'} mb-4`}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
            onError={(e) => console.error('Video element error:', e)}
          />
          {!isCameraActive && (
            <div className="w-full h-full flex items-center justify-center bg-black/20">
              {hasCameraAccess === false ? (
                <div className="text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                  <p className="text-red-500 font-mono">No camera available</p>
                </div>
              ) : isCameraLoading ? (
                <div className="text-center">
                  <Camera className="w-12 h-12 text-white/50 animate-pulse mx-auto mb-2" />
                  <p className="text-white/70 font-mono">Loading Camera...</p>
                </div>
              ) : (
                <Camera className="w-12 h-12 text-white/50" />
              )}
            </div>
          )}
          {verificationFailed && isCameraActive && (
            <div className="absolute top-2 left-2 bg-red-500/90 text-white font-mono px-3 py-1 rounded flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Face does not match. Please try again.
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <p className="font-mono text-white/70 mb-4 text-center">
          Prove you're alive! Say: <br />
          <span className="text-neo-accent">"My seed phrase is... never stored here."</span>
        </p>

        <div className="flex gap-4">
          {!isCameraActive ? (
            <>
              <button
                onClick={startCamera}
                disabled={isCameraLoading || hasCameraAccess === false}
                className={`bg-neo-accent/20 border border-neo-accent text-neo-accent font-mono py-2 px-4 ${
                  isCameraLoading || hasCameraAccess === false
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-neo-accent/40'
                }`}
              >
                {isCameraLoading
                  ? 'Starting Camera...'
                  : hasCameraAccess === false
                  ? 'Camera Not Available'
                  : 'Start Camera'}
              </button>
              {referencePicture && (
                <button
                  onClick={initiateRemoveReference}
                  className="bg-red-500/20 border border-red-500 text-red-500 font-mono py-2 px-4 hover:bg-red-500/40 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Face
                </button>
              )}
            </>
          ) : (
            <>
              {!referencePicture && (
                <button
                  onClick={handleSetReference}
                  className="bg-neo-accent/20 border border-neo-accent text-neo-accent font-mono py-2 px-4 hover:bg-neo-accent/40"
                >
                  Set Reference Picture
                </button>
              )}
              {referencePicture && (
                <>
                  <button
                    onClick={handleVerify}
                    className="bg-neo-accent/20 border border-neo-accent text-neo-accent font-mono py-2 px-4 hover:bg-neo-accent/40"
                  >
                    Verify → Unlock Funds →
                  </button>
                  <button
                    onClick={toggleFaceTag}
                    className="bg-yellow-500/20 border border-yellow-500 text-yellow-500 font-mono py-2 px-4 hover:bg-yellow-500/40"
                  >
                    Simulate {faceTag === referenceFaceTag ? 'Same Face' : 'Different Face'} ({faceTag})
                  </button>
                </>
              )}
              <button
                onClick={stopCamera}
                className="bg-red-500/20 border border-red-500 text-red-500 font-mono py-2 px-4 hover:bg-red-500/40"
              >
                Stop Camera
              </button>
            </>
          )}
        </div>

        {showRiddleVerification && riddle && (
          <div className="mt-4 p-4 border border-white/20 bg-white/5 w-full max-w-md">
            <h3 className="font-mono text-lg font-bold mb-2">Verify Your Identity</h3>
            <p className="font-mono text-white/90 mb-2">{riddle.question}</p>
            <p className="text-xs font-mono text-neo-accent mb-4">HINT: Check block 0.</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={riddleAnswer}
                onChange={(e) => setRiddleAnswer(e.target.value)}
                placeholder="Enter answer..."
                className="flex-1 bg-black/50 border border-white/20 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-neo-accent"
              />
              <button
                onClick={verifyRiddleAndRemove}
                className="bg-neo-accent/20 border border-neo-accent text-neo-accent font-mono py-2 px-4 hover:bg-neo-accent/40"
              >
                Verify
              </button>
              <button
                onClick={cancelRiddleVerification}
                className="bg-red-500/20 border border-red-500 text-red-500 font-mono py-2 px-4 hover:bg-red-500/40"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {showFundsUnlockedMessage && (
          <p className="mt-4 font-mono text-green-500">Funds Unlocked Successfully!</p>
        )}
      </div>
    </div>
  );
};

export default LivenessCheck;
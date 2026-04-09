import React, { useRef, useEffect, useState } from 'react';
import { Camera, Zap, RefreshCw, X } from 'lucide-react';

interface OpticalSensorProps {
  onCapture: (bpm: number) => void;
  onClose: () => void;
}

const OpticalSensor: React.FC<OpticalSensorProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [bpm, setBpm] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLowSignal, setIsLowSignal] = useState(false);

  // PPG Algorithm State
  const dataPoints = useRef<number[]>([]);
  const lastPeakTime = useRef<number>(0);
  const heartRates = useRef<number[]>([]);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Attempt to turn on Flash (Torch) - Only works on some Android/Chrome versions
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: true }] as any
          });
        }
      }
      setIsScanning(true);
      processFrames();
    } catch (err) {
      setError("Camera access denied. Ensure flash/camera permissions are active.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const processFrames = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const analyze = () => {
      if (!isScanning) return;

      ctx.drawImage(videoRef.current!, 0, 0, 100, 100);
      const imageData = ctx.getImageData(0, 0, 100, 100);
      const data = imageData.data;

      // Extract average Red intensity
      let rSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        rSum += data[i];
      }
      const avgR = rSum / (data.length / 4);

      // Hardening: Signal Validity Check
      // If Red channel is very low, the finger isn't over the flash
      if (avgR < 150) { 
        setIsLowSignal(true);
      } else {
        setIsLowSignal(false);
        handleDataPoint(avgR);
      }

      requestAnimationFrame(analyze);
    };

    analyze();
  };

  const handleDataPoint = (val: number) => {
    dataPoints.current.push(val);
    if (dataPoints.current.length > 300) dataPoints.current.shift();

    // Logic: If current value is higher than recent average, it might be a peak
    const recent = dataPoints.current.slice(-10);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;

    if (val > avg * 1.02) { // 2% threshold over baseline
      const now = Date.now();
      const diff = now - lastPeakTime.current;

      if (diff > 400 && diff < 1500) { // 40bpm to 150bpm range
        const currentBpm = Math.round(60000 / diff);
        heartRates.current.push(currentBpm);
        if (heartRates.current.length > 5) heartRates.current.shift();

        const stableBpm = Math.round(heartRates.current.reduce((a, b) => a + b, 0) / heartRates.current.length);
        setBpm(stableBpm);
        setConfidence(prev => Math.min(prev + 10, 100));
        
        if (confidence >= 90) {
          onCapture(stableBpm);
          stopCamera();
        }
      }
      lastPeakTime.current = now;
    }
  };

  return (
    <div className="obsidian-card" style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h3 className="technical" style={{ fontSize: '1rem', color: '#00F2FF' }}>OPTICAL SENTINEL</h3>
        <X size={18} style={{ cursor: 'pointer', color: '#849495' }} onClick={onClose} />
      </div>

      <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(0, 242, 255, 0.2)' }}>
        <video ref={videoRef} autoPlay playsInline style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', objectFit: 'cover', filter: 'grayscale(100%) opacity(0.3)' }} />
        <canvas ref={canvasRef} width="100" height="100" style={{ display: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: 'radial-gradient(circle, transparent 40%, #050505 100%)' }}>
          {bpm ? (
            <>
              <span className="metric-value" style={{ fontSize: '3rem' }}>{bpm}</span>
              <span className="technical" style={{ fontSize: '0.6rem', color: '#00F2FF' }}>CALCULATING...</span>
            </>
          ) : (
            <Camera size={40} style={{ color: '#00F2FF', opacity: 0.5 }} />
          )}
        </div>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span className="technical" style={{ fontSize: '0.6rem', color: '#849495' }}>SIGNAL INTEGRITY</span>
          <span className="technical" style={{ fontSize: '0.6rem', color: '#00F2FF' }}>{confidence}%</span>
        </div>
        <div className="pulse-container" style={{ height: '4px' }}>
          <div className="pulse-segment active" style={{ width: `${confidence}%`, height: '100%', borderRadius: '2px' }} />
        </div>
      </div>

      <p style={{ fontSize: '0.7rem', color: isLowSignal ? '#FF5050' : '#849495', marginTop: '1.5rem', lineHeight: 1.6 }}>
        {error || (isLowSignal ? "SIGNAL LOST: Ensure your finger completely covers the camera lens and flash sensor." : "Place your index finger firmly over the camera lens and flash sensor. Keep steady while the Sentinel acquires your hemodynamic pulse wave.")}
      </p>

      {error && (
        <button 
          onClick={startCamera}
          className="hs-badge-secure" 
          style={{ marginTop: '1rem', background: 'rgba(0, 242, 255, 0.1)', cursor: 'pointer', border: '1px solid rgba(0, 242, 255, 0.2)' }}
        >
          <RefreshCw size={12} />
          <span>RETRY SENSOR SYNC</span>
        </button>
      )}
    </div>
  );
};

export default OpticalSensor;

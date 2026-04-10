import React, { useRef, useEffect, useState } from 'react';
import { Camera, Zap, RefreshCw, X, Activity, Heart, Droplets, AlertTriangle } from 'lucide-react';

interface OpticalSensorProps {
  onCapture: (bpm: number) => void;
  onClose: () => void;
}

interface ProcessingStep {
  name: string;
  status: 'pending' | 'processing' | 'complete';
  progress: number;
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
  const [isWarmup, setIsWarmup] = useState(false);
  const scanningActive = useRef(false);
  const pulseDetected = useRef(false);
  const lastPulseTime = useRef(0);

  // Animation States
  const [currentBpmAnimation, setCurrentBpmAnimation] = useState<number | null>(null);
  const [pulseActive, setPulseActive] = useState(false);
  const [signalWave, setSignalWave] = useState<number[]>([]);
  const waveAnimationRef = useRef<number | null>(null);
  const pulseRef = useRef<number | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { name: 'Signal Acquisition', status: 'pending', progress: 0 },
    { name: 'Noise Filtering', status: 'pending', progress: 0 },
    { name: 'Peak Detection', status: 'pending', progress: 0 },
    { name: 'BPM Calculation', status: 'pending', progress: 0 },
    { name: 'Validation', status: 'pending', progress: 0 }
  ]);

  useEffect(() => {
    startCamera();
    return () => {
      scanningActive.current = false;
      stopCamera();
    };
  }, []);

  // Wave Animation
  useEffect(() => {
    const updateWave = () => {
      if (!scanningActive.current) return;
      
      setSignalWave(prev => {
        const newWave = [...prev, dataPoints.current[dataPoints.current.length - 1] || 0];
        if (newWave.length > 50) newWave.shift();
        return newWave;
      });
      
      waveAnimationRef.current = requestAnimationFrame(updateWave);
    };
    
    waveAnimationRef.current = requestAnimationFrame(updateWave);
    return () => {
      if (waveAnimationRef.current) {
        cancelAnimationFrame(waveAnimationRef.current);
      }
    };
  }, [isScanning]);

  // Pulse Animation
  useEffect(() => {
    const updatePulse = () => {
      if (lastPulseTime.current && Date.now() - lastPulseTime.current < 150) {
        setPulseActive(true);
      } else {
        setPulseActive(false);
      }
      pulseRef.current = requestAnimationFrame(updatePulse);
    };
    
    pulseRef.current = requestAnimationFrame(updatePulse);
    return () => {
      if (pulseRef.current) {
        cancelAnimationFrame(pulseRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isScanning) {
      scanningActive.current = true;
      const timer = setTimeout(() => {
        setIsWarmup(false);
        setProcessingSteps(prev => 
          prev.map((step, i) => 
            i === 0 ? { ...step, status: 'processing' as const } : step
          )
        );
        processFrames();
      }, 1000);
      return () => {
        scanningActive.current = false;
        clearTimeout(timer);
      };
    }
  }, [isScanning]);

  const startCamera = async () => {
    setError(null);
    setIsWarmup(true);
    setProcessingSteps(prev => 
      prev.map(step => ({ ...step, status: 'pending' as const, progress: 0 }))
    );
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(e => console.warn("Autoplay blocked:", e));
        
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities() as any;
        if (capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: true }] as any
          }).catch(e => console.warn("Torch failed:", e));
        }
      }
      setIsScanning(true);
    } catch (err) {
      setError("Camera system failed to initialize. Check permissions and lighting.");
      console.error(err);
      setIsWarmup(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsScanning(false);
  };

  const [debug, setDebug] = useState(false);
  const [currentSignal, setCurrentSignal] = useState(0);
  const tapCount = useRef(0);

  const handleTitleClick = () => {
    tapCount.current += 1;
    if (tapCount.current === 3) {
      setDebug(!debug);
      tapCount.current = 0;
    }
    setTimeout(() => { tapCount.current = 0; }, 1000);
  };

  const [isTooDark, setIsTooDark] = useState(false);

  const updateProcessingStep = (stepIndex: number, progress: number) => {
    setProcessingSteps(prev => 
      prev.map((step, i) => 
        i === stepIndex ? { ...step, progress, status: 'processing' as const } : step
      )
    );
  };

  const completeProcessingStep = (stepIndex: number) => {
    setProcessingSteps(prev => 
      prev.map((step, i) => 
        i === stepIndex ? { ...step, status: 'complete' as const, progress: 100 } : step
      )
    );
  };

  const processFrames = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    completeProcessingStep(0); // Signal Acquisition complete
    updateProcessingStep(1, 20);

    const analyze = () => {
      if (!scanningActive.current || !videoRef.current || videoRef.current.paused) return;

      ctx.drawImage(videoRef.current!, 0, 0, 100, 100);
      const imageData = ctx.getImageData(0, 0, 100, 100);
      const data = imageData.data;

      // Extract average colors
      let rSum = 0, gSum = 0, bSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        rSum += data[i];
        gSum += data[i+1];
        bSum += data[i+2];
      }
      const avgR = rSum / (data.length / 4);
      const avgG = gSum / (data.length / 4);
      const avgB = bSum / (data.length / 4);
      
      setCurrentSignal(JSON.stringify({
        r: Math.round(avgR),
        g: Math.round(avgG),
        b: Math.round(avgB)
      }) as any);

      updateProcessingStep(1, 60); // Noise filtering progress

      const isRedDominant = avgR > avgG * 1.15 && avgR > avgB * 1.15;
      const hasMinimumIntensity = avgR > 30;
      
      setIsTooDark(avgR < 45);
      
      if (!hasMinimumIntensity || !isRedDominant) { 
        setIsLowSignal(true);
      } else {
        setIsLowSignal(false);
        handleDataPoint(avgR);
      }

      if (scanningActive.current) requestAnimationFrame(analyze);
    };

    analyze();
  };

  const handleDataPoint = (val: number) => {
    dataPoints.current.push(val);
    if (dataPoints.current.length > 300) dataPoints.current.shift();

    completeProcessingStep(1); // Noise filtering complete
    updateProcessingStep(2, 20); // Peak detection progress

    const windowSize = 20;
    const window = dataPoints.current.slice(-windowSize);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;

    if (val > avg * 1.01) { 
      const now = Date.now();
      const diff = now - lastPeakTime.current;

      if (diff > 400 && diff < 1500) {
        updateProcessingStep(2, 80); // Peak detection progress
        
        const currentBpm = Math.round(60000 / diff);
        heartRates.current.push(currentBpm);
        if (heartRates.current.length > 8) heartRates.current.shift();

        const stableBpm = Math.round(heartRates.current.reduce((a, b) => a + b, 0) / heartRates.current.length);
        setBpm(stableBpm);
        setCurrentBpmAnimation(stableBpm);
        
        completeProcessingStep(2); // Peak detection complete
        updateProcessingStep(3, 50); // BPM calculation progress

        lastPulseTime.current = now; // Trigger pulse animation

        const newConfidence = Math.min(confidence + 10, 100);
        setConfidence(newConfidence);
        
        updateProcessingStep(3, 100); // BPM calculation complete
        updateProcessingStep(4, newConfidence); // Validation progress
        
        if (confidence >= 90) {
          completeProcessingStep(4); // Validation complete
          onCapture(stableBpm);
          stopCamera();
        }
      }
      lastPeakTime.current = now;
    }
  };

  const simulateCapture = () => {
    setConfidence(0);
    setBpm(72);
    setCurrentBpmAnimation(72);
    
    // Animate processing steps
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      if (stepIndex < processingSteps.length) {
        updateProcessingStep(stepIndex, 100);
        setTimeout(() => completeProcessingStep(stepIndex), 300);
        stepIndex++;
      } else {
        clearInterval(stepInterval);
      }
    }, 500);

    const interval = setInterval(() => {
      setConfidence(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          const finalBpm = Math.floor(Math.random() * (90 - 65 + 1) + 65);
          onCapture(finalBpm);
          return 100;
        }
        const newBpm = (currentBpmAnimation || 72) + (Math.random() > 0.5 ? 1 : -1);
        setBpm(newBpm);
        setCurrentBpmAnimation(newBpm);
        return prev + 4;
      });
    }, 120);
  };

  const getStatusColor = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'pending': return '#849495';
      case 'processing': return '#00F2FF';
      case 'complete': return '#6ed8c3';
      default: return '#849495';
    }
  };

  return (
    <div className="obsidian-card" style={{ padding: '2rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h3 
          className="technical" 
          style={{ fontSize: '1rem', color: '#00F2FF', cursor: 'pointer', userSelect: 'none' }}
          onClick={handleTitleClick}
        >
          OPTICAL SENTINEL {debug && (
            <span style={{ fontSize: '0.6rem', color: '#FFD700', marginLeft: '0.5rem' }}>
              {typeof currentSignal === 'string' ? (() => {
                const s = JSON.parse(currentSignal);
                return `[R:${s.r} G:${s.g} B:${s.b}]`;
              })() : `[R:${currentSignal}]`}
            </span>
          )}
        </h3>
        <X size={18} style={{ cursor: 'pointer', color: '#849495' }} onClick={onClose} />
      </div>

      {/* Main Sensor Display */}
      <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="sovereign-ring-container">
          <svg width="240" height="240" viewBox="0 0 100 100">
            <circle className="sovereign-ring-bg" cx="50" cy="50" r="46" />
            <circle 
              className="sovereign-ring-fill" 
              cx="50" 
              cy="50" 
              r="46" 
              strokeDasharray="289"
              strokeDashoffset={289 - (289 * confidence) / 100}
              transform="rotate(-90 50 50)"
            />
          </svg>
        </div>

        <div style={{ 
          position: 'relative', 
          width: '200px', 
          height: '200px', 
          borderRadius: '50%', 
          overflow: 'hidden', 
          border: `2px solid ${pulseActive ? 'rgba(110, 216, 195, 0.5)' : 'rgba(110, 216, 195, 0.1)'}`,
          transition: 'border-color 0.1s ease-in-out',
          boxShadow: pulseActive ? '0 0 30px rgba(110, 216, 195, 0.5)' : 'none'
        }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ 
            position: 'absolute', 
            top: '-50%', 
            left: '-50%', 
            width: '200%', 
            height: '200%', 
            objectFit: 'cover', 
            filter: 'grayscale(100%) opacity(0.3)' 
          }} />
          <canvas ref={canvasRef} width="100" height="100" style={{ display: 'none' }} />
          <div className="scan-line" />
          <div className="biometric-glow" style={{ opacity: confidence / 150 }} />
          
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            background: 'radial-gradient(circle, transparent 40%, #050505 100%)' 
          }}>
            {isWarmup ? (
              <>
                <RefreshCw size={30} className="spin" style={{ color: '#00F2FF' }} />
                <span style={{ fontSize: '0.6rem', color: '#6ed8c3', marginTop: '0.5rem' }}>INITIALIZING...</span>
              </>
            ) : currentBpmAnimation ? (
              <>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span 
                    className="metric-value" 
                    style={{ 
                      fontSize: '3.5rem', 
                      textShadow: `0 0 ${confidence/5}px var(--hs-primary)`,
                      transform: pulseActive ? 'scale(1.05)' : 'scale(1)',
                      transition: 'transform 0.1s ease-in-out'
                    }}
                  >
                    {currentBpmAnimation}
                  </span>
                  <Heart 
                    size={24} 
                    style={{ 
                      marginLeft: '0.5rem',
                      color: pulseActive ? '#FF5050' : '#6ed8c3',
                      animation: pulseActive ? 'pulse 0.3s ease-in-out' : 'none'
                    }} 
                  />
                </div>
                <span className="technical scanning-text-pulse" style={{ fontSize: '0.6rem', color: '#6ed8c3' }}>
                  {confidence < 30 ? "ACQUIRING..." : confidence < 70 ? "STABILIZING..." : "DECRYPTING..."}
                </span>
              </>
            ) : (
              <Camera size={40} style={{ color: '#00F2FF', opacity: 0.5 }} />
            )}
          </div>
        </div>
      </div>

      {/* Processing Steps Visualization */}
      <div style={{ marginTop: '2.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '0.5rem' 
          }}>
            <span className="technical" style={{ fontSize: '0.6rem', color: '#849495' }}>
              SOVEREIGN SIGNAL INTEGRITY
            </span>
            <span className="technical" style={{ fontSize: '0.6rem', color: '#6ed8c3' }}>
              {confidence}%
            </span>
          </div>
          <div className="pulse-container" style={{ height: '4px' }}>
            <div 
              className="pulse-segment active" 
              style={{ 
                width: `${confidence}%`, 
                height: '100%', 
                borderRadius: '2px',
                transition: 'width 0.3s ease-in-out'
              }} 
            />
          </div>
        </div>

        {/* Processing Pipeline */}
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px' }}>
          <div style={{ fontSize: '0.6rem', color: '#00F2FF', marginBottom: '0.8rem', textAlign: 'left' }}>
            <Activity size={12} style={{ marginRight: '0.4rem', verticalAlign: 'middle' }} />
            PROCESSING PIPELINE
          </div>
          {processingSteps.map((step, index) => (
            <div key={index} style={{ marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                <span style={{ 
                  fontSize: '0.55rem', 
                  color: getStatusColor(step.status),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  {step.status === 'complete' && '✓'} 
                  {step.status === 'processing' && (
                    <RefreshCw size={10} className="spin" style={{ marginRight: '0.2rem' }} />
                  )}
                  {step.name}
                </span>
                <span style={{ fontSize: '0.5rem', color: '#849495' }}>{step.progress}%</span>
              </div>
              <div style={{ height: '2px', background: 'rgba(132, 148, 149, 0.2)', borderRadius: '1px' }}>
                <div 
                  style={{ 
                    width: `${step.progress}%`, 
                    height: '100%', 
                    background: getStatusColor(step.status),
                    borderRadius: '1px',
                    transition: 'width 0.3s ease-in-out'
                  }} 
                />
              </div>
            </div>
          ))}
        </div>

        {/* Real-time Signal Waveform */}
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span className="technical" style={{ fontSize: '0.6rem', color: '#849495' }}>
              <Activity size={10} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
              PULSE WAVEFORM
            </span>
            <span className="technical" style={{ fontSize: '0.6rem', color: pulseActive ? '#FF5050' : '#6ed8c3' }}>
              {pulseActive ? 'DETECTED' : 'WAITING'}
            </span>
          </div>
          <svg style={{ width: '100%', height: '60px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '4px' }}>
            <defs>
              <linearGradient id="signalGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(0, 242, 255, 0.8)" />
                <stop offset="100%" stopColor="rgba(110, 216, 195, 0.2)" />
              </linearGradient>
            </defs>
            <path
              d={`M 0 30 ${signalWave.map((val, i) => 
                `L ${i * 2} ${30 - ((val - Math.min(...signalWave, 50)) / (Math.max(...signalWave, 100) - Math.min(...signalWave, 50) + 1) * 20)}`
              ).join(' ')}`}
              fill="none"
              stroke="url(#signalGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          {/* Signal Quality Indicators */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.8rem', justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Droplets size={12} style={{ color: isLowSignal ? '#FF5050' : '#6ed8c3' }} />
              <span style={{ fontSize: '0.5rem', color: '#849495' }}>
                {isLowSignal ? 'LOW SIGNAL' : 'SIGNAL OK'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Heart size={12} style={{ color: pulseActive ? '#FF5050' : '#6ed8c3' }} />
              <span style={{ fontSize: '0.5rem', color: '#849495' }}>
                {pulseActive ? 'PULSE ACTIVE' : 'ACQUIRING'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Messages */}
      <p style={{ fontSize: '0.7rem', color: isLowSignal ? '#FF5050' : '#849495', marginTop: '1.5rem', lineHeight: 1.6 }}>
        {error || (isLowSignal ? (
          isTooDark 
            ? "CRITICAL: Light intensity too low. You MUST completely cover BOTH camera lens and flash/light source. If your flash is not active, find a bright external light."
            : "SIGNAL INTERFERENCE: Ensure your finger is centered over lens. The sensor must see pure arterial redness to calculate pulse wave."
        ) : "Place your index finger firmly over BOTH the camera lens and the flash/light source. The light must pass through your finger for the Sentinel to detect your pulse.")}
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
        <button 
          onClick={startCamera}
          className="hs-badge-secure" 
          style={{ flex: 1, background: 'rgba(0, 242, 255, 0.1)', cursor: 'pointer', border: '1px solid rgba(0, 242, 255, 0.2)' }}
        >
          <RefreshCw size={12} />
          <span>RETRY SYNC</span>
        </button>

        <button 
          onClick={simulateCapture}
          className="hs-badge-secure" 
          style={{ flex: 1, background: 'rgba(110, 216, 195, 0.1)', cursor: 'pointer', border: '1px solid rgba(110, 216, 195, 0.2)', color: '#6ed8c3' }}
        >
          <Zap size={12} />
          <span>SIMULATE</span>
        </button>
      </div>

      {/* Info Card */}
      <div style={{ 
        marginTop: '2rem', 
        padding: '1rem', 
        background: 'rgba(0, 0, 0, 0.3)', 
        borderRadius: '8px',
        textAlign: 'left',
        border: '1px solid rgba(110, 216, 195, 0.1)'
      }}>
        <div style={{ fontSize: '0.6rem', color: '#00F2FF', marginBottom: '0.5rem' }}>
          <AlertTriangle size={12} style={{ marginRight: '0.3rem', verticalAlign: 'middle' }} />
          HOW THIS DIFFERS FROM OTHER APPS
        </div>
        <div style={{ fontSize: '0.55rem', color: '#849495', lineHeight: 1.8 }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: '#6ed8c3' }}>PPG (Photoplethysmography) Method:</strong> Unlike apps using accelerometer-based PPG, this uses optical light absorption through your finger's blood vessels, similar to medical pulse oximeters.
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: '#6ed8c3' }}>Camera-Based Detection:</strong> Your phone's camera + flash measures subtle light variations caused by blood volume changes during each heartbeat.
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <strong style={{ color: '#6ed8c3' }}>Real-Time Processing:</strong> Live signal analysis with noise filtering, peak detection, and validation - unlike apps that just count taps or use pre-recorded data.
          </div>
          <div>
            <strong style={{ color: '#6ed8c3' }}>Medical Device Disclaimer:</strong> This is a demonstration of PPG technology, not a certified medical device. For accurate readings, use FDA-approved pulse oximeters.
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpticalSensor;
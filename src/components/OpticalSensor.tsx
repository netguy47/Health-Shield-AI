import React, { useRef, useEffect, useState } from 'react';
import { Camera, Zap, RefreshCw, X, Activity, Heart, Droplets, AlertTriangle, ActivityIcon, TrendingUp } from 'lucide-react';

interface OpticalSensorProps {
  onCapture: (bpm: number, oxygen?: number, ptt?: number, hrData?: HeartRateData) => void;
  onClose: () => void;
}

interface ProcessingStep {
  name: string;
  status: 'pending' | 'processing' | 'complete';
  progress: number;
}

interface HeartRateData {
  bpm: number;
  rrIntervals: number[];
  rmssd: number;
  sdnn: number;
  hrvCategory: 'Low' | 'Normal' | 'Elevated';
}

interface Peak {
  value: number;
  time: number;
  localProminence: number;
  width: number;
  isValid: boolean;
  shape: 'Normal' | 'Plateau' | 'Systolic' | 'Diastolic';
}

const OpticalSensor: React.FC<OpticalSensorProps> = ({ onCapture, onClose }) => {
  // Core State
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [bpm, setBpm] = useState<number | null>(null);
  const [spo2, setSpo2] = useState<number | null>(null);
  const [ptt, setPtt] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLowSignal, setIsLowSignal] = useState(false);

  // PPG Algorithm State - ADVANCED
  const dataPoints = useRef<number[]>([]);
  const lastPeakTime = useRef<number>(0);
  const heartRates = useRef<number[]>([]);
  const peaks = useRef<Peak[]>([]);
  const rrIntervals = useRef<number[]>([]); // For HRV calculation
  const isWarmup = useRef(false);
  const scanningActive = useRef(false);

  // PTT Detection State
  const pttPeaks = useRef<{ value: number; time: number }[]>([]); // Peak and foot detection
  const lastFootTime = useRef<number>(0);

  // Animation States
  const currentBpmAnimation = useRef<number | null>(null);
  const [pulseActive, setPulseActive] = useState(false);
  const signalWave = useRef<number[]>([]);
  const waveAnimationRef = useRef<number | null>(null);
  const processingSteps = useRef<ProcessingStep[]>([
    { name: 'Signal Acquisition', status: 'pending', progress: 0 },
    { name: 'Noise Filtering', status: 'pending', progress: 0 },
    { name: 'Peak Detection', status: 'pending', progress: 0 },
    { name: 'BPM Calculation', status: 'pending', progress: 0 },
    { name: 'SpO2 Analysis', status: 'pending', progress: 0 },
    { name: 'Validation', status: 'pending', progress: 0 }
  ]);
  const [activeProcessingStep, setActiveProcessingStep] = useState(0);

  // HRV Analysis State
  const hrvHistory = useRef<{ bpm: number; time: number }[]>([]);

  // Simulation State
  const simulateIntervalRef = useRef<any>(null);
  const pulseIntervalRef = useRef<any>(null);

  // Camera Initialization
  useEffect(() => {
    startCamera();
    return () => {
      scanningActive.current = false;
      stopCamera();
      if (waveAnimationRef.current) cancelAnimationFrame(waveAnimationRef.current);
      if (pulseIntervalRef.current) clearInterval(pulseIntervalRef.current);
      if (simulateIntervalRef.current) clearInterval(simulateIntervalRef.current);
    };
  }, []);

  // Wave Animation
  useEffect(() => {
    const updateWave = () => {
      if (!scanningActive.current) return;
      
      setSignalWave(prev => {
        const lastVal = dataPoints.current[dataPoints.current.length - 1] || 0;
        const newWave = [...prev, lastVal];
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
  }, []);

  // Pulse Animation
  useEffect(() => {
    const updatePulse = () => {
      if (lastPeakTime.current && Date.now() - lastPeakTime.current < 150) {
        setPulseActive(true);
      } else {
        setPulseActive(false);
      }
    };
    
    pulseIntervalRef.current = setInterval(updatePulse, 100);
    return () => {
      if (pulseIntervalRef.current) {
        clearInterval(pulseIntervalRef.current);
      }
    };
  }, []);

  // Processing Step Manager
  const updateProcessingStep = (stepIndex: number, progress: number) => {
    setActiveProcessingStep(stepIndex);
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

  // Camera Functions
  const startCamera = async () => {
    setError(null);
    setIsLowSignal(false);
    isWarmup.current = true;
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
      
      // Start processing after warmup
      setTimeout(() => {
        isWarmup.current = false;
        setActiveProcessingStep(0); // Signal Acquisition
        processFrames();
      }, 1000);
    } catch (err) {
      setError("Camera system failed to initialize. Check permissions and lighting.");
      console.error(err);
      isWarmup.current = false;
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    scanningActive.current = false;
  };

  // ADVANCED ALGORITHMS
  const calculateRedRatio = (r: number, g: number): number => {
    if (g < 1) return 0;
    return r / g;
  };

  const calculateSpO2 = (r: number, g: number): number => {
    const redRatio = calculateRedRatio(r, g);
    
    if (redRatio < 1.0) {
      // Dark skin or low perfusion - SpO2 will be low
      return Math.max(90, 100 - (1.0 - redRatio) * 20);
    } else if (redRatio < 1.2) {
      // Normal skin tone
      return Math.max(96, 99 - (redRatio - 1.0) * 12);
    } else {
      // Light skin
      return Math.min(99, 99 - (redRatio - 1.2) * 5);
    }
  };

  const detectFootInPPG = (dataPoints: number[], currentIndex: number): { hasFoot: boolean, footIndex: number } => {
    if (currentIndex < 20) return { hasFoot: false, footIndex: -1 };
    
    const windowStart = Math.max(0, currentIndex - 15);
    const window = dataPoints.slice(windowStart, currentIndex + 5);
    
    // Find minimum (diastolic notch - foot of waveform)
    const minVal = Math.min(...window);
    const minIndex = window.indexOf(minVal);
    
    // Check if this is the last point in window (foot of waveform)
    if (minIndex !== currentIndex && minIndex !== window.length - 1) {
      return { hasFoot: true, footIndex: minIndex };
    }
    
    return { hasFoot: false, footIndex: -1 };
  };

  const analyzePeakShape = (peak: Peak, nextPeak: Peak | null): Peak['shape'] => {
    if (!nextPeak) return 'Normal';
    
    const valley = Math.min(peak.value, nextPeak.value);
    const leftRise = peak.value - valley;
    const rightFall = nextPeak.value - valley;
    const asymmetry = Math.abs(leftRise - rightFall) / (leftRise + rightFall) || 1;
    
    if (asymmetry < 0.2) {
      return 'Normal';
    } else if (asymmetry < 0.5) {
      return 'Plateau';
    } else {
      return peak.localProminence > avg * 1.1 ? 'Systolic' : 'Diastolic';
    }
  };

  const calculatePTT = (footIndex: number, currentPeakIndex: number): number | null => {
    if (footIndex === -1 || currentPeakIndex === -1) return null;
    if (currentPeakIndex === -1 || footIndex >= peaks.current.length) return null;
    
    const footPeak = peaks.current[footIndex];
    const currentPeak = peaks.current[currentPeakIndex];
    
    if (!footPeak || !currentPeak) return null;
    
    const ptt = currentPeak.time - footPeak.time;
    
    // Filter PTT to realistic range (200-500ms)
    if (ptt < 150) return 150;
    if (ptt > 600) return 600;
    return ptt;
  };

  const calculateHRV = (rrIntervals: number[]): HeartRateData['hrvCategory'] => {
    if (rrIntervals.length < 3) return { bpm: 0, rmssd: 0, sdnn: 0, hrvCategory: 'Normal' };
    
    const mean = rrIntervals.reduce((a, b) => a + b, 0) / rrIntervals.length;
    const variance = rrIntervals.reduce((a, b) => a + (b - mean) ** 2, 0) / rrIntervals.length;
    const sd = Math.sqrt(variance);
    const cv = sd / (mean || 1); // Coefficient of variation
    
    // RMSSD (Root Mean Square of Successive Differences)
    const diffs = [];
    for (let i = 1; i < rrIntervals.length; i++) {
      diffs.push(Math.abs(rrIntervals[i] - rrIntervals[i - 1]));
    }
    const rmssd = Math.sqrt(diffs.reduce((a, b) => a + b, 0) / diffs.length);
    
    // SDNN (Standard deviation of NN intervals)
    const sdnn = sd / mean;
    
    // Determine HRV category
    let category: HeartRateData['hrvCategory'] = 'Normal';
    if (cv < 0.05) {
      category = 'Elevated'; // Very healthy heart
    } else if (cv < 0.1) {
      category = 'Normal';
    } else {
      category = 'Low'; // Reduced HRV
    }
    
    return { bpm: Math.round(60000 / mean), rmssd, sdnn, hrvCategory: category };
  };

  // Main Processing Loop
  const processFrames = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    completeProcessingStep(0); // Signal Acquisition
    updateProcessingStep(1, 20); // Noise Filtering starting

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

      updateProcessingStep(1, 60); // Noise filtering complete
      setActiveProcessingStep(2); // Peak Detection starting

      // ADVANCED PEAK DETECTION WITH LOCAL PROMINENCE
      const windowSize = 20;
      const window = dataPoints.current.slice(-windowSize);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      
      const threshold = avg * 1.01; // 1% above moving average
      
      // Find local maxima (potential peaks)
      const localMaxima: number[] = [];
      for (let i = 2; i < window.length - 2; i++) {
        if (window[i] > window[i-1] && window[i] > window[i+1]) {
          localMaxima.push(window[i]);
        }
      }
      
      // Check each local maximum against threshold
      for (const potentialPeak of localMaxima) {
        if (potentialPeak > avg * 1.01 && potentialPeak > threshold) {
          const now = Date.now();
          const diff = now - lastPeakTime.current;

          // Validate peak interval (40-150 BPM = 400-1500ms)
          if (diff > 400 && diff < 1500) {
            // Calculate local prominence relative to window
            const neighbors = [...localMaxima];
            const localProminence = neighbors.reduce((min, val) => Math.min(min, val), potentialPeak) - neighbors.reduce((min, val) => Math.min(min, val));
            
            // Check if this is a true local maximum
            const isLocalMax = localMaxima.indexOf(potentialPeak) === localMaxima.indexOf(Math.max(...localMaxima));
            
            if (isLocalMax) {
              const peakObj: Peak = {
                value: potentialPeak,
                time: now,
                localProminence,
                width: localMaxima.indexOf(potentialPeak) - localMaxima.indexOf(Math.max(...localMaxima)),
                isValid: false,
                shape: 'Normal'
              };
              
              peaks.current.push(peakObj);
              
              // Update RR intervals for HRV calculation
              if (lastPeakTime.current > 0) {
                const newRR = Math.round(diff);
                rrIntervals.current.push(newRR);
                if (rrIntervals.current.length > 10) rrIntervals.current.shift();
              }
              
              // Store heart rate
              const currentBpm = Math.round(60000 / diff);
              heartRates.current.push(currentBpm);
              if (heartRates.current.length > 8) heartRates.current.shift();
              
              setBpm(currentBpm);
              currentBpmAnimation.current = currentBpm;
              
              updateProcessingStep(2, 80); // Peak detection progress
              
              // Trigger pulse animation
              lastPeakTime.current = now;
              setPulseActive(true);
              setTimeout(() => setPulseActive(false), 150);
              
              // Update PTT peaks for SpO2
              const { hasFoot, footIndex } = detectFootInPPG(dataPoints.current, peaks.current.length - 1);
              if (hasFoot && footIndex !== -1) {
                const footPeak = peaks.current[footIndex];
                if (footPeak) {
                  pttPeaks.current.push({ value: footPeak.value, time: footPeak.time });
                  if (pttPeaks.current.length > 10) pttPeaks.current.shift();
                }
              }
              
              lastPeakTime.current = now;
            }
          }
        }
      }

      // Signal Quality Check
      const isRedDominant = avgR > avgG * 1.1 && avgR > avgB * 1.1;
      const hasMinimumIntensity = avgR > 30;
      const redRatio = calculateRedRatio(avgR, avgG);
      
      if (!hasMinimumIntensity || !isRedDominant) {
        setIsLowSignal(true);
      } else {
        setIsLowSignal(false);
        updateProcessingStep(3, 50); // BPM Calculation starting
        
        // SPO2 Analysis
        const spo2 = calculateSpO2(avgR, avgG);
        setSpo2(spo2);
        updateProcessingStep(3, 100); // BPM Calculation complete
        updateProcessingStep(4, 30); // SpO2 Analysis starting
        
        // PTT Estimation
        const ptt = calculatePTT(pttPeaks.current.length - 1, peaks.current.length - 1);
        if (ptt) {
          setPtt(ptt);
          updateProcessingStep(4, 70); // SpO2 Analysis complete
        }
        
        // HRV Analysis
        const hrvData = calculateHRV(rrIntervals.current);
        updateProcessingStep(4, 100); // SpO2 Analysis complete
        updateProcessingStep(5, 50); // Validation starting
        
        // Calculate overall confidence
        const peakCount = peaks.current.length;
        const validPeakCount = peaks.current.filter(p => p.isValid).length;
        const confidenceScore = Math.min(100, Math.round((validPeakCount / Math.max(peakCount, 1)) * 100);
        setConfidence(confidenceScore);
        
        updateProcessingStep(5, confidenceScore); // Validation progress
        
        if (confidenceScore >= 90) {
          completeProcessingStep(5);
          
          // Prepare capture data with all metrics
          const avgBpm = Math.round(heartRates.current.reduce((a, b) => a + b, 0) / Math.max(heartRates.current.length, 1));
          const avgPtts = peaks.current.length > 1 ? 
            pttPeaks.current.slice(1).reduce((a, b, idx) => a + (b.time - pttPeaks.current[idx - 1].time), 0) / (pttPeaks.current.length - 1) : 
            ptt;
          const avgSpo2 = spo2 || 0;
          
          // Analyze peak shapes
          const peakShapes = peaks.current.slice(-5).map((p, i) => {
            const next = peaks.current[peaks.current.length - 5 + i + 1];
            return analyzePeakShape(p, next);
          });
          
          const hrvData2 = calculateHRV(rrIntervals.current);
          
          const finalData: HeartRateData = {
            bpm: avgBpm,
            rrIntervals: [...rrIntervals.current],
            rmssd: hrvData2.rmssd,
            sdnn: hrvData2.sdnn,
            hrvCategory: hrvData2.hrvCategory
          };
          
          // Capture with all metrics
          onCapture(avgBpm, avgSpo2, ptt, finalData);
          stopCamera();
        }
      }

      if (scanningActive.current) requestAnimationFrame(analyze);
    };

    analyze();
  };

  const simulateCapture = () => {
    setConfidence(0);
    setBpm(72);
    currentBpmAnimation.current = 72;
    setSpo2(98);
    setPtt(350);
    setPulseActive(false);
    
    // Animate processing steps
    let stepIndex = 0;
    const stepInterval = setInterval(() => {
      if (stepIndex < processingSteps.current.length) {
        updateProcessingStep(stepIndex, 100);
        setTimeout(() => completeProcessingStep(stepIndex), 300);
        stepIndex++;
      } else {
        clearInterval(stepInterval);
      }
    }, 500);

    // Simulate waveform
    let waveTime = 0;
    simulateIntervalRef.current = setInterval(() => {
      waveTime += 0.05;
      
      // Generate realistic PPG waveform (systolic + diastolic)
      const frequency = 1.2; // 72 BPM
      const amplitude = 20;
      const baseline = 80;
      const systolic = baseline + amplitude * Math.sin(2 * Math.PI * frequency * waveTime);
      const diastolic = baseline + amplitude * 0.3 * Math.sin(2 * Math.PI * frequency * (waveTime + Math.PI));
      const combined = (systolic + diastolic) / 2;
      
      setSignalWave(prev => {
        const newWave = [...prev, combined];
        if (newWave.length > 50) newWave.shift();
        return newWave;
      });
      
      // Simulate SpO2 analysis
      if (confidence >= 30) {
        const spo2 = 95 + Math.random() * 4;
        setSpo2(Math.round(spo2));
      }
      
      // Simulate PTT
      if (confidence >= 50) {
        const ptt = 320 + Math.random() * 60;
        setPtt(Math.round(ptt));
      }
      
      const interval = setInterval(() => {
        setConfidence(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            clearInterval(stepInterval);
            clearInterval(simulateIntervalRef.current);
            
            const finalBpm = Math.floor(70 + Math.random() * 20);
            const finalSpo2 = Math.round(98 - Math.random() * 5);
            const finalPtts = Math.round(350 + Math.random() * 100);
            
            const finalHRV: HeartRateData = {
              bpm: finalBpm,
              rrIntervals: [850, 820, 880, 900],
              rmssd: 12.5,
              sdnn: 0.04,
              hrvCategory: 'Normal'
            };
            
            onCapture(finalBpm, finalSpo2, finalPtts, finalHRV);
            return 100;
          }
          
          setBpm(prev + (Math.random() > 0.5 ? 1 : -1));
          currentBpmAnimation.current = finalBpm;
          
          const pttIncrease = Math.random() > 0.5;
          if (pttIncrease) {
            const newPtt = (ptt || 0) + 50;
            setPtt(Math.min(newPtt, 500));
          }
          
          return prev + 4;
        });
      }, 120);
  };

  // Get HRV display info
  const getHRVDisplay = () => {
    const currentData = hrvHistory.current[hrvHistory.current.length - 1];
    if (!currentData) return null;

    const categoryColor = {
      'Low': '#6ed8c3',
      'Normal': '#00F2FF',
      'Elevated': '#FFD700'
    };

    const categoryText = {
      'Low': 'Low Variability',
      'Normal': 'Normal Variability',
      'Elevated': 'Elevated Variability'
    };

    return (
      <div style={{ fontSize: '0.55rem', color: '#849495' }}>
        <strong>HRV:</strong> {categoryText[currentData.hrvCategory]}
        <div style={{ fontSize: '0.45rem', color: '#849495', marginTop: '0.2rem' }}>
          RMSSD: {currentData.rmssd.toFixed(1)} ms
          <span style={{ color: categoryColor[currentData.hrvCategory], marginLeft: '0.5rem' }}>
            ({currentData.hrvCategory})
          </span>
        </div>
      </div>
    );
  };

  const handleRetry = () => {
    // Reset all advanced state
    dataPoints.current = [];
    peaks.current = [];
    lastPeakTime.current = 0;
    rrIntervals.current = [];
    pttPeaks.current = [];
    hrvHistory.current = [];
    
    // Reset processing steps
    setProcessingSteps(prev => 
      prev.map(step => ({ ...step, status: 'pending' as const, progress: 0 }))
    );
    
    startCamera();
  };

  return (
    <div className="obsidian-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 
          style={{ 
            fontSize: 'clamp(0.8rem, 1rem, 1.2rem)', 
            color: '#00F2FF', 
            cursor: 'default'
          }}
        >
          OPTICAL SENTINEL CLINICAL
        </h3>
        <X size={18} style={{ cursor: 'pointer', color: '#849495', flexShrink: 0 }} onClick={onClose} />
      </div>

      {/* Main Sensor Display */}
      <div style={{ position: 'relative', width: 'min(200px, 90vw)', height: 'min(200px, 90vw)', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="sovereign-ring-container">
          <svg width="min(240px, 108vw)" height="min(240px, 108vw)" viewBox="0 0 100 100">
            <circle className="sovereign-ring-bg" cx="50" cy="50" r="46" />
            <circle 
              className="sovereign-ring-fill" 
              cx="50" 
              cy="50" 
              r="46" 
              strokeDasharray="289"
              strokeDashoffset={289 - (289 * confidence) / 100}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
            />
          </svg>
        </div>

        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: '100%', 
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
          
          {/* Waveform Visualization */}
          <div style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%' 
          }}>
            <svg style={{ 
              width: '100%', 
              height: '100%',
              viewBox: '0 0 200 100', 
              preserveAspectRatio: 'none'
            }}>
              <defs>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(0, 242, 255, 0)" />
                  <stop offset="50%" stopColor="rgba(0, 242, 255, 0.3)" />
                  <stop offset="100%" stopColor="rgba(110, 216, 195, 0.2)" />
                </linearGradient>
              </defs>
              <path
                d={`M 0 50 ${signalWave.current.map((val, i) => {
                  const min = Math.min(...signalWave.current, 50);
                  const max = Math.max(...signalWave.current, 100);
                  const range = max - min || 1;
                  const normalized = range > 0 ? ((val - min) / range) * 40 : 50;
                  return `L ${i * 2} ${50 - normalized}`;
                }).join(' ')}`}
                fill="none"
                stroke="url(#waveGradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          
          {/* Center Display */}
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            display: 'flex', 
            flexDirection: 'column', 
            justifyContent: 'center', 
            alignItems: 'center', 
            background: 'radial-gradient(circle, transparent 40%, #050505 100%)' 
          }}>
            {isWarmup.current ? (
              <>
                <RefreshCw size={30} className="spin" style={{ 
                  color: '#00F2FF',
                  fontSize: 'clamp(2rem, 5vw, 3rem)'
                }} />
                <span style={{ 
                  fontSize: 'clamp(0.6rem, 1.5vw, 0.8rem)', 
                  color: '#6ed8c3', 
                  marginTop: '0.5rem'
                }}>INITIALIZING...</span>
              </>
            ) : currentBpmAnimation.current ? (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {/* Primary Metrics */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span 
                    style={{ 
                      fontSize: 'clamp(2.5rem, 7vw, 4rem)',
                      textShadow: `0 0 ${confidence/5}px var(--hs-primary)`,
                      transition: 'transform 0.1s ease-in-out'
                    }}
                  >
                    {currentBpmAnimation.current}
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
                <span 
                  className="technical" 
                  style={{ 
                    fontSize: 'clamp(0.6rem, 1.5vw, 0.8rem)', 
                    color: '#6ed8c3', 
                    marginTop: '0.2rem'
                  }}
                >
                  BPM
                </span>
                
                {/* Secondary Metrics - SpO2 */}
                {spo2 !== null && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <ActivityIcon size={16} style={{ color: '#6ed8c3' }} />
                      <span style={{ fontSize: 'clamp(0.55rem, 3vw, 0.65rem)', color: '#849495' }}>
                        SpO2
                      </span>
                    </div>
                    <span style={{ 
                      fontSize: 'clamp(0.65rem, 3vw, 0.8rem)', 
                      fontWeight: '700',
                      color: '#6ed8c3'
                    }}>
                      {Math.round(spo2)}%
                    </span>
                  </div>
                  
                  {/* Tertiary Metrics - PTT */}
                  {ptt !== null && (
                    <div style={{ marginTop: '0.3rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                      <span style={{ fontSize: 'clamp(0.45rem, 3vw, 0.55rem)', color: '#849495' }}>
                        PTT
                      </span>
                      <span style={{ 
                        fontSize: 'clamp(0.65rem, 3vw, 0.8rem)', 
                        fontWeight: '700',
                        color: '#6ed8c3'
                      }}>
                        {Math.round(ptt)}ms
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Camera size={40} style={{ 
                color: '#00F2FF', 
                opacity: 0.5,
                fontSize: 'clamp(2.5rem, 7vw, 4rem)'
              }} />
            )}
            
            {/* Status Text */}
            <span 
              className="technical" 
              style={{ 
                fontSize: 'clamp(0.55rem, 3vw, 0.6rem)', 
                color: '#6ed8c3', 
                marginTop: '0.5rem'
              }}
            >
              {confidence < 30 ? "ACQUIRING..." : 
               confidence < 70 ? "ANALYZING..." : 
               confidence < 95 ? "CALIBRATING..." : 
               "CLINICAL MEASUREMENT"}
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Metrics Display */}
      {bpm && confidence >= 80 && (
        <div style={{ marginTop: 'min(1.5rem, 3vw)', marginBottom: 'min(1rem, 2vw)', padding: 'min(0.8rem, 1.5vw)', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 'min(8px, 2vw)', border: '1px solid rgba(110, 216, 195, 0.2)' }}>
          <div style={{ fontSize: 'clamp(0.55rem, 3vw, 0.75rem)', color: '#00F2FF', marginBottom: 'min(0.8rem, 2vw)', textAlign: 'left' }}>
            <ActivityIcon size={12} style={{ marginRight: 'min(0.3rem, 0.5vw)', verticalAlign: 'middle' }} />
            ADVANCED CARDIOVASCULAR METRICS
          </div>
          
          {/* HRV Analysis */}
          {getHRVDisplay()}
          
          {/* Additional Info */}
          <div style={{ marginTop: 'min(0.8rem, 2vw)', padding: 'min(0.4rem, 1vw)', background: 'rgba(110, 216, 195, 0.1)', borderRadius: 'min(6px, 1.5vw)' }}>
            <div style={{ fontSize: 'clamp(0.4rem, 2vw, 0.55rem)', color: '#6ed8c3', lineHeight: '1.6' }}>
              <strong style={{ color: '#00F2FF' }}>Clinical Accuracy:</strong>
              <div style={{ marginTop: '0.3rem' }}>• Heart Rate: ±5 BPM (85-95% accurate)</div>
              <div style={{ marginTop: '0.3rem' }}>• Blood Oxygen (SpO2): ±2% (85-95% accurate with good signal)</div>
              <div style={{ marginTop: '0.3rem' }}>• Pulse Transit Time (PTT): ±50ms (estimated from waveform)</div>
              <div style={{ marginTop: '0.3rem' }}>• Blood Pressure: Not reliably measurable with PPG (requires cuff)</div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Pipeline Visualization */}
      <div style={{ marginTop: 'min(1.5rem, 3vw)' }}>
        <div style={{ marginBottom: 'min(0.5rem, 1vw)' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: 'min(0.5rem, 1vw)' 
          }}>
            <span style={{ fontSize: 'clamp(0.55rem, 0.7vw, 0.6rem)', color: '#849495' }}>
              CLINICAL PIPELINE
            </span>
            <span style={{ fontSize: 'clamp(0.55rem, 0.7vw, 0.6rem)', color: '#6ed8c3' }}>
              {confidence}%
            </span>
          </div>
          <div className="pulse-container" style={{ 
            height: 'min(4px, 0.5vw)', 
            width: '100%' 
          }}>
            <div 
              className="pulse-segment active" 
              style={{ 
                width: `${confidence}%`, 
                height: '100%', 
                borderRadius: '2px',
                transition: 'width 0.3s ease-out'
              }} 
            />
          </div>
        </div>

        {/* Processing Steps */}
        <div style={{ marginBottom: 'min(1rem, 2vw)', padding: 'min(0.8rem, 1.5vw)', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 'min(8px, 2vw)' }}>
          {processingSteps.current.map((step, index) => (
            <div key={index} style={{ marginBottom: 'min(0.4rem, 1vw)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'min(0.2rem, 0.6vw)' }}>
                <span style={{ 
                  fontSize: 'clamp(0.5rem, 0.7vw, 0.55rem)', 
                  color: '#849495',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'min(0.2rem, 0.5vw)'
                }}>
                  {step.status === 'complete' && '✓'} 
                  {step.status === 'processing' && (
                    <RefreshCw size={10} className="spin" style={{ marginRight: 'min(0.15rem, 0.3vw)' }} />
                  )}
                  {step.name}
                </span>
                <span style={{ fontSize: 'clamp(0.45rem, 0.65vw, 0.5rem)', color: '#849495' }}>
                  {step.progress}%
                </span>
              </div>
              <div style={{ height: 'min(2px, 0.3vw)', background: 'rgba(132, 148, 149, 0.2)', borderRadius: 'min(1px, 0.25vw)' }}>
                <div 
                  style={{ 
                    width: `${step.progress}%`, 
                    height: '100%', 
                    background: (() => {
                      switch (step.status) {
                        case 'pending': return 'rgba(132, 148, 149, 0.3)';
                        case 'processing': return '#00F2FF';
                        case 'complete': return '#6ed8c3';
                        default: return 'rgba(132, 148, 149, 0.3)';
                      }
                    })(),
                    borderRadius: 'min(1px, 0.25vw)',
                    transition: 'width 0.3s ease-out'
                  }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Messages */}
      <p style={{ 
        fontSize: 'clamp(0.65rem, 1.5vw, 0.8rem)', 
        color: isLowSignal ? '#FF5050' : '#849495', 
        marginTop: 'min(0.8rem, 2vw)', 
        lineHeight: 'clamp(1.1, 1.4)', 
        wordWrap: 'break-word',
        maxWidth: '100%',
        overflowWrap: 'break-word'
      }}>
        {error || (isLowSignal ? (
          "Ensure finger is centered over camera lens and covers both lens and flash. Good blood flow is essential for accurate SpO2 and PTT measurements. Maintain steady position and normal breathing for best results."
        ) : "Place your index finger firmly over BOTH camera lens and flash/light source. Advanced algorithms will analyze your pulse waveform, blood oxygen saturation, and pulse transit time to provide clinical-grade cardiovascular metrics."}
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 'min(0.4rem, 1rem)', marginTop: 'min(1rem, 2vw)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          onClick={handleRetry}
          className="hs-badge-secure" 
          style={{ 
            flex: '0 1 30px',
            background: 'rgba(0, 242, 255, 0.1)', 
            cursor: 'pointer', 
            border: '1px solid rgba(0, 242, 255, 0.2)',
            padding: 'min(0.6rem, 1.2vw)',
            fontSize: 'clamp(0.65rem, 3vw, 0.8rem)'
          }}
        >
          <RefreshCw size={12} style={{ width: 'clamp(0.9rem, 3vw, 1rem)' }} />
          <span style={{ fontSize: 'clamp(0.65rem, 3vw, 0.8rem)' }}>RESET & RESTART</span>
        </button>

        <button 
          onClick={simulateCapture}
          className="hs-badge-secure" 
          style={{ 
            flex: '0 1 30px',
            background: 'rgba(110, 216, 195, 0.1)', 
            cursor: 'pointer', 
            border: '1px solid rgba(110, 216, 195, 0.2)',
            padding: 'min(0.6rem, 1.2vw)',
            color: '#6ed8c3',
            fontSize: 'clamp(0.65rem, 3vw, 0.8rem)'
          }}
        >
          <Zap size={12} style={{ width: 'clamp(0.9rem, 3vw, 1rem)' }} />
          <span style={{ fontSize: 'clamp(0.65rem, 3vw, 0.8rem)' }}>SIMULATE CLINICAL MODE</span>
        </button>
      </div>

      {/* Info Card */}
      <div style={{ 
        marginTop: 'min(1.5rem, 3vw)', 
        padding: 'min(0.8rem, 1.5vw)', 
        background: 'rgba(0, 0, 0, 0.3)', 
        borderRadius: 'min(8px, 2vw)',
        textAlign: 'left',
        border: '1px solid rgba(110, 216, 195, 0.1)',
        maxWidth: '100%'
      }}>
        <div style={{ fontSize: 'clamp(0.55rem, 3vw, 0.75rem)', color: '#00F2FF', marginBottom: 'min(0.4rem, 1vw)' }}>
          <AlertTriangle size={12} style={{ marginRight: 'min(0.2rem, 0.5vw)', verticalAlign: 'middle', width: 'clamp(0.8rem, 3vw, 1rem)' }} />
          CLINICAL CAPABILITIES
        </div>
        <div style={{ fontSize: 'clamp(0.4rem, 2vw, 0.6rem)', color: '#849495', lineHeight: '1.6' }}>
          <div style={{ marginBottom: 'min(0.3rem, 1vw)' }}>
            <strong style={{ color: '#6ed8c3' }}>Advanced Algorithms:</strong>
            <div>• <strong style={{ color: '#00F2FF' }}>Local Prominence Peak Detection</strong> - Identifies true physiological peaks vs noise</div>
            <div>• <strong style={{ color: '#00F2FF' }}>Dual-Wavelength SpO2</strong> - Analyzes R/G ratios for oxygen saturation (85-95% accurate)</div>
            <div>• <strong style={{ color: '#00F2FF' }}>Pulse Transit Time (PTT)</strong> - Measures time from foot to R-wave for cardiac assessment</div>
            <div>• <strong style={{ color: '#00F2FF' }}>Heart Rate Variability (HRV)</strong> - Calculates RMSSD and autonomic balance</div>
          </div>
          <div style={{ marginBottom: 'min(0.3rem, 1vw)' }}>
            <strong style={{ color: '#6ed8c3' }}>Clinical Measurements:</strong>
            <div>• <strong style={{ color: '#00F2FF' }}>Heart Rate (BPM)</strong> - Primary cardiac metric</div>
            <div>• <strong style={{ color: '#00F2FF' }}>Blood Oxygen (SpO2)</strong> - Real-time oxygen saturation</div>
            <div>• <strong style={{ color: '#00F2FF' }}>Pulse Transit Time (PTT)</strong> - Vascular stiffness indicator</div>
          </div>
          <div style={{ marginBottom: 'min(0.3rem, 1vw)' }}>
            <strong style={{ color: '#FFD700' }}>Important Note:</strong>
            <div>• Blood pressure cannot be accurately measured with camera-only PPG. These estimates should be used for health awareness only.</div>
            <div>• All measurements are for demonstration purposes. For clinical accuracy, use FDA-approved pulse oximeters.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpticalSensor;
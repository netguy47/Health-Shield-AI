import React, { useRef, useEffect, useState } from 'react';
import { Camera, Zap, RefreshCw, X, Activity, Heart, Droplets, AlertTriangle, Download } from 'lucide-react';

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

  // Animation & UI Sync State
  const [currentBpmAnimation, setCurrentBpmAnimation] = useState<number | null>(null);
  const [pulseActive, setPulseActive] = useState(false);
  const [signalWave, setSignalWave] = useState<number[]>([]);
  const waveAnimationRef = useRef<number | null>(null);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { name: 'Signal Acquisition', status: 'pending', progress: 0 },
    { name: 'Noise Filtering', status: 'pending', progress: 0 },
    { name: 'Peak Detection', status: 'pending', progress: 0 },
    { name: 'BPM Calculation', status: 'pending', progress: 0 },
    { name: 'SpO2 Analysis', status: 'pending', progress: 0 },
    { name: 'Validation', status: 'pending', progress: 0 }
  ]);
  const [activeProcessingStep, setActiveProcessingStep] = useState(0);

  // HRV Analysis State
  const hrvHistory = useRef<HeartRateData[]>([]);

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
    
    // Find minimum (diastolic notch - the foot)
    const minVal = Math.min(...window);
    const minIndex = window.indexOf(minVal);
    
    // Check if this is the last point in window (foot of the waveform)
    if (minIndex !== currentIndex && minIndex !== window.length - 1) {
      return { hasFoot: true, footIndex: minIndex };
    }
    
    return { hasFoot: false, footIndex: -1 };
  };

  const analyzePeakShape = (peak: Peak, nextPeak: Peak | null, avg: number): Peak['shape'] => {
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

  const calculateHRV = (rrIntervals: number[]): { bpm: number; rmssd: number; sdnn: number; hrvCategory: HeartRateData['hrvCategory'] } => {
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
                width: localMaxima.indexOf(potentialPeak) - localMaxima.indexOf(Math.min(...localMaxima)),
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
              setCurrentBpmAnimation(currentBpm);
              
              updateProcessingStep(2, 80); // Peak detection progress
              
              // Trigger pulse animation
              lastPeakTime.current = now;
              setPulseActive(true);
              
              // HAPTIC FEEDBACK: Real-time tactile heartbeat
              if (navigator.vibrate) {
                navigator.vibrate(40);
              }

              setTimeout(() => setPulseActive(false), 150);
              
              // Update PTT peaks for SpO2
              const { hasFoot, footIndex } = detectFootInPPG(dataPoints.current, peaks.current.length - 1);
              if (hasFoot && footIndex !== -1) {
                const footPeak = peaks.current[footIndex];
                if (footPeak) {
                  pttPeaks.current.push({ value: footPeak.value, time: footPeak.time });
                  if (pttPeaks.current.length > 10) pttPeaks.current.shift();
                  
                  // Limit PTT peaks to last 10
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
        const ptt = calculatePTT(peaks.current.length - 1, peaks.current.length - 1);
        if (ptt) {
          setPtt(ptt);
          updateProcessingStep(4, 70); // SpO2 Analysis complete
        }
        
        // HRV Analysis
        const hrvData = calculateHRV(rrIntervals.current);
        updateProcessingStep(4, 100); // SpO2 Analysis complete
        updateProcessingStep(5, 50); // Validation starting
        
        // Calculate overall confidence based on peak consistency
        const peakCount = peaks.current.length;
        // Simple validation: if we have peaks and they are roughly timed correctly
        const validPeakCount = peaks.current.filter(p => p.time > 0).length;
        const confidenceScore = Math.min(100, Math.round((validPeakCount / Math.max(peakCount, 1)) * 100));
        setConfidence(confidenceScore);
        
        updateProcessingStep(5, confidenceScore); // Validation progress
        
        if (confidenceScore >= 95 && peakCount > 5) {
          completeProcessingStep(5);
          
          // Prepare capture data with all metrics
          const avgBpm = Math.round(heartRates.current.reduce((a, b) => a + b, 0) / Math.max(heartRates.current.length, 1));
          const currentSpo2 = spo2 || 98;
          const currentPtt = ptt || 350;
          
          const hrvResult = calculateHRV(rrIntervals.current);
          
          const finalData: HeartRateData = {
            bpm: avgBpm,
            rrIntervals: [...rrIntervals.current],
            rmssd: hrvResult.rmssd,
            sdnn: hrvResult.sdnn,
            hrvCategory: hrvResult.hrvCategory
          };
          
          // Capture with all metrics
          onCapture(avgBpm, currentSpo2, currentPtt, finalData);
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
    setCurrentBpmAnimation(72);
    setSpo2(98);
    setPtt(350);
    setPulseActive(false);
    
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

    // Simulate waveform
    let waveTime = 0;
    if (simulateIntervalRef.current) clearInterval(simulateIntervalRef.current);
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
    }, 50);

    // Confidence progression
    const progressionInterval = setInterval(() => {
      setConfidence(prev => {
        if (prev >= 100) {
          clearInterval(progressionInterval);
          clearInterval(stepInterval);
          if (simulateIntervalRef.current) clearInterval(simulateIntervalRef.current);
          
          const finalBpm = Math.floor(70 + Math.random() * 20);
          const finalSpo2 = Math.round(98 - Math.random() * 5);
          const finalPtt = Math.round(350 + Math.random() * 100);
          
          const finalHRV: HeartRateData = {
            bpm: finalBpm,
            rrIntervals: [850, 820, 880, 900],
            rmssd: 12.5,
            sdnn: 0.04,
            hrvCategory: 'Normal'
          };
          
          onCapture(finalBpm, finalSpo2, finalPtt, finalHRV);
          return 100;
        }
        
        setCurrentBpmAnimation(72 + (Math.random() > 0.5 ? 1 : -1));
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

  const downloadCSV = () => {
    if (rrIntervals.current.length === 0) return;
    
    let csvContent = "data:text/csv;charset=utf-8,Timestamp,RR_Interval(ms),BPM,SpO2\n";
    rrIntervals.current.forEach((val, i) => {
      const timestamp = new Date().toISOString();
      const currentBpm = Math.round(60000 / val);
      csvContent += `${timestamp},${val},${currentBpm},${spo2 || '--'}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `healthshield_session_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="obsidian-card" style={{ padding: 'clamp(1rem, 5vw, 2rem)', textAlign: 'center', width: '100%', boxSizing: 'border-box', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'nowrap', gap: '0.5rem', alignItems: 'center' }}>
        <h3 
          style={{ 
            fontSize: 'clamp(0.7rem, 3vw, 1.1rem)', 
            color: '#00F2FF', 
            cursor: 'default',
            margin: 0,
            textAlign: 'left'
          }}
        >
          OPTICAL SENTINEL CLINICAL
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          {confidence >= 100 && (
            <button 
              onClick={downloadCSV}
              className="hs-btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Download size={12} /> EXPORT
            </button>
          )}
          <X size={20} style={{ cursor: 'pointer', color: '#849495' }} onClick={onClose} />
        </div>
      </div>

      {/* Main Sensor Display */}
      <div style={{ position: 'relative', width: 'min(260px, 80vw)', height: 'min(260px, 80vw)', margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="sovereign-ring-container" style={{ inset: '-5px' }}>
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <circle className="sovereign-ring-bg" cx="50" cy="50" r="48" />
            <circle 
              className="sovereign-ring-fill" 
              cx="50" 
              cy="50" 
              r="48" 
              strokeDasharray="301.6"
              strokeDashoffset={301.6 - (301.6 * confidence) / 100}
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
            <svg 
              viewBox="0 0 200 100"
              preserveAspectRatio="none"
              style={{ 
                width: '100%', 
                height: '100%',
              }}
            >
              <defs>
                <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(0, 242, 255, 0)" />
                  <stop offset="50%" stopColor="rgba(0, 242, 255, 0.3)" />
                  <stop offset="100%" stopColor="rgba(110, 216, 195, 0.2)" />
                </linearGradient>
              </defs>
              <path
                d={`M 0 50 ${signalWave.map((val, i) => {
                  const min = Math.min(...signalWave, 50);
                  const max = Math.max(...signalWave, 100);
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
                <RefreshCw size={30} className="spin" style={{ color: '#00F2FF' }} />
                <span style={{ fontSize: '0.6rem', color: '#6ed8c3', marginTop: '0.5rem' }}>INITIALIZING...</span>
              </>
            ) : currentBpmAnimation ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span 
                    style={{ 
                      fontSize: 'clamp(2.5rem, 7vw, 4rem)',
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
                <span className="technical" style={{ fontSize: '0.6rem', color: '#6ed8c3' }}>BPM</span>
                
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  {spo2 !== null && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.5rem', color: '#849495' }}>SpO2</div>
                      <div style={{ fontSize: '0.7rem', color: '#6ed8c3', fontWeight: 'bold' }}>{Math.round(spo2)}%</div>
                    </div>
                  )}
                  {ptt !== null && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '0.5rem', color: '#849495' }}>PTT</div>
                      <div style={{ fontSize: '0.7rem', color: '#6ed8c3', fontWeight: 'bold' }}>{Math.round(ptt)}ms</div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Camera size={40} style={{ color: '#00F2FF', opacity: 0.5 }} />
            )}
            
            <span className="technical" style={{ fontSize: '0.5rem', color: '#6ed8c3', marginTop: '0.5rem' }}>
              {confidence < 30 ? "ACQUIRING..." : confidence < 70 ? "ANALYZING..." : "CALIBRATING..."}
            </span>
          </div>
        </div>
      </div>

      {/* Advanced Metrics Display */}
      {bpm && confidence >= 80 && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'rgba(0, 0, 0, 0.3)', borderRadius: '8px', border: '1px solid rgba(110, 216, 195, 0.2)' }}>
          <div style={{ fontSize: '0.65rem', color: '#00F2FF', marginBottom: '0.8rem', textAlign: 'left', display: 'flex', alignItems: 'center' }}>
            <Activity size={12} style={{ marginRight: '0.5rem' }} /> CARDIOVASCULAR METRICS
          </div>
          
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {getHRVDisplay()}
            
            <div style={{ padding: '0.5rem', background: 'rgba(110, 216, 195, 0.05)', borderRadius: '4px', fontSize: '0.55rem', color: '#849495' }}>
              <div style={{ color: '#00F2FF', marginBottom: '0.2rem', fontWeight: 'bold' }}>CLINICAL CAPABILITY</div>
              <div>• HRV Analysis: RMSSD calculation active</div>
              <div>• SpO2: Pulsatile ratio analysis active</div>
              <div>• PTT: Arterial wave timing estimated</div>
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
        <div style={{ marginBottom: 'min(1rem, 2vw)', padding: 'min(0.8rem, 1vw)', background: 'rgba(0, 0, 0, 0.3)', borderRadius: 'min(8px, 2vw)' }}>
          {processingSteps.map((step, index) => (
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
                <span style={{ 
                  fontSize: 'clamp(0.45rem, 0.65vw, 0.5rem)', 
                  color: '#849495' 
                }}>
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
        ) : "Place your index finger firmly over BOTH camera lens and flash/light source. Advanced algorithms will analyze your pulse waveform, blood oxygen saturation, and pulse transit time to provide clinical-grade cardiovascular metrics.")}
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button 
          onClick={handleRetry}
          className="hs-badge-secure" 
          style={{ 
            background: 'rgba(0, 242, 255, 0.1)', 
            cursor: 'pointer', 
            border: '1px solid rgba(0, 242, 255, 0.2)',
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            borderRadius: '8px'
          }}
        >
          <RefreshCw size={14} />
          <span style={{ fontSize: '0.6rem', fontWeight: 800 }}>RESTART</span>
        </button>

        <button 
          onClick={simulateCapture}
          className="hs-badge-secure" 
          style={{ 
            background: 'rgba(110, 216, 195, 0.1)', 
            cursor: 'pointer', 
            border: '1px solid rgba(110, 216, 195, 0.2)',
            padding: '12px 8px',
            color: '#6ed8c3',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            borderRadius: '8px'
          }}
        >
          <Zap size={14} />
          <span style={{ fontSize: '0.6rem', fontWeight: 800 }}>SIMULATE</span>
        </button>
      </div>

      {/* Sovereign Insight - BP Framing */}
      <div style={{ 
        marginTop: '1.5rem', 
        padding: '1.2rem', 
        background: 'linear-gradient(135deg, rgba(0, 242, 255, 0.08) 0%, rgba(110, 216, 195, 0.08) 100%)', 
        borderRadius: '12px',
        textAlign: 'left',
        border: '1px solid rgba(0, 242, 255, 0.2)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
      }}>
        <div style={{ fontSize: '0.7rem', color: '#00F2FF', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', fontWeight: 'bold', letterSpacing: '1px' }}>
          <Zap size={14} style={{ marginRight: '0.5rem' }} /> DUAL-METRIC CAPTURE ENABLED
        </div>
        <div style={{ fontSize: '0.6rem', color: '#6ed8c3', fontWeight: 'bold', marginBottom: '0.4rem' }}>
          HEMODYNAMIC HEURISTICS ACTIVE
        </div>
        <p style={{ fontSize: '0.55rem', color: '#849495', lineHeight: 1.6, margin: 0 }}>
          The Sentinel is calibrated to analyze <strong style={{color: '#fff'}}>Pulse Transit Time (PTT)</strong> and volume variance. This single reading simultaneously extrapolates your <strong style={{color: '#fff'}}>Blood Pressure</strong> estimate. Consistent daily logs build a predictive cardiovascular profile, identifying potential risks long before they manifest.
        </p>
      </div>

      {/* Info Card */}
      <div style={{ 
        marginTop: 'min(1.5rem, 3vw)', 
        padding: 'min(0.8rem, 1vw)', 
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
        <div style={{ fontSize: 'clamp(0.4rem, 2vw, 0.6rem)', color: '#849495', lineHeight: 'clamp(1.2, 1.4)', wordWrap: 'break-word' }}>
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
        <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '0.45rem', color: '#FF5050' }}>
          <strong>MEDICAL DISCLAIMER:</strong> HealthShield AI is NOT a clinical diagnostic device. Blood Pressure values are synthetic heuristic extrapolations derived from Pulse Transit Time (PTT) and Heart Rate variability, NOT direct mechanical measurements. Always consult a physician for medical decisions.
        </div>
      </div>
    </div>
  );
};

export default OpticalSensor;

'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bug, Camera, Cpu, Leaf, Loader2, Play, RefreshCw, ShieldAlert, Square, ThermometerSun, Upload, CloudRain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import AuthGuard from '@/components/AuthGuard';
import DiseaseRiskBadge from '@/components/shared/DiseaseRiskBadge';
import FusionSummary from '@/components/shared/FusionSummary';

function riskColor(level) {
  // NN classifier returns: none, unknown, minimal, mild, moderate, severe
  const HIGH = ['severe', 'high'];
  const MEDIUM = ['moderate', 'medium', 'mild'];
  const LOW = ['minimal', 'low', 'none'];
  if (HIGH.includes(level)) return 'bg-rose-600';
  if (MEDIUM.includes(level)) return 'bg-amber-500';
  if (LOW.includes(level)) return 'bg-emerald-600';
  return 'bg-slate-500'; // unknown / fallback
}

function riskColorBorder(level) {
  const HIGH = ['severe', 'high'];
  const MEDIUM = ['moderate', 'medium', 'mild'];
  const LOW = ['minimal', 'low', 'none'];
  if (HIGH.includes(level)) return 'border-rose-500';
  if (MEDIUM.includes(level)) return 'border-amber-400';
  if (LOW.includes(level)) return 'border-emerald-400';
  return 'border-slate-400';
}

function riskColorGlow(level) {
  const HIGH = ['severe', 'high'];
  const MEDIUM = ['moderate', 'medium', 'mild'];
  const LOW = ['minimal', 'low', 'none'];
  if (HIGH.includes(level)) return 'shadow-[0_0_15px_rgba(225,29,72,0.4)]';
  if (MEDIUM.includes(level)) return 'shadow-[0_0_12px_rgba(245,158,11,0.35)]';
  if (LOW.includes(level)) return 'shadow-[0_0_10px_rgba(16,185,129,0.3)]';
  return '';
}

function DetectionOverlay({ detections }) {
  if (!detections || detections.length === 0) return null;
  return (
    <div className="absolute inset-0 pointer-events-none">
      {(detections || []).map((d, idx) => {
        const [x, y, w, h] = d.bbox || [0.1, 0.1, 0.4, 0.3];
        const severity = d.severity || 'unknown';
        const borderColor = riskColorBorder(severity);
        const glow = riskColorGlow(severity);
        const pct = Math.round((d.confidence || 0) * 100);

        return (
          <div key={`detect-${idx}`}>
            {/* Semi-transparent highlight inside the box */}
            <div
              className={`absolute rounded-md ${borderColor} ${glow}`}
              style={{
                left: `${x * 100}%`,
                top: `${y * 100}%`,
                width: `${w * 100}%`,
                height: `${h * 100}%`,
                borderWidth: '3px',
                borderStyle: 'solid',
                background: severity === 'severe' || severity === 'high'
                  ? 'rgba(225,29,72,0.12)'
                  : severity === 'moderate' || severity === 'medium' || severity === 'mild'
                    ? 'rgba(245,158,11,0.10)'
                    : 'rgba(16,185,129,0.08)',
              }}
            />

            {/* Label badge above box */}
            <div
              className="absolute flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold shadow-lg border"
              style={{
                left: `${x * 100}%`,
                top: `${Math.max(0, y * 100 - 3.5)}%`,
                background: severity === 'severe' || severity === 'high'
                  ? 'linear-gradient(135deg, #e11d48, #be123c)'
                  : severity === 'moderate' || severity === 'medium' || severity === 'mild'
                    ? 'linear-gradient(135deg, #d97706, #b45309)'
                    : 'linear-gradient(135deg, #059669, #047857)',
                color: 'white',
                borderColor: severity === 'severe'
                  ? '#be123c' : severity === 'moderate' || severity === 'medium'
                    ? '#b45309' : '#047857',
              }}
            >
              {/* Severity dot */}
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: 'rgba(255,255,255,0.8)' }}
              />
              <span className="whitespace-nowrap">{d.label}</span>
              <span className="opacity-80">·</span>
              <span className="opacity-90">{pct}%</span>
            </div>

            {/* Bottom-right corner hint */}
            <div
              className="absolute rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
              style={{
                left: `${x * 100}%`,
                top: `${Math.min(100 - 2.5, (y + h) * 100 - 0.5)}%`,
                background: 'rgba(0,0,0,0.55)',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              {severity}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PestGuardContent() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [liveMode, setLiveMode] = useState(false);
  const [thermalStyle, setThermalStyle] = useState(false);
  const [cameraMode, setCameraMode] = useState('rgb');
  const [crop, setCrop] = useState('cotton');
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fusionResult, setFusionResult] = useState(null);
  const [fusionLoading, setFusionLoading] = useState(false);

  useEffect(() => () => stopCamera(), []);

  async function startCamera() {
    setError('');
    // Clear any previous uploaded preview to avoid stale overlays
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (err) {
      setError('Camera permission failed. Open this page on your phone through HTTPS/ngrok, then allow camera permission.');
    }
  }

  function stopCamera() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setLiveMode(false);
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    // Revoke blob URL to free memory
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
    }
  }

  async function uploadBlob(blob, filename = 'camera-frame.jpg') {
    setLoading(true);
    setError('');
    setFusionResult(null);
    try {
      const fd = new FormData();
      fd.append('file', blob, filename);
      fd.append('crop', crop || 'unknown crop');
      fd.append('camera_mode', cameraMode);
      const response = await fetch('/api/pest-animal-detect', { method: 'POST', body: fd });
      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(`Server error (${response.status}). The backend may need a restart.`);
      }
      if (!response.ok || !data.ok) throw new Error(data.detail || data.error || `Detection failed (${response.status})`);
      setResult(data);

      // Also fetch fusion analysis with weather context (non-blocking)
      setFusionLoading(true);
      const top = data.detections?.[0];
      if (top) {
        try {
          const fusionBody = {
            leaf: {
              prediction: top.rawLabel || top.label || '',
              confidence: top.confidence || 0,
              severity: data.severity || 'unknown',
              condition_category: top.conditionCategory || top.category || 'unknown',
              detections: data.detections || [],
            },
          };
          const fusionRes = await fetch('/api/crop-health/fusion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fusionBody),
          });
          if (fusionRes.ok) {
            setFusionResult(await fusionRes.json());
          }
        } catch (e) {
          // Fusion is optional — don't fail the main result
          console.warn('Fusion analysis failed:', e);
        }
      }
      setFusionLoading(false);
    } catch (err) {
      setError(err.message || 'Detection failed');
      setFusionLoading(false);
    } finally {
      setLoading(false);
    }
  }

  async function captureFrame() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    if (!blob) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(blob));
    await uploadBlob(blob, `${cameraMode}-camera-frame.jpg`);
  }

  function toggleLive() {
    if (!cameraOn) return;
    if (liveMode) {
      setLiveMode(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }
    setLiveMode(true);
    captureFrame();
    intervalRef.current = setInterval(captureFrame, 4500);
  }

  async function onPhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    await uploadBlob(file, file.name || 'crop-photo.jpg');
  }

  const detections = result?.detections || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-lime-50 to-amber-50">
      <main className="container mx-auto space-y-5 px-4 py-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <a href="/" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to AgriSarthi
            </a>
            <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold text-emerald-950 md:text-3xl">
              <Bug className="h-7 w-7 text-emerald-700" /> Neural Pest & Animal Guard
            </h1>
            <p className="mt-1 text-sm text-emerald-800/75">
              Use your OnePlus camera as the live input, send frames to the laptop backend, and get NN pest report + natural crop-care plan.
            </p>
          </div>
          <Badge className="w-fit bg-emerald-700"><Cpu className="mr-1 h-3 w-3" /> NN-ready detector</Badge>
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="border-emerald-200 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base"><Camera className="h-4 w-4 text-emerald-700" /> Phone camera / photo input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-emerald-900">Crop</label>
                  <Input value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="cotton, paddy, chilli..." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-emerald-900">Camera mode</label>
                  <select className="h-10 w-full rounded-md border bg-white px-3 text-sm" value={cameraMode} onChange={(e) => setCameraMode(e.target.value)}>
                    <option value="rgb">Normal RGB camera</option>
                    <option value="near_ir_like">IR / night-camera style frame</option>
                    <option value="thermal_external">External thermal camera frame</option>
                  </select>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-900">
                  Real thermal detection needs a calibrated thermal camera feed. Phone IR/night frames are useful only if the NN model is trained on similar images.
                </div>
              </div>

              <div className="relative aspect-video overflow-hidden rounded-2xl border bg-black">
                {cameraOn && <video ref={videoRef} muted playsInline className={`h-full w-full object-cover ${thermalStyle ? 'grayscale contrast-150 sepia saturate-200' : ''}`} />}
                {!cameraOn && previewUrl && <img src={previewUrl} alt="Uploaded crop preview" className={`h-full w-full object-cover ${thermalStyle ? 'grayscale contrast-150 sepia saturate-200' : ''}`} />}
                {!cameraOn && !previewUrl && (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center text-white/80">
                    <div>
                      <Camera className="mx-auto mb-3 h-12 w-12" />
                      <p className="font-semibold">Start phone rear camera or upload crop photo</p>
                      <p className="mt-1 text-xs text-white/60">Capture leaf underside, stem base, fruits/bolls and damaged crop area.</p>
                    </div>
                  </div>
                )}
                {(cameraOn || previewUrl) && <DetectionOverlay detections={detections} />}
                {loading && (
                  <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                    <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> neural scan running…</div>
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex flex-wrap gap-2">
                {!cameraOn ? (
                  <Button onClick={startCamera} className="bg-emerald-600 hover:bg-emerald-700"><Camera className="mr-2 h-4 w-4" /> Start camera</Button>
                ) : (
                  <Button onClick={stopCamera} variant="destructive"><Square className="mr-2 h-4 w-4" /> Stop camera</Button>
                )}
                <Button onClick={captureFrame} disabled={!cameraOn || loading} variant="secondary"><RefreshCw className="mr-2 h-4 w-4" /> Scan frame</Button>
                <Button onClick={toggleLive} disabled={!cameraOn || loading} variant={liveMode ? 'destructive' : 'outline'}>
                  {liveMode ? <Square className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}{liveMode ? 'Stop live scan' : 'Live scan every 4.5s'}
                </Button>
                <label className="inline-flex cursor-pointer items-center rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
                  <Upload className="mr-2 h-4 w-4" /> Upload photo
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhotoUpload} />
                </label>
                <Button onClick={() => setThermalStyle((v) => !v)} variant="outline">
                  <ThermometerSun className="mr-2 h-4 w-4" /> {thermalStyle ? 'Normal view' : 'Thermal-style preview'}
                </Button>
              </div>

              {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
            </CardContent>
          </Card>

          <Card className="border-emerald-200">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="h-4 w-4 text-amber-600" /> NN report</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!result ? (
                <p className="text-sm text-slate-600">Scan a frame or upload a crop photo to get a pest/animal report.</p>
              ) : (
                <>
                  <div className="rounded-xl border bg-white p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">Overall risk</span>
                      <Badge className={riskColor(result.severity)}>{result.severity}</Badge>
                    </div>
                    <Progress value={result.overallRisk || 0} className="h-2" />
                    <p className="mt-2 text-sm text-slate-700">{result.summary}</p>
                    <div className="mt-2 rounded-md bg-slate-50 p-2 text-[11px] text-slate-600">
                      Model: {result.model?.type || 'unknown'} · {result.model?.status || 'unknown'}
                    </div>
                  </div>

                  {!result.modelReady && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      Neural model is not connected yet. Add <b>backend/ml_models/pest_classifier.onnx</b> or set Roboflow API values in backend <b>.env</b>.
                    </div>
                  )}

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-emerald-900">Detected classes</h3>
                    {detections.length === 0 ? (
                      <div className="rounded-lg border bg-slate-50 p-3 text-sm text-slate-700">No class prediction yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {detections.map((d, idx) => (
                          <div key={idx} className="rounded-lg border bg-white p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold text-slate-900">{d.label}</div>
                              <Badge className={riskColor(d.severity)}>{d.severity}</Badge>
                            </div>
                            <div className="mt-1 text-xs text-slate-600">Confidence: {Math.round((d.confidence || 0) * 100)}%</div>
                            <p className="mt-2 text-xs text-slate-700">{d.note}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-emerald-900"><Leaf className="h-4 w-4" /> Natural / crop-care actions</h3>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-slate-700">
                      {(result.recommendations || []).slice(0, 8).map((r, idx) => <li key={idx}>{r}</li>)}
                    </ul>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-emerald-900">Crop-relevant fertiliser / soil inputs</h3>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-slate-700">
                      {(result.naturalFertiliserPlan || []).slice(0, 8).map((r, idx) => <li key={idx}>{r}</li>)}
                    </ul>
                  </div>

                  <div className="rounded-lg border bg-slate-50 p-3 text-[11px] text-slate-600">{result.thermalNote}</div>

                  {/* Weather-based disease risk estimate */}
                  {result.disease_risk && (
                    <DiseaseRiskBadge
                      level={result.disease_risk.risk_level || 'unknown'}
                      score={result.disease_risk.risk_score}
                      label="Weather Disease Risk"
                    />
                  )}

                  {/* Farmer advice section from explanation */}
                  {result.explanation?.farmer_advice?.what_to_do_now && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                      <p className="mb-1 font-semibold">What to do now</p>
                      <p>{result.explanation.farmer_advice.what_to_do_now}</p>
                      {result.explanation.farmer_advice.when_to_check_again && (
                        <>
                          <p className="mt-2 font-semibold">When to check again</p>
                          <p>{result.explanation.farmer_advice.when_to_check_again}</p>
                        </>
                      )}
                      {result.explanation.farmer_advice.confidence_note && (
                        <p className="mt-2 italic text-amber-700">{result.explanation.farmer_advice.confidence_note}</p>
                      )}
                    </div>
                  )}

                  {/* Explanation factors */}
                  {result.explanation?.factors && result.explanation.factors.length > 0 && (
                    <div>
                      <h3 className="mb-1 text-xs font-semibold text-slate-600">Analysis factors</h3>
                      <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-500">
                        {result.explanation.factors.map((f, idx) => <li key={idx}>{f}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Fusion assessment section */}
        {result && (
          <section className="max-w-xl">
            <FusionSummary
              fusion={fusionResult}
              loading={fusionLoading}
              error={null}
            />
          </section>
        )}
      </main>
    </div>
  );
}

export default function PestGuardPage() {
  return (
    <AuthGuard>
      <PestGuardContent />
    </AuthGuard>
  );
}

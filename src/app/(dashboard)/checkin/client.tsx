"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { SECTION_LABELS } from "@/lib/section";
import { usePermissions } from "@/lib/use-permissions";
import { useT } from "@/components/i18n/provider";
import { Camera, CameraOff, Check } from "lucide-react";
import type { Section } from "@prisma/client";

type DetectedBarcode = { rawValue: string };
type BarcodeDetectorClass = new (opts?: { formats?: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<DetectedBarcode[]>;
};

export function CheckinScanner({
  initialSection,
  activityId,
}: {
  initialSection: string;
  activityId: string;
}) {
  const { t, locale } = useT();
  const perms = usePermissions();
  // Only sections the user can write to — taking attendance is a write action.
  const writableSections = useMemo(() => {
    return (Object.keys(SECTION_LABELS) as Section[]).filter((s) => perms.canWriteSection(s));
  }, [perms]);

  // If the requested section isn't writable, fall back to the first writable one.
  const safeInitial = writableSections.includes(initialSection as Section)
    ? initialSection
    : writableSections[0] ?? "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [section, setSection] = useState(safeInitial);
  const [scanning, setScanning] = useState(false);
  const [supported, setSupported] = useState(true);
  const [manualToken, setManualToken] = useState("");
  const [recent, setRecent] = useState<{ name: string; time: string }[]>([]);
  const lastTokenRef = useRef<{ token: string; at: number } | null>(null);

  // If permissions become available after first render and the current section
  // isn't allowed, switch.
  useEffect(() => {
    if (perms.loading) return;
    if (writableSections.length > 0 && !writableSections.includes(section as Section)) {
      setSection(writableSections[0]);
    }
  }, [perms.loading, writableSections, section]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const W = window as unknown as { BarcodeDetector?: BarcodeDetectorClass };
    if (!W.BarcodeDetector) setSupported(false);
  }, []);

  const submitToken = async (rawValue: string) => {
    let token = rawValue;
    // QR may encode a full URL like https://site/checkin/<token>
    const match = rawValue.match(/\/checkin\/([\w-]+)/);
    if (match) token = match[1];

    // Debounce duplicates
    const now = Date.now();
    if (lastTokenRef.current?.token === token && now - lastTokenRef.current.at < 3000) return;
    lastTokenRef.current = { token, at: now };

    const r = await fetch("/api/attendance/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, section, activityId: activityId || null }),
    });
    const data = await r.json();
    if (r.ok) {
      toast.success(`✓ ${data.member.fullName}`);
      setRecent((p) => [{ name: data.member.fullName, time: new Date().toLocaleTimeString(locale === "fr" ? "fr-MA" : "ar-MA") }, ...p.slice(0, 9)]);
    } else toast.error(data.error ?? t("misc.failed"));
  };

  const startScan = async () => {
    if (!supported) {
      toast.error(t("checkin.unsupportedScanToast"));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const W = window as unknown as { BarcodeDetector: BarcodeDetectorClass };
      const detector = new W.BarcodeDetector({ formats: ["qr_code"] });

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) await submitToken(codes[0].rawValue);
        } catch {
          // ignore
        }
        if (streamRef.current) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      toast.error(t("checkin.cameraError"));
    }
  };

  const stopScan = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  useEffect(() => () => stopScan(), []);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    submitToken(manualToken.trim());
    setManualToken("");
  };

  if (!perms.loading && writableSections.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {t("checkin.noPermission")}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t("checkin.title")}</h1>
        <p className="text-muted-foreground">{t("checkin.scanSubtitle")}</p>
      </div>

      <Card>
        <CardContent className="grid md:grid-cols-2 gap-3 py-4">
          <div>
            <Label>{t("misc.section")}</Label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full h-10 px-3 rounded-md border bg-background"
              disabled={writableSections.length === 1}
            >
              {writableSections.map((k) => (
                <option key={k} value={k}>{SECTION_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            {!scanning ? (
              <Button onClick={startScan} className="w-full" disabled={!supported}>
                <Camera size={16} />{t("checkin.startScan")}
              </Button>
            ) : (
              <Button onClick={stopScan} variant="outline" className="w-full">
                <CameraOff size={16} />{t("checkin.stop")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {scanning && (
        <Card>
          <CardContent className="p-0">
            <video ref={videoRef} className="w-full rounded-lg" muted playsInline />
          </CardContent>
        </Card>
      )}

      {!supported && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground mb-3">{t("checkin.manualFallback")}</p>
            <form onSubmit={submitManual} className="flex gap-2">
              <Input placeholder={t("checkin.tokenPlaceholder")} value={manualToken} onChange={(e) => setManualToken(e.target.value)} />
              <Button type="submit"><Check size={14} /></Button>
            </form>
          </CardContent>
        </Card>
      )}

      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("checkin.recent")}</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {recent.map((r, i) => (
              <div key={i} className="py-2 flex justify-between text-sm">
                <span>{r.name}</span>
                <span className="text-muted-foreground text-xs">{r.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

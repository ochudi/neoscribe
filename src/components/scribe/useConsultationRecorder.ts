"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { AudioRecorder } from "@/lib/local/recorder";
import { ensureAsrLoaded, transcribe, unloadAsr } from "@/lib/local/asr";

export type RecorderStatus =
  | "idle"
  | "preparing"
  | "recording"
  | "transcribing"
  | "error";

/** Seconds of audio needed before the first near-live pass runs. */
const MIN_PARTIAL_S = 2.5;
/** How often near-live re-transcribes the running recording. */
const NEAR_LIVE_INTERVAL_MS = 5_000;

interface Options {
  asrModelId: string;
  nearLive: boolean;
  /** Final transcript when recording stops. */
  onComplete: (text: string) => void;
}

export interface RecorderApi {
  status: RecorderStatus;
  elapsedS: number;
  /** 0..1 input level for the meter. */
  level: number;
  /** Rolling near-live transcript while recording. */
  partial: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  cancel: () => void;
}

export function useConsultationRecorder({
  asrModelId,
  nearLive,
  onComplete,
}: Options): RecorderApi {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [elapsedS, setElapsedS] = useState(0);
  const [level, setLevel] = useState(0);
  const [partial, setPartial] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<AudioRecorder | null>(null);
  const liveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveBusy = useRef(false);
  const modelRef = useRef(asrModelId);
  const onCompleteRef = useRef(onComplete);
  modelRef.current = asrModelId;
  onCompleteRef.current = onComplete;

  const clearTimers = useCallback(() => {
    if (liveTimer.current) clearInterval(liveTimer.current);
    if (tickTimer.current) clearInterval(tickTimer.current);
    liveTimer.current = null;
    tickTimer.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setPartial("");
    setElapsedS(0);
    setStatus("preparing");
    const rec = new AudioRecorder();
    recorderRef.current = rec;
    try {
      // Load Whisper first so near-live works from the first window.
      await ensureAsrLoaded(modelRef.current);
      await rec.start({ onLevel: setLevel });
    } catch (e) {
      recorderRef.current = null;
      setStatus("error");
      setError(e instanceof Error ? e.message : "Couldn't start recording.");
      return;
    }

    const startedAt = Date.now();
    setStatus("recording");
    tickTimer.current = setInterval(
      () => setElapsedS((Date.now() - startedAt) / 1000),
      200
    );

    if (nearLive) {
      liveTimer.current = setInterval(() => {
        const r = recorderRef.current;
        if (!r || liveBusy.current || r.durationS < MIN_PARTIAL_S) return;
        liveBusy.current = true;
        const snapshot = r.getSamples16k();
        transcribe(modelRef.current, snapshot)
          .then((text) => {
            if (text) setPartial(text);
          })
          .catch(() => {
            /* partial failures are non-fatal — keep recording */
          })
          .finally(() => {
            liveBusy.current = false;
          });
      }, NEAR_LIVE_INTERVAL_MS);
    }
  }, [nearLive]);

  const stop = useCallback(async () => {
    clearTimers();
    const rec = recorderRef.current;
    if (!rec) {
      setStatus("idle");
      return;
    }
    setStatus("transcribing");
    setLevel(0);
    const samples = rec.getSamples16k();
    rec.stop();
    recorderRef.current = null;

    // Under ~0.4s of audio — nothing worth transcribing.
    if (samples.length < 6_400) {
      setStatus("idle");
      unloadAsr();
      onCompleteRef.current(partial.trim());
      return;
    }

    try {
      const raw = await transcribe(modelRef.current, samples);
      const finalText = raw.trim() || partial.trim();
      if (!finalText) {
        setStatus("error");
        setError(
          "No speech was detected in the recording. Check that the right microphone is selected and that its level meter moved, then try again."
        );
        return;
      }
      onCompleteRef.current(finalText);
    } catch (e) {
      console.error("[recorder] transcription failed:", e);
      setStatus("error");
      setError(
        e instanceof Error ? e.message : "Transcription failed. Try again."
      );
      return;
    } finally {
      unloadAsr(); // free Whisper before the user runs a text model
    }
    setStatus("idle");
    setPartial("");
  }, [clearTimers, partial]);

  const cancel = useCallback(() => {
    clearTimers();
    recorderRef.current?.stop();
    recorderRef.current = null;
    unloadAsr();
    setStatus("idle");
    setPartial("");
    setLevel(0);
    setError(null);
  }, [clearTimers]);

  // Tear everything down if the component unmounts mid-recording.
  useEffect(() => {
    return () => {
      clearTimers();
      recorderRef.current?.stop();
      recorderRef.current = null;
      unloadAsr();
    };
  }, [clearTimers]);

  return {
    status,
    elapsedS,
    level,
    partial,
    error,
    start: () => void start(),
    stop: () => void stop(),
    cancel,
  };
}

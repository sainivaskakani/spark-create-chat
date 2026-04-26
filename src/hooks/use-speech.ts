import { useCallback, useEffect, useRef, useState } from "react";

// ---------- Speech Recognition (browser-native, free) ----------
type SR = any;
function getSR(): SR | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const recRef = useRef<any>(null);

  useEffect(() => {
    setSupported(!!getSR());
  }, []);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (e: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) setTranscript((t) => (t + " " + finalText).trim());
      setInterim(interimText);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    setTranscript("");
    setInterim("");
    rec.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript("");
    setInterim("");
  }, []);

  return { supported, listening, transcript, interim, start, stop, reset };
}

// ---------- Speech Synthesis (TTS) ----------
export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const speak = useCallback((id: string, text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/```[\s\S]*?```/g, " code block ").replace(/[#*`>_~]/g, "");
    const u = new SpeechSynthesisUtterance(clean);
    u.rate = 1.02;
    u.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => /Google|Natural|Premium|Samantha/i.test(v.name)) ||
      voices.find((v) => v.lang?.startsWith(navigator.language?.slice(0, 2) || "en")) ||
      voices[0];
    if (preferred) u.voice = preferred;
    u.onend = () => setSpeakingId(null);
    u.onerror = () => setSpeakingId(null);
    setSpeakingId(id);
    window.speechSynthesis.speak(u);
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, []);

  return { supported, speakingId, speak, stop };
}

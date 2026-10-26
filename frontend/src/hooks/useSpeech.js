import { useState, useCallback, useRef, useEffect } from 'react';

const LANGUAGE_CODES = {
  en: 'en-US',
  fr: 'fr-FR',
  de: 'de-DE',
};

export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef(null);

  useEffect(() => {
    setIsSupported('speechSynthesis' in window);
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback((text, language = 'en') => {
    if (!('speechSynthesis' in window)) {
      console.warn('[AURA TTS] Web Speech API not supported');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const langCode = LANGUAGE_CODES[language] || 'en-US';
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Try to select a matching voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang === langCode && !v.name.includes('Google') // prefer native
    ) || voices.find((v) => v.lang.startsWith(language));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const getAvailableVoices = useCallback(() => {
    if (!('speechSynthesis' in window)) return [];
    return window.speechSynthesis.getVoices();
  }, []);

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    isSupported,
    getAvailableVoices,
    LANGUAGE_CODES,
  };
}

export default useSpeech;

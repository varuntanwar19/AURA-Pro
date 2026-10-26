import React from 'react';
import { useTranslation } from 'react-i18next';
import { Volume2, VolumeX, Globe, Wifi, WifiOff, User } from 'lucide-react';
import { motion } from 'framer-motion';
import useAuraStore from '../../store/auraStore';

const CLOUD_PROVIDERS = [
  {
    id: 'azure',
    label: 'Azure',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M13.05 4.24L6.56 18.05l5.42-.03 1.68-2.02 4.28 2.05H22L13.05 4.24zm-2.28 2.8L4 18.02l4.78-.01 2-5.38-1.01 4.52 3.42-7.52-2.42-2.59z"/>
      </svg>
    ),
    color: 'text-blue-400',
    activeBg: 'bg-blue-500/15 border-blue-500/40',
  },
  {
    id: 'aws',
    label: 'AWS',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.030-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.296.072-.583.16-.862.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.15.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 0 1-.056.2l-1.923 6.17c-.048.16-.104.263-.168.311a.51.51 0 0 1-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08h-.686zm10.105.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.224a.569.569 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 0 0 .406-.758.777.777 0 0 0-.215-.559c-.144-.151-.416-.287-.807-.415l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 0 1-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 3.652 3.652 0 0 0-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.71 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.343-.886.447-.36.111-.743.167-1.142.167z"/>
      </svg>
    ),
    color: 'text-amber-400',
    activeBg: 'bg-amber-500/15 border-amber-500/40',
  },
  {
    id: 'gcp',
    label: 'GCP',
    icon: () => (
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12.19 2.38a9.344 9.344 0 0 0-9.234 6.893c.053-.02.107-.037.161-.047l4.808-.875s.238-.39.36-.37c1.122-1.302 2.755-2.134 4.627-2.134.703 0 1.384.14 2.012.386L17.55 4.21A9.297 9.297 0 0 0 12.19 2.38zM7.807 9.108l-3.361.615c-.17.65-.261 1.333-.261 2.04 0 4.842 3.796 8.794 8.54 9.022-1.813-.658-3.272-2.035-4.024-3.797l1.72-2.979a4.585 4.585 0 0 1-.614-2.28 4.583 4.583 0 0 1 .002-.078L7.807 9.108zm9.35 3.63a4.585 4.585 0 0 1-4.586 4.585 4.57 4.57 0 0 1-2.328-.636l-1.415 2.45a9.28 9.28 0 0 0 3.743.776 9.344 9.344 0 0 0 9.234-6.893 9.336 9.336 0 0 0-.51-5.663l-2.352 4.073a4.559 4.559 0 0 1 .214 1.308z"/>
      </svg>
    ),
    color: 'text-green-400',
    activeBg: 'bg-green-500/15 border-green-500/40',
  },
];

const LANGUAGES = [
  { code: 'en', label: 'EN', flag: '🇺🇸' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
];

export default function TopBar() {
  const { t, i18n } = useTranslation();
  const { selectedCloud, setSelectedCloud, language, setLanguage, ttsEnabled, toggleTts, wsConnected } = useAuraStore();

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  return (
    <header className="h-16 flex-shrink-0 flex items-center px-6 gap-6 bg-aura-surface border-b border-aura-border z-40">
      {/* Cloud Provider Selector */}
      <div className="flex items-center gap-1 bg-aura-card rounded-xl p-1 border border-aura-border" role="tablist" aria-label="Cloud provider">
        {CLOUD_PROVIDERS.map(({ id, label, icon: Icon, color, activeBg }) => (
          <button
            key={id}
            onClick={() => setSelectedCloud(id)}
            role="tab"
            aria-selected={selectedCloud === id}
            aria-label={t(`topbar.clouds.${id}`)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 border
              ${selectedCloud === id
                ? `${activeBg} ${color}`
                : 'text-aura-subtext border-transparent hover:text-aura-text hover:bg-aura-surface'
              }`}
          >
            <span className={selectedCloud === id ? color : 'text-aura-muted'}>
              <Icon />
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Language Selector */}
      <div className="flex items-center gap-1 bg-aura-card rounded-xl p-1 border border-aura-border" role="group" aria-label={t('topbar.language')}>
        <Globe className="w-4 h-4 text-aura-muted ml-1" />
        {LANGUAGES.map(({ code, label, flag }) => (
          <button
            key={code}
            onClick={() => handleLanguageChange(code)}
            aria-label={label}
            aria-pressed={language === code}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
              ${language === code
                ? 'bg-aura-cyan/15 text-aura-cyan border border-aura-cyan/30'
                : 'text-aura-subtext border border-transparent hover:text-aura-text'
              }`}
          >
            <span>{flag}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* TTS Toggle */}
      <button
        onClick={toggleTts}
        aria-label={ttsEnabled ? t('topbar.ttsOn') : t('topbar.ttsOff')}
        aria-pressed={ttsEnabled}
        title={ttsEnabled ? t('topbar.ttsOn') : t('topbar.ttsOff')}
        className={`p-2 rounded-xl border transition-all duration-200
          ${ttsEnabled
            ? 'bg-aura-purple/15 text-aura-violet border-aura-purple/30 shadow-purple-glow/50'
            : 'bg-aura-card text-aura-muted border-aura-border hover:text-aura-text hover:border-aura-purple/30'
          }`}
      >
        {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>

      {/* Connection Status */}
      <motion.div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-300
          ${wsConnected
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
            : 'bg-red-500/10 text-red-400 border-red-500/25'
          }`}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity }}
        aria-live="polite"
        aria-label={wsConnected ? t('topbar.connected') : t('topbar.disconnected')}
      >
        {wsConnected
          ? <><Wifi className="w-3.5 h-3.5" /> {t('topbar.connected')}</>
          : <><WifiOff className="w-3.5 h-3.5" /> {t('topbar.disconnected')}</>
        }
      </motion.div>

      {/* User Avatar */}
      <button
        aria-label={t('topbar.user')}
        className="w-8 h-8 rounded-full bg-gradient-purple flex items-center justify-center text-white hover:opacity-80 transition-opacity"
      >
        <User className="w-4 h-4" />
      </button>
    </header>
  );
}

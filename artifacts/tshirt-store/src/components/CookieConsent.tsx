import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Cookie, Settings } from 'lucide-react';
import { enableAnalyticsNow } from '../services/analyticsConsent.ts';

const STORAGE_KEY = 'cookie_consent';

export type ConsentChoice = {
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
};

export function getConsent(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentChoice;
  } catch {
    return null;
  }
}

function saveConsent(choice: ConsentChoice) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(true);

  useEffect(() => {
    const existing = getConsent();
    if (!existing) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    saveConsent({ analytics: true, marketing: true, decided: true });
    enableAnalyticsNow();
    setVisible(false);
  };

  const reject = () => {
    saveConsent({ analytics: false, marketing: false, decided: true });
    setVisible(false);
  };

  const saveCustom = () => {
    saveConsent({ analytics, marketing, decided: true });
    if (analytics) enableAnalyticsNow();
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:bottom-6 md:max-w-sm z-[9000]"
        >
          <div className="bg-white rounded-2xl border border-outline-subtle shadow-2xl overflow-hidden">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <Cookie className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">Usamos cookies</p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Utilizamos cookies para melhorar sua experiência, analisar o tráfego e personalizar o conteúdo.
                    Sua privacidade é importante para nós.
                  </p>
                </div>
                <button
                  onClick={reject}
                  className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  aria-label="Fechar e recusar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <AnimatePresence>
                {showCustomize && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-outline-subtle/40 pt-3 mb-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-700">Cookies Essenciais</p>
                          <p className="text-[10px] text-gray-400">Necessários para o funcionamento do site</p>
                        </div>
                        <div className="w-9 h-5 bg-primary rounded-full flex-shrink-0 opacity-50 cursor-not-allowed" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-700">Analytics (Firebase)</p>
                          <p className="text-[10px] text-gray-400">Dados de uso anônimos</p>
                        </div>
                        <button
                          onClick={() => setAnalytics(v => !v)}
                          className={`w-9 h-5 rounded-full flex-shrink-0 transition-colors relative ${analytics ? 'bg-primary' : 'bg-gray-200'}`}
                          aria-pressed={analytics}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${analytics ? 'left-4' : 'left-0.5'}`} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-700">Marketing</p>
                          <p className="text-[10px] text-gray-400">Personalização e anúncios</p>
                        </div>
                        <button
                          onClick={() => setMarketing(v => !v)}
                          className={`w-9 h-5 rounded-full flex-shrink-0 transition-colors relative ${marketing ? 'bg-primary' : 'bg-gray-200'}`}
                          aria-pressed={marketing}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${marketing ? 'left-4' : 'left-0.5'}`} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-2">
                {showCustomize ? (
                  <button
                    onClick={saveCustom}
                    className="w-full bg-primary text-white text-xs font-bold py-2.5 rounded-xl hover:bg-primary-dark transition-colors"
                  >
                    Salvar preferências
                  </button>
                ) : (
                  <button
                    onClick={accept}
                    className="w-full bg-primary text-white text-xs font-bold py-2.5 rounded-xl hover:bg-primary-dark transition-colors"
                  >
                    Aceitar todos
                  </button>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={reject}
                    className="flex-1 text-xs font-bold py-2.5 rounded-xl border border-outline-subtle text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    Recusar
                  </button>
                  <button
                    onClick={() => setShowCustomize(v => !v)}
                    className="flex-1 text-xs font-bold py-2.5 rounded-xl border border-outline-subtle text-gray-500 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                  >
                    <Settings className="w-3 h-3" />
                    Personalizar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

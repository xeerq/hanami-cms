import { useState, useEffect } from 'react';

export type CookieConsentType = 'necessary' | 'analytics' | 'marketing' | 'all';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const DEFAULT_PREFERENCES: CookiePreferences = {
  necessary: true, // Always true, can't be disabled
  analytics: false,
  marketing: false,
};

export const useCookieConsent = () => {
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState<CookiePreferences>(DEFAULT_PREFERENCES);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    const savedPreferences = localStorage.getItem('cookie-preferences');
    
    if (consent === 'true') {
      setHasConsent(true);
      setShowBanner(false);
      if (savedPreferences) {
        try {
          setPreferences(JSON.parse(savedPreferences));
        } catch (error) {
          console.error('Error parsing cookie preferences:', error);
        }
      }
    } else if (consent === 'false') {
      setHasConsent(false);
      setShowBanner(false);
    } else {
      setHasConsent(null);
      setShowBanner(true);
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    setHasConsent(true);
    setShowBanner(false);
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('cookie-preferences', JSON.stringify(allAccepted));
  };

  const acceptNecessary = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setHasConsent(true);
    setShowBanner(false);
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('cookie-preferences', JSON.stringify(DEFAULT_PREFERENCES));
  };

  const acceptCustom = (customPreferences: CookiePreferences) => {
    const finalPreferences = {
      ...customPreferences,
      necessary: true, // Force necessary to always be true
    };
    setPreferences(finalPreferences);
    setHasConsent(true);
    setShowBanner(false);
    localStorage.setItem('cookie-consent', 'true');
    localStorage.setItem('cookie-preferences', JSON.stringify(finalPreferences));
  };

  const resetConsent = () => {
    localStorage.removeItem('cookie-consent');
    localStorage.removeItem('cookie-preferences');
    setHasConsent(null);
    setPreferences(DEFAULT_PREFERENCES);
    setShowBanner(true);
  };

  return {
    hasConsent,
    preferences,
    showBanner,
    acceptAll,
    acceptNecessary,
    acceptCustom,
    resetConsent,
  };
};
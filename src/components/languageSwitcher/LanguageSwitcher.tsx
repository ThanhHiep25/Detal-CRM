'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    // This code only runs on the client, after hydration.
    setHasMounted(true);
    const savedLanguage = localStorage.getItem('language');
    if (savedLanguage && savedLanguage !== i18n.language) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng);
  };

  // Render a placeholder or the default language on the server.
  // The correct state will be applied on the client after useEffect.
  if (!hasMounted) {
    return (
      <div className="flex gap-2">
        <button
          className={`text-sm font-bold p-2 rounded-md bg-blue-500 text-white`}
        >
          VI
        </button>
        <button
          className={`text-sm font-bold p-2 rounded-md bg-gray-200 text-gray-800`}
        >
          EN
        </button>
      </div>
    );
  }

  // Once mounted on the client, render based on the actual language.
  return (
    <div className="flex items-center justify-center gap-2">

      <button
        onClick={() => changeLanguage('vi')}
        className={`text-sm font-bold w-20 h-10 flex items-center justify-center gap-1 rounded-full ${i18n.language === 'vi' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
      >
        <img src="/LOGO/viet-nam.png" alt="vi" width={20} height={20} />
        VI
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`text-sm font-bold w-20 h-10 flex items-center justify-center gap-1 rounded-full ${i18n.language === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}
      >
         <img src="/LOGO/united-states-of-america.png" alt="vi" width={20} height={20} />
        EN
      </button>

      {/* Select language */}

      {/* <select 
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="ml-2 p-2 rounded-md border border-gray-300 bg-white text-gray-800"
      >
        <option value="vi">VI</option>
        <option value="en">EN</option>
      </select> */}

    </div>
  );
};

export default LanguageSwitcher;
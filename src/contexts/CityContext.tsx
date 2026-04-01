import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

export interface City {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  deliveryFee: number;
  minOrder: number;
  estimatedDelivery: string;
  estimatedDeliveryAr: string;
  isActive: boolean;
}

const DEFAULT_CITIES: City[] = [
  {
    id: 'riyadh',
    name: 'Riyadh',
    nameAr: 'الرياض',
    slug: 'riyadh',
    deliveryFee: 25,
    minOrder: 100,
    estimatedDelivery: 'Same day delivery',
    estimatedDeliveryAr: 'توصيل في نفس اليوم',
    isActive: true,
  },
  {
    id: 'jeddah',
    name: 'Jeddah',
    nameAr: 'جدة',
    slug: 'jeddah',
    deliveryFee: 25,
    minOrder: 100,
    estimatedDelivery: 'Same day delivery',
    estimatedDeliveryAr: 'توصيل في نفس اليوم',
    isActive: true,
  },
  {
    id: 'dammam',
    name: 'Dammam',
    nameAr: 'الدمام',
    slug: 'dammam',
    deliveryFee: 30,
    minOrder: 120,
    estimatedDelivery: 'Same day delivery',
    estimatedDeliveryAr: 'توصيل في نفس اليوم',
    isActive: true,
  },
  {
    id: 'makkah',
    name: 'Makkah',
    nameAr: 'مكة المكرمة',
    slug: 'makkah',
    deliveryFee: 30,
    minOrder: 120,
    estimatedDelivery: 'Same day delivery',
    estimatedDeliveryAr: 'توصيل في نفس اليوم',
    isActive: true,
  },
  {
    id: 'madinah',
    name: 'Madinah',
    nameAr: 'المدينة المنورة',
    slug: 'madinah',
    deliveryFee: 30,
    minOrder: 120,
    estimatedDelivery: 'Next day delivery',
    estimatedDeliveryAr: 'توصيل في اليوم التالي',
    isActive: true,
  },
  {
    id: 'khobar',
    name: 'Khobar',
    nameAr: 'الخبر',
    slug: 'khobar',
    deliveryFee: 30,
    minOrder: 120,
    estimatedDelivery: 'Same day delivery',
    estimatedDeliveryAr: 'توصيل في نفس اليوم',
    isActive: true,
  },
];

interface CityContextType {
  selectedCity: City | null;
  cities: City[];
  setCity: (city: City) => void;
  showCityModal: boolean;
  setShowCityModal: (show: boolean) => void;
  isFirstVisit: boolean;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

const CITY_STORAGE_KEY = 'calapres_selected_city';

export const CityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cities] = useState<City[]>(DEFAULT_CITIES);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [showCityModal, setShowCityModal] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(CITY_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const found = DEFAULT_CITIES.find(c => c.id === parsed.id);
        if (found) {
          setSelectedCity(found);
          return;
        }
      } catch { /* ignore */ }
    }
    setIsFirstVisit(true);
    setShowCityModal(true);
  }, []);

  const setCity = useCallback((city: City) => {
    setSelectedCity(city);
    localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify({ id: city.id }));
    setShowCityModal(false);
    setIsFirstVisit(false);
  }, []);

  return (
    <CityContext.Provider value={{ selectedCity, cities, setCity, showCityModal, setShowCityModal, isFirstVisit }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
};

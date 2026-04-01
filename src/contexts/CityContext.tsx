import React, { createContext, useContext, ReactNode } from 'react';

export interface City {
  id: string;
  name: string;
  nameAr: string;
  deliveryFee: number;
}

const RIYADH: City = {
  id: 'riyadh',
  name: 'Riyadh',
  nameAr: 'الرياض',
  deliveryFee: 25,
};

interface CityContextType {
  selectedCity: City;
  showCityModal: boolean;
  setShowCityModal: (show: boolean) => void;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export const CityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <CityContext.Provider value={{ selectedCity: RIYADH, showCityModal: false, setShowCityModal: () => {} }}>
      {children}
    </CityContext.Provider>
  );
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) throw new Error('useCity must be used within CityProvider');
  return context;
};

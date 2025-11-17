"use client";
import React, { createContext, useContext, useMemo } from 'react';

type DevContextType = {
  // Removed disableCursor functionality
};

const DevContext = createContext<DevContextType | undefined>(undefined);

export const DevProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value = useMemo(() => ({}), []);

  return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
};

export const useDev = () => {
  const ctx = useContext(DevContext);
  if (!ctx) throw new Error('useDev must be used within DevProvider');
  return ctx;
};



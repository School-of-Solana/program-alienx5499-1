import React from 'react';
import { useDev } from '@/contexts/DevContext';

export const DevPanel: React.FC = () => {
  const {} = useDev();

  if (process.env.NODE_ENV === 'production') return null;

  return null; // DevPanel removed cursor disable functionality
};



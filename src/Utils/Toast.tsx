import React from 'react';
import { Toaster } from 'react-hot-toast';

export const GlobalToaster: React.FC = () => {
  return (
    <Toaster 
      position="bottom-right" 
      toastOptions={{ 
        style: { 
          background: '#1e1e1e', 
          color: '#fff', 
          border: '1px solid #333' 
        },
        success: {
          iconTheme: {
            primary: '#39FF14',
            secondary: '#000',
          },
        }
      }} 
    />
  );
};

export default GlobalToaster;


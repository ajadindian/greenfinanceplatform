import React from 'react';

interface DialogProps {
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export const Dialog: React.FC<DialogProps> & {
  Trigger: React.FC<{ children: React.ReactNode; asChild?: boolean }>;
  Content: React.FC<{ children: React.ReactNode; className?: string }>;
  Header: React.FC<{ children: React.ReactNode; className?: string }>;
  Title: React.FC<{ children: React.ReactNode; className?: string }>;
  Description: React.FC<{ children: React.ReactNode; className?: string }>;
  Footer: React.FC<{ children: React.ReactNode; className?: string }>;
} = ({ children, open, onOpenChange }) => (
  <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}>
    <div className="fixed inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
    <div className="fixed inset-0 flex items-center justify-center">
      {children}
    </div>
  </div>
);

Dialog.Trigger = ({ children, asChild }) => (
  <>{asChild ? children : <button>{children}</button>}</>
);

Dialog.Content = ({ children, className = '' }) => (
  <div className={`rounded-lg shadow-lg p-6 w-full max-w-md ${className}`}>
    {children}
  </div>
);

Dialog.Header = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
);

Dialog.Title = ({ children, className = '' }) => (
  <h2 className={`text-xl font-semibold ${className}`}>{children}</h2>
);

Dialog.Description = ({ children, className = '' }) => (
  <p className={`text-sm mt-2 ${className}`}>{children}</p>
);

Dialog.Footer = ({ children, className = '' }) => (
  <div className={`mt-6 flex justify-end space-x-2 ${className}`}>{children}</div>
);

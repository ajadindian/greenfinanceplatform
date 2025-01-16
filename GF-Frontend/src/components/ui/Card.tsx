import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card = ({ children, className = '' }: CardProps) => (
  <div className={`bg-white rounded-lg shadow-md ${className}`}>{children}</div>
);

const CardHeader = ({ children, className = '' }: CardProps) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

const CardTitle = ({ children, className = '' }: CardProps) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
);

const CardContent = ({ children, className = '' }: CardProps) => (
  <div className={`p-6 ${className}`}>{children}</div>
);

export { Card, CardHeader, CardTitle, CardContent }

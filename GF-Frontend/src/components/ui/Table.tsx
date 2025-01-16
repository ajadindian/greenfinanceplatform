import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> & {
  Header: React.FC<TableProps>;
  Body: React.FC<TableProps>;
  Row: React.FC<TableProps>;
  Head: React.FC<TableProps>;
  Cell: React.FC<TableProps>;
} = ({ children, className = '' }) => (
  <table className={`w-full ${className}`}>{children}</table>
);

Table.Header = ({ children, className = '' }) => (
  <thead className={className}>{children}</thead>
);

Table.Body = ({ children, className = '' }) => (
  <tbody className={className}>{children}</tbody>
);

Table.Row = ({ children, className = '' }) => (
  <tr className={className}>{children}</tr>
);

Table.Head = ({ children, className = '' }) => (
  <th className={`px-6 py-3 text-left ${className}`}>{children}</th>
);

Table.Cell = ({ children, className = '' }) => (
  <td className={`px-6 py-4 ${className}`}>{children}</td>
);

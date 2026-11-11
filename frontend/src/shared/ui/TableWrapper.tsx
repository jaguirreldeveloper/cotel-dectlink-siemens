/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode } from 'react';

interface TableWrapperProps {
  children: ReactNode;
  className?: string;
  minWidth?: string;
}

/**
 * Componente wrapper para tablas que añade soporte responsive.
 * Añade scroll horizontal en pantallas pequeñas y garantiza áreas táctiles adecuadas.
 */
export function TableWrapper({ children, className = '', minWidth = 'min-w-[800px]' }: TableWrapperProps) {
  return (
    <div className={`w-full overflow-x-auto ${className}`}>
      <div className={`w-full ${minWidth}`}>
        {children}
      </div>
    </div>
  );
}

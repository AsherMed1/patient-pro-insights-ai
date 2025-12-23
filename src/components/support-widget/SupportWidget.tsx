import React, { useState, useEffect } from 'react';
import { SupportLauncher } from './SupportLauncher';
import { SupportPanel } from './SupportPanel';

interface SupportWidgetProps {
  projectName: string;
}

export const SupportWidget: React.FC<SupportWidgetProps> = ({ projectName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <>
      <SupportLauncher 
        isOpen={isOpen} 
        onClick={() => setIsOpen(!isOpen)} 
        unreadCount={unreadCount}
      />
      <SupportPanel 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        projectName={projectName}
        onUnreadChange={setUnreadCount}
      />
    </>
  );
};

export default SupportWidget;

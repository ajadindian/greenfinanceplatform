import React, { useState } from 'react';
import { Dialog } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { useTheme } from '../contexts/ThemeContext';

interface SaveLayoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => Promise<void>;
  isLoading?: boolean;
}

export const SaveLayoutDialog: React.FC<SaveLayoutDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  isLoading = false,
}) => {
  const [layoutName, setLayoutName] = useState('');
  const { currentTheme } = useTheme();

  const handleSave = async () => {
    if (!layoutName.trim()) return;
    await onSave(layoutName);
    setLayoutName('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className={currentTheme === 'light' ? 'bg-white' : 'bg-gray-900'}>
        <Dialog.Header>
          <Dialog.Title className={currentTheme === 'light' ? 'text-gray-900' : 'text-gray-100'}>
            Save Dashboard Layout
          </Dialog.Title>
          <Dialog.Description className={currentTheme === 'light' ? 'text-gray-500' : 'text-gray-400'}>
            Give your dashboard layout a name to save it for later use.
          </Dialog.Description>
        </Dialog.Header>

        <div className="mt-4">
          <Input
            placeholder="Layout name"
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            className="w-full"
          />
        </div>

        <Dialog.Footer>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!layoutName.trim() || isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Layout'}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}; 
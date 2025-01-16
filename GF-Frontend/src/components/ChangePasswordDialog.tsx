import React, { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { changePassword } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { KeyRound, EyeIcon, EyeOffIcon } from 'lucide-react';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  const [isChanging, setIsChanging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const checkPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsChanging(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      setIsChanging(false);
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      onOpenChange(false);
    } catch (error) {
      setError('Failed to change password. Please verify your current password.');
    } finally {
      setIsChanging(false);
    }
  };

  const PasswordInput = ({ 
    name, 
    label, 
    showPassword, 
    onToggleShow,
    onChange
  }: { 
    name: string;
    label: string;
    showPassword: boolean;
    onToggleShow: () => void;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <div className="space-y-2">
      <Label className={isDark ? 'text-gray-200' : 'text-gray-700'}>{label}</Label>
      <div className="relative">
        <Input
          name={name}
          type={showPassword ? 'text' : 'password'}
          required
          className={`pr-10 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}
          onChange={onChange}
          autoComplete={name === 'currentPassword' ? 'current-password' : 'new-password'}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleShow();
          }}
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700
            ${isDark ? 'hover:text-gray-300' : 'hover:text-gray-900'}`}
        >
          {showPassword ? (
            <EyeOffIcon className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50" />
        <DialogPrimitive.Content className={`fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-w-[400px] rounded-lg shadow-lg ${
          isDark ? 'bg-gray-900' : 'bg-white'
        }`}>
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className={`p-2 rounded-full ${
                isDark ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <KeyRound className={`h-5 w-5 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`} />
              </div>
              <div>
                <DialogPrimitive.Title className={`text-lg font-semibold ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  Change Password
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className={`text-sm ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Please enter your current password and a new secure password.
                </DialogPrimitive.Description>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <PasswordInput
                name="currentPassword"
                label="Current Password"
                showPassword={showCurrentPassword}
                onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
              />

              <PasswordInput
                name="newPassword"
                label="New Password"
                showPassword={showNewPassword}
                onToggleShow={() => setShowNewPassword(!showNewPassword)}
                onChange={(e) => checkPasswordStrength(e.target.value)}
              />

              <PasswordInput
                name="confirmPassword"
                label="Confirm New Password"
                showPassword={showConfirmPassword}
                onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
              />

              {/* Password Strength Indicator */}
              <div className="space-y-2">
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i < passwordStrength
                          ? passwordStrength <= 2
                            ? 'bg-orange-500'
                            : passwordStrength === 3
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          : isDark ? 'bg-gray-700' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Password should contain at least 8 characters, uppercase, numbers, and special characters
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className={isDark ? 'hover:bg-gray-800' : ''}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isChanging}
                  className="min-w-[100px]"
                >
                  {isChanging ? 'Changing...' : 'Update'}
                </Button>
              </div>
            </form>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
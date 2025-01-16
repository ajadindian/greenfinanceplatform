import React, { useState, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Settings as SettingsIcon, CreditCard, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Switch } from './ui/Switch';
import { getUserSettings, updateUserSettings, getPaymentInfo, changePassword } from '../services/api';
import { ChangePasswordDialog } from './ChangePasswordDialog';


interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = 'general' | 'account' | 'payment';

interface UserSettings {
  email: string;
  display_name: string;
  notifications_enabled: boolean;
  theme_preference: 'light' | 'dark';
}

interface PaymentInfo {
  last4: string;
  expiry_month: number;
  expiry_year: number;
  brand: string;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const { currentTheme } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [settingsData, paymentData] = await Promise.all([
        getUserSettings(),
        getPaymentInfo()
      ]);
      setSettings(settingsData);
      setPaymentInfo(paymentData);
    } catch (error) {
      setError('Failed to load settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSettingsUpdate = async (updates: Partial<UserSettings>) => {
    setIsUpdating(true);
    setError(null);
    try {
      const updatedSettings = await updateUserSettings(updates);
      setSettings(updatedSettings);
    } catch (error) {
      setError('Failed to update settings. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: SettingsIcon },
    { id: 'account', label: 'Account', icon: User },
    { id: 'payment', label: 'Payment', icon: CreditCard },
  ];

  const isDark = currentTheme === 'dark';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="min-w-[1200px] w-[95vw] h-[90vh] p-0 overflow-hidden rounded-[32px] border-0 shadow-2xl">
        <div className="flex h-full">
          {/* Modern Sidebar */}
          <div className={`w-60 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <div className="p-6">
              <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Settings
              </h2>
            </div>
            <nav className="px-3 pb-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 mb-1 rounded-xl transition-all duration-200 ${
                    activeTab === tab.id
                      ? isDark 
                        ? 'bg-gray-800 text-white' 
                        : 'bg-white text-gray-900 shadow-sm'
                      : isDark
                        ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        : 'text-gray-600 hover:bg-white hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="h-5 w-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content Area */}
          <div className={`flex-1 flex flex-col ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            {/* Header */}
            <div className="flex justify-between items-center p-6">
              <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className={`rounded-full h-8 w-8 ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Main Content */}
            <div className="flex-1 px-6 py-8 overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className={`animate-pulse ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Loading settings...
                  </div>
                </div>
              ) : error ? (
                <div className="text-red-500 text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                  {error}
                </div>
              ) : (
                <AnimateContent 
                  activeTab={activeTab} 
                  settings={settings}
                  paymentInfo={paymentInfo}
                  onUpdateSettings={handleSettingsUpdate}
                  isUpdating={isUpdating}
                />
              )}
            </div>
          </div>
        </div>
      </Dialog.Content>
    </Dialog>
  );
}

function AnimateContent({ 
  activeTab, 
  settings, 
  paymentInfo,
  onUpdateSettings,
  isUpdating 
}: { 
  activeTab: SettingsTab;
  settings: UserSettings | null;
  paymentInfo: PaymentInfo | null;
  onUpdateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  isUpdating: boolean;
}) {
  const { currentTheme, setCurrentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  
  const [notifications, setNotifications] = useState(settings?.notifications_enabled ?? false);
  const [displayName, setDisplayName] = useState(settings?.display_name ?? '');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    if (settings) {
      setNotifications(settings.notifications_enabled);
      setDisplayName(settings.display_name);
    }
  }, [settings]);

  const handleNotificationsChange = async (checked: boolean) => {
    setNotifications(checked);
    await onUpdateSettings({ notifications_enabled: checked });
  };

  const handleDisplayNameChange = async () => {
    await onUpdateSettings({ display_name: displayName });
  };

  const SettingCard = ({ children }: { children: React.ReactNode }) => (
    <div className={`p-6 rounded-2xl mb-6 max-w-4xl ${
      isDark ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {children}
    </div>
  );

  const content = {
    general: (
      <div className="space-y-6">
        <SettingCard>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Theme Preference
              </h4>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Choose between light and dark theme
              </p>
            </div>
            <Switch
              checked={currentTheme === 'dark'}
              onCheckedChange={(checked) => setCurrentTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </SettingCard>

        <SettingCard>
          <div className="flex items-center justify-between">
            <div>
              <h4 className={`font-medium mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Notifications
              </h4>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Receive updates and announcements
              </p>
            </div>
            <Switch
              checked={notifications}
              onCheckedChange={handleNotificationsChange}
              disabled={isUpdating}
            />
          </div>
        </SettingCard>
      </div>
    ),
    account: (
      <div className="space-y-6">
        <SettingCard>
          <div className="space-y-4">
            <div>
              <Label className={`mb-1.5 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Email Address
              </Label>
              <Input
                type="email"
                value={settings?.email ?? ''}
                disabled
                className={`w-full ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}
              />
            </div>
            <div>
              <Label className={`mb-1.5 block ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Display Name
              </Label>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={handleDisplayNameChange}
                disabled={isUpdating}
                className={`w-full ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}
              />
            </div>
          </div>
        </SettingCard>

        <SettingCard>
          <div>
            <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Password
            </h4>
            <Button 
              onClick={() => setShowPasswordModal(true)}
              variant="outline"
              className={isDark ? 'border-gray-700 hover:bg-gray-800' : ''}
            >
              Change Password
            </Button>
          </div>
        </SettingCard>

        <ChangePasswordDialog 
          open={showPasswordModal} 
          onOpenChange={setShowPasswordModal}
        />
      </div>
    ),
    payment: (
      <div className="space-y-6">
        <SettingCard>
          {paymentInfo ? (
            <div className="space-y-4">
              <div>
                <h4 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Current Payment Method
                </h4>
                <div className={`p-4 rounded-lg border ${
                  isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                }`}>
                  <div className="flex items-center space-x-3">
                    <CreditCard className={isDark ? 'text-gray-400' : 'text-gray-600'} />
                    <div>
                      <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>
                        •••• •••• •••• {paymentInfo.last4}
                      </p>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Expires {paymentInfo.expiry_month}/{paymentInfo.expiry_year}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <Button variant="outline" className={isDark ? 'border-gray-700' : ''}>
                Update Payment Method
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className={`h-12 w-12 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
              <h4 className={`font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                No Payment Method
              </h4>
              <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Add a payment method to manage your subscription
              </p>
              <Button>Add Payment Method</Button>
            </div>
          )}
        </SettingCard>
      </div>
    ),
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.15 }}
      >
        {content[activeTab]}
      </motion.div>
    </AnimatePresence>
  );
}
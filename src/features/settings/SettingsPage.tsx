import { useState, useEffect } from 'react';
import { useUser as useClerkUser } from '@clerk/clerk-react';
import { useUserPreferences, useUpdateUserPreferences } from '@/hooks/useUserPreferences';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { UserPreferences } from '@/contracts/userPreferences';
import { ImportPage } from '@/features/import/ImportPage';
import { useLocale } from '@/contexts/LocaleContext';
import { getSupportedLocales } from '@/lib/localeRegistry';
import { useTranslation } from 'react-i18next';
import { detectCountryFromIP } from '@/lib/ipDetection';

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phoneNumber: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export function SettingsPage() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useClerkUser();
  const { data: prefs, isLoading: isPrefsLoading } = useUserPreferences();
  const updatePrefs = useUpdateUserPreferences();
  const { locale, setLocale: setLocaleContext } = useLocale();
  const { t } = useTranslation(['settings', 'common']);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [detectedCountry, setDetectedCountry] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const navigate = useNavigate();
  
  // Detect country on mount for display
  useEffect(() => {
    detectCountryFromIP().then((country) => {
      if (country) {
        // Map country code to country name for display
        const countryNames: Record<string, string> = {
          'US': 'United States',
          'AU': 'Australia',
        };
        setDetectedCountry(countryNames[country] || country);
      }
    }).catch(() => {
      // Ignore errors
    });
  }, []);

  // Get 2FA status from Clerk (source of truth)
  const twoFactorEnabled = clerkUser?.twoFactorEnabled ?? false;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const [privacyMode, setPrivacyMode] = useState(false);
  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark'>('system');
  const [taxRate, setTaxRate] = useState(20);
  const [taxSettingsConfigured, setTaxSettingsConfigured] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState({
    portfolioSummary: true,
    spendingAlerts: true,
    stockPriceAlerts: true,
    featureAnnouncements: false,
    monthlyReports: false,
    marketingPromotions: false,
  });

  // Handle tab changes from query params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['profile', 'preferences', 'tax', 'notifications', 'security', 'import'].includes(tab)) {
      setActiveTab(tab);
      // Clear query param after processing
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? '';
  const clerkPhone = clerkUser?.primaryPhoneNumber?.phoneNumber ?? '';

  // Initialize form when Clerk user loads (identity comes from Clerk)
  useEffect(() => {
    if (isClerkLoaded && clerkUser) {
      reset({
        firstName: clerkUser.firstName ?? '',
        lastName: clerkUser.lastName ?? '',
        email: clerkEmail,
        phoneNumber: clerkPhone,
      });
    }
  }, [isClerkLoaded, clerkUser, clerkEmail, clerkPhone, reset]);

  // Initialize preference state when preferences load (preferences are app-owned)
  useEffect(() => {
    if (prefs) {
      setPrivacyMode(prefs.privacyMode);
      setThemePreference(prefs.themePreference);
      setTaxRate(prefs.taxRate);
      setTaxSettingsConfigured(prefs.taxSettingsConfigured);
      setEmailNotifications({
        ...prefs.emailNotifications,
        monthlyReports: prefs.emailNotifications.monthlyReports ?? false,
      });
    }
  }, [prefs]);

  const handleProfileSubmit = async (data: ProfileFormData) => {
    if (!clerkUser) return;

    // Identity is managed by Clerk. We only update fields that are safe/allowed here.
    setIsSavingProfile(true);
    try {
      await clerkUser.update({
        firstName: data.firstName?.trim() || undefined,
        lastName: data.lastName?.trim() || undefined,
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePrivacyModeChange = (checked: boolean) => {
    setPrivacyMode(checked);
    updatePrefs.mutate({ privacyMode: checked });
  };

  const handleThemePreferenceChange = (value: 'system' | 'light' | 'dark') => {
    setThemePreference(value);
    updatePrefs.mutate({ themePreference: value });
  };

  const handleTaxRateChange = (value: number) => {
    setTaxRate(value);
    setTaxSettingsConfigured(true);
    updatePrefs.mutate({ taxRate: value, taxSettingsConfigured: true });
  };

  const handleEmailNotificationChange = (key: keyof typeof emailNotifications, checked: boolean) => {
    const updated = { ...emailNotifications, [key]: checked };
    setEmailNotifications(updated);
    updatePrefs.mutate({ emailNotifications: updated as UserPreferences['emailNotifications'] });
  };

  if (!isClerkLoaded || isPrefsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-h1-sm sm:text-h1-md lg:text-h1-lg font-bold">Settings</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="tax">Tax Settings</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(handleProfileSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" {...register('firstName')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" {...register('lastName')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  {/* Email is managed by Clerk (verification + recovery flows). Keep read-only here. */}
                  <Input id="email" type="email" {...register('email')} readOnly disabled />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Email changes are managed in your account settings (top-right user menu).
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  {/* Phone is managed by Clerk (verification + recovery flows). Keep read-only here. */}
                  <Input id="phoneNumber" type="tel" {...register('phoneNumber')} readOnly disabled />
                </div>
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>Customize your display settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="privacy-mode">Privacy Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Hide sensitive financial information
                  </p>
                </div>
                <Switch
                  id="privacy-mode"
                  checked={privacyMode}
                  onCheckedChange={handlePrivacyModeChange}
                  aria-label="Enable privacy mode to hide sensitive financial information"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="theme-preference" className="text-base font-medium">
                  Theme
                </Label>
                <Select 
                  value={themePreference} 
                  onValueChange={(value: 'system' | 'light' | 'dark') => handleThemePreferenceChange(value)}
                >
                  <SelectTrigger id="theme-preference" className="w-full sm:w-[320px] h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  {themePreference === 'system' 
                    ? 'Theme follows your system preference'
                    : themePreference === 'light'
                    ? 'Always use light theme'
                    : 'Always use dark theme'}
                </p>
              </div>
              
              {/* Locale Selector */}
              <div className="pt-6 border-t">
                <div className="space-y-3">
                  <Label htmlFor="locale-select" className="text-base font-medium">
                    {t('locale.label', { ns: 'settings' })}
                  </Label>
                  
                  <Select value={locale} onValueChange={(value) => setLocaleContext(value)}>
                    <SelectTrigger id="locale-select" className="w-full sm:w-[320px] h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getSupportedLocales().map((localeOption) => (
                        <SelectItem key={localeOption.code} value={localeOption.code}>
                          {localeOption.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {detectedCountry && (
                    <p className="text-xs text-muted-foreground">
                      {t('locale.detected', { ns: 'settings', country: detectedCountry })}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Settings Tab */}
        <TabsContent value="tax" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tax Settings</CardTitle>
              <CardDescription>Configure your tax preferences for accurate calculations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0.0"
                  clearOnFocus
                  clearValue={0}
                  value={taxRate}
                  onChange={(e) => handleTaxRateChange(parseFloat(e.target.value) || 0)}
                />
                <p className="text-sm text-muted-foreground">
                  Your estimated tax rate for capital gains calculations
                </p>
              </div>
              {taxSettingsConfigured && (
                <p className="text-sm text-success">
                  ✓ Tax settings configured
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Manage your email notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="portfolio-summary">Portfolio Summary</Label>
                  <p className="text-sm text-muted-foreground">Weekly portfolio updates</p>
                </div>
                <Switch
                  id="portfolio-summary"
                  checked={emailNotifications.portfolioSummary}
                  onCheckedChange={(checked) =>
                    handleEmailNotificationChange('portfolioSummary', checked)
                  }
                  aria-label="Enable portfolio summary email notifications"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="spending-alerts">Spending Alerts</Label>
                  <p className="text-sm text-muted-foreground">Notify about unusual spending</p>
                </div>
                <Switch
                  id="spending-alerts"
                  checked={emailNotifications.spendingAlerts}
                  onCheckedChange={(checked) =>
                    handleEmailNotificationChange('spendingAlerts', checked)
                  }
                  aria-label="Enable spending alerts email notifications"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="stock-price-alerts">Stock Price Alerts</Label>
                  <p className="text-sm text-muted-foreground">Price change notifications</p>
                </div>
                <Switch
                  id="stock-price-alerts"
                  checked={emailNotifications.stockPriceAlerts}
                  onCheckedChange={(checked) =>
                    handleEmailNotificationChange('stockPriceAlerts', checked)
                  }
                  aria-label="Enable stock price alerts email notifications"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="feature-announcements">Feature Announcements</Label>
                  <p className="text-sm text-muted-foreground">New feature updates</p>
                </div>
                <Switch
                  id="feature-announcements"
                  checked={emailNotifications.featureAnnouncements}
                  onCheckedChange={(checked) =>
                    handleEmailNotificationChange('featureAnnouncements', checked)
                  }
                  aria-label="Enable feature announcements email notifications"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="monthly-reports">Monthly Reports</Label>
                  <p className="text-sm text-muted-foreground">Monthly portfolio and spending report</p>
                </div>
                <Switch
                  id="monthly-reports"
                  checked={emailNotifications.monthlyReports}
                  onCheckedChange={(checked) =>
                    handleEmailNotificationChange('monthlyReports', checked)
                  }
                  aria-label="Enable monthly reports email notifications"
                />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing-promotions">Marketing Promotions</Label>
                  <p className="text-sm text-muted-foreground">Promotional emails</p>
                </div>
                <Switch
                  id="marketing-promotions"
                  checked={emailNotifications.marketingPromotions}
                  onCheckedChange={(checked) =>
                    handleEmailNotificationChange('marketingPromotions', checked)
                  }
                  aria-label="Enable marketing promotions email notifications"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="mfa-status">Two-Factor Authentication</Label>
                    {isClerkLoaded ? (
                      <Badge variant={twoFactorEnabled ? 'default' : 'secondary'}>
                        {twoFactorEnabled ? 'Enabled' : 'Not enabled'}
                      </Badge>
                    ) : (
                      <Skeleton className="h-5 w-20" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Two-factor authentication is managed through your account settings.
                  </p>
                </div>
                <Button
                  onClick={() => navigate('/account')}
                  variant="outline"
                  disabled={!isClerkLoaded}
                >
                  Manage 2FA
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-4">
          <ImportPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}


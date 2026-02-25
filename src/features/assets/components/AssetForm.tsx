import { useForm, Controller } from 'react-hook-form';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { AddressAutocomplete } from '@/components/shared/AddressAutocomplete';
import { CurrencyInput } from '@/components/ui/currency-input';
import type { Asset } from '@/types/domain';
import { SUPPORTED_EXCHANGES } from '@/constants/exchanges';
import { SUPPORTED_CRYPTO_SYMBOLS } from '@/constants/cryptoSymbols';
import { useLocale } from '@/contexts/LocaleContext';
import { formatNumber } from '@/lib/utils';

// Form schema: name optional at base level (required only for non-Stock/RSU via superRefine)
// Stock/RSU fields optional here; Task 8/9 add UI and validation for them
const assetSchema = z
  .object({
    name: z.string().max(100).trim().optional().or(z.literal('')),
    type: z.enum(['Real Estate', 'Other Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Stock', 'RSU']),
    value: z.number().min(0, 'Value must be positive'),
    dateAdded: z.string().min(1, 'Date is required'),
    institution: z.string().optional(),
    notes: z.string().optional(),
    address: z.string().max(200).trim().optional().or(z.literal('')),
    propertyType: z.string().max(100).trim().optional().or(z.literal('')),
    ticker: z.string().max(20).trim().optional().or(z.literal('')),
    exchange: z.string().trim().optional().or(z.literal('')),
    quantity: z.number().positive().optional(),
    purchasePrice: z.number().min(0).optional(),
    purchaseDate: z.string().optional().or(z.literal('')),
    todaysPrice: z.number().min(0).optional(),
    grantDate: z.string().optional().or(z.literal('')),
    vestingDate: z.string().optional().or(z.literal('')),
    grantPrice: z.number().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'Real Estate') {
      const addressVal = data.address?.trim() ?? '';
      if (!addressVal) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Address is required', path: ['address'] });
      }
    } else if (data.type !== 'Stock' && data.type !== 'RSU' && data.type !== 'Crypto') {
      const nameVal = data.name?.trim() ?? '';
      if (!nameVal) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Name is required', path: ['name'] });
      }
    }
    if (data.type === 'Stock') {
      const tickerVal = data.ticker?.trim() ?? '';
      if (!tickerVal) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ticker is required', path: ['ticker'] });
      if (data.quantity === undefined || data.quantity === null || data.quantity <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quantity is required and must be positive', path: ['quantity'] });
      }
      if (data.todaysPrice === undefined || data.todaysPrice === null || data.todaysPrice < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Current price is required', path: ['todaysPrice'] });
      }
    }
    if (data.type === 'RSU') {
      const tickerVal = data.ticker?.trim() ?? '';
      if (!tickerVal) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Ticker is required', path: ['ticker'] });
      if (data.quantity === undefined || data.quantity === null || data.quantity <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quantity is required and must be positive', path: ['quantity'] });
      }
      if (data.todaysPrice === undefined || data.todaysPrice === null || data.todaysPrice < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Today's price is required", path: ['todaysPrice'] });
      }
      // Vesting date optional per spec
    }
    if (data.type === 'Crypto') {
      const tickerVal = data.ticker?.trim() ?? '';
      if (!tickerVal) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Coin symbol is required', path: ['ticker'] });
      } else if (!SUPPORTED_CRYPTO_SYMBOLS.includes(tickerVal as (typeof SUPPORTED_CRYPTO_SYMBOLS)[number])) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Coin symbol must be from the supported list', path: ['ticker'] });
      }
      if (data.quantity === undefined || data.quantity === null || data.quantity <= 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Quantity is required and must be positive', path: ['quantity'] });
      }
      if (data.value === undefined || data.value === null || data.value < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Current value is required', path: ['value'] });
      }
    }
  });

type AssetFormData = z.infer<typeof assetSchema>;

interface AssetFormProps {
  asset?: Asset;
  onSubmit: (data: Omit<Asset, 'id' | 'change1D' | 'change1W'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
  defaultType?: Asset['type'];
}

/** Label for Superannuation/Retirement by locale: Australia → Superannuation, else → Retirement */
function getSuperannuationRetirementLabel(locale: string): string {
  const code = locale?.trim() || '';
  if (code === 'en-AU') return 'Superannuation';
  return 'Retirement';
}

export function AssetForm({ asset, onSubmit, onCancel, onDelete, isLoading, defaultType }: AssetFormProps) {
  const { locale } = useLocale();
  const superOrRetirementLabel = getSuperannuationRetirementLabel(locale);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: asset
      ? {
          name: asset.name,
          type: asset.type,
          value: asset.value,
          dateAdded: asset.dateAdded.split('T')[0],
          institution: asset.institution,
          notes: asset.notes,
          address: asset.address ?? '',
          propertyType: asset.propertyType ?? '',
          ticker: asset.ticker ?? '',
          exchange: asset.exchange ?? '',
          quantity: asset.quantity,
          purchasePrice: asset.purchasePrice,
          purchaseDate: asset.purchaseDate ?? '',
          todaysPrice: asset.todaysPrice,
          grantDate: asset.grantDate ?? '',
          vestingDate: asset.vestingDate ?? '',
          grantPrice: asset.grantPrice,
        }
      : {
          type: defaultType ?? 'Cash',
          dateAdded: new Date().toISOString().split('T')[0],
        },
  });

  const selectedType = watch('type') || '';
  const watchedTicker = watch('ticker');
  const watchedExchange = watch('exchange');

  // Exchange auto-select: when ticker is set and exchange empty, default by locale (AU -> ASX, else NASDAQ)
  useEffect(() => {
    if ((selectedType === 'Stock' || selectedType === 'RSU') && watchedTicker?.trim() && !watchedExchange?.trim()) {
      const defaultExchange = locale?.trim() === 'en-AU' ? 'ASX' : 'NASDAQ';
      setValue('exchange', defaultExchange);
    }
  }, [selectedType, watchedTicker, watchedExchange, locale, setValue]);

  const onSubmitForm = (data: AssetFormData) => {
    const today = new Date().toISOString().split('T')[0] ?? '';
    if (data.type === 'Stock') {
      const tickerVal = (data.ticker ?? '').trim();
      const qty = Number(data.quantity) || 0;
      const currentPrice = Number(data.todaysPrice) ?? 0;
      const value = Math.round(qty * currentPrice * 100) / 100;
      const dateAdded = (data.purchaseDate && data.purchaseDate.trim()) || data.dateAdded || today;
      onSubmit({
        name: tickerVal || 'Unknown',
        type: 'Stock',
        value,
        dateAdded: dateAdded as string,
        institution: data.institution,
        notes: data.notes,
        ticker: tickerVal,
        exchange: (data.exchange ?? '').trim() || undefined,
        quantity: qty,
        purchasePrice: data.purchasePrice != null ? Number(data.purchasePrice) : undefined,
        purchaseDate: (data.purchaseDate ?? '').trim() || undefined,
        todaysPrice: currentPrice,
      });
      return;
    }
    if (data.type === 'RSU') {
      const tickerVal = (data.ticker ?? '').trim();
      const qty = Number(data.quantity) || 0;
      const price = Number(data.todaysPrice) ?? 0;
      const value = Math.round(qty * price * 100) / 100;
      const dateAdded = (data.grantDate && data.grantDate.trim()) || data.dateAdded || today;
      onSubmit({
        name: tickerVal ? `${tickerVal} (RSU)` : 'RSU',
        type: 'RSU',
        value,
        dateAdded: dateAdded as string,
        institution: data.institution,
        notes: data.notes,
        ticker: tickerVal,
        exchange: (data.exchange ?? '').trim() || undefined,
        quantity: qty,
        todaysPrice: price,
        grantDate: (data.grantDate ?? '').trim() || undefined,
        vestingDate: (data.vestingDate ?? '').trim() || undefined,
        grantPrice: data.grantPrice != null ? Number(data.grantPrice) : undefined,
      });
      return;
    }
    if (data.type === 'Crypto') {
      const tickerVal = (data.ticker ?? '').trim();
      const qty = Number(data.quantity) || 0;
      const value = Math.round((Number(data.value) ?? 0) * 100) / 100;
      const purchasePrice = data.purchasePrice != null ? Number(data.purchasePrice) : undefined;
      const dateAdded = (data.purchaseDate && data.purchaseDate.trim()) || data.dateAdded || today;
      onSubmit({
        name: tickerVal || 'Crypto',
        type: 'Crypto',
        value,
        dateAdded: dateAdded as string,
        institution: data.institution,
        notes: data.notes,
        ticker: tickerVal,
        quantity: qty,
        purchasePrice,
        purchaseDate: (data.purchaseDate ?? '').trim() || undefined,
      });
      return;
    }
    if (data.type === 'Real Estate') {
      const addressVal = (data.address ?? '').trim();
      onSubmit({
        name: addressVal || 'Property',
        type: 'Real Estate',
        value: Math.round((data.value ?? 0) * 100) / 100,
        dateAdded: data.dateAdded ?? today,
        notes: data.notes,
        address: addressVal || undefined,
        propertyType: (data.propertyType ?? '').trim() || undefined,
      });
      return;
    }
    if (data.type === 'Cash') {
      onSubmit({
        name: 'Cash',
        type: 'Cash',
        value: Math.round((data.value ?? 0) * 100) / 100,
        dateAdded: data.dateAdded ?? today,
        notes: data.notes,
      });
      return;
    }
    if (data.type === 'Superannuation') {
      const nameVal = (data.name ?? '').trim();
      onSubmit({
        name: nameVal || superOrRetirementLabel,
        type: 'Superannuation',
        value: Math.round((data.value ?? 0) * 100) / 100,
        dateAdded: data.dateAdded ?? today,
        notes: data.notes,
      });
      return;
    }
    const nameVal = (data.name ?? '').trim();
    onSubmit({
      name: nameVal || 'Unknown',
      type: data.type,
      value: Math.round((data.value ?? 0) * 100) / 100,
      dateAdded: data.dateAdded ?? today,
      institution: data.institution,
      notes: data.notes,
    });
  };

  const showVehicleSection = selectedType === 'Vehicles';
  const showRealEstateSection = selectedType === 'Real Estate';
  const showOtherInvestmentsSection = selectedType === 'Other Investments';
  const showCashSection = selectedType === 'Cash';
  const showSuperannuationSection = selectedType === 'Superannuation';
  const showStockSection = selectedType === 'Stock';
  const showRSUSection = selectedType === 'RSU';
  const showCryptoSection = selectedType === 'Crypto';

  const stockQty = watch('quantity');
  const stockCurrentPrice = watch('todaysPrice');
  const stockPurchasePrice = watch('purchasePrice');
  const stockValue = showStockSection && typeof stockQty === 'number' && typeof stockCurrentPrice === 'number' && stockQty > 0 && stockCurrentPrice >= 0
    ? Math.round(stockQty * stockCurrentPrice * 100) / 100
    : 0;
  const stockCostBasis = showStockSection && typeof stockQty === 'number' && typeof stockPurchasePrice === 'number' && stockQty > 0 && stockPurchasePrice >= 0
    ? stockQty * stockPurchasePrice
    : null;
  const stockUnrealisedPL = stockCostBasis != null && typeof stockValue === 'number'
    ? Math.round((stockValue - stockCostBasis) * 100) / 100
    : null;

  const rsuQty = watch('quantity');
  const rsuPrice = watch('todaysPrice');
  const rsuGrantPrice = watch('grantPrice');
  const rsuValue = showRSUSection && typeof rsuQty === 'number' && typeof rsuPrice === 'number' && rsuQty > 0 && rsuPrice >= 0
    ? Math.round(rsuQty * rsuPrice * 100) / 100
    : 0;
  const rsuGrantValue = showRSUSection && typeof rsuQty === 'number' && typeof rsuGrantPrice === 'number' && rsuQty > 0 && rsuGrantPrice >= 0
    ? rsuQty * rsuGrantPrice
    : null;
  const rsuUnrealisedPL = rsuGrantValue != null && typeof rsuValue === 'number'
    ? Math.round((rsuValue - rsuGrantValue) * 100) / 100
    : null;

  const cryptoQty = watch('quantity');
  const cryptoPurchasePrice = watch('purchasePrice');
  const cryptoValue = watch('value');
  const cryptoCostBasis = showCryptoSection && typeof cryptoQty === 'number' && typeof cryptoPurchasePrice === 'number' && cryptoQty > 0 && cryptoPurchasePrice >= 0
    ? cryptoQty * cryptoPurchasePrice
    : null;
  const cryptoUnrealisedPL = cryptoCostBasis != null && typeof cryptoValue === 'number'
    ? Math.round((cryptoValue - cryptoCostBasis) * 100) / 100
    : null;

  const submitDisabled = isLoading;

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      {/* Type first */}
      <div className="space-y-2">
        <Label htmlFor="type">
          Type <span className="text-destructive">*</span>
        </Label>
        <SearchableSelect
          id="type"
          value={selectedType}
          onValueChange={(value) => setValue('type', value as AssetFormData['type'])}
          options={[
            { value: 'Real Estate', label: 'Real Estate' },
            { value: 'Other Investments', label: 'Other Investments' },
            { value: 'Vehicles', label: 'Vehicles' },
            { value: 'Crypto', label: 'Crypto' },
            { value: 'Cash', label: 'Cash' },
            { value: 'Superannuation', label: superOrRetirementLabel },
            { value: 'Stock', label: 'Stock' },
            { value: 'RSU', label: 'RSU' },
          ]}
          placeholder="Select asset type"
          error={errors.type?.message}
        />
      </div>

      {showVehicleSection && (
        <>
          <div className="space-y-2">
            <Label htmlFor="vehicle-name">Name <span className="text-destructive">*</span></Label>
            <Input id="vehicle-name" aria-invalid={!!errors.name} className={errors.name ? 'border-destructive' : ''} {...register('name')} placeholder="e.g. Toyota Camry" />
            {errors.name && <p className="text-body text-destructive" role="alert">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle-value">Current value ($) <span className="text-destructive">*</span></Label>
            <Input id="vehicle-value" type="number" step="0.01" min={0} placeholder="0.00" aria-invalid={!!errors.value} className={errors.value ? 'border-destructive' : ''} {...register('value', { valueAsNumber: true })} />
            {errors.value && <p className="text-body text-destructive" role="alert">{errors.value.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle-notes">Notes</Label>
            <Textarea id="vehicle-notes" {...register('notes')} placeholder="Optional" rows={2} />
          </div>
        </>
      )}

      {showRealEstateSection && (
        <>
          <div className="space-y-2">
            <Label htmlFor="property-address">Address <span className="text-destructive">*</span></Label>
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <AddressAutocomplete
                  id="property-address"
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Property address"
                  aria-invalid={!!errors.address}
                  className={errors.address ? 'border-destructive' : ''}
                  maxLength={200}
                  showFallbackHint
                />
              )}
            />
            {errors.address && <p className="text-body text-destructive" role="alert">{errors.address.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="property-value">Current value ($) <span className="text-destructive">*</span></Label>
            <Input id="property-value" type="number" step="0.01" min={0} placeholder="0.00" aria-invalid={!!errors.value} className={errors.value ? 'border-destructive' : ''} {...register('value', { valueAsNumber: true })} />
            {errors.value && <p className="text-body text-destructive" role="alert">{errors.value.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="property-type">Property type</Label>
            <Input id="property-type" maxLength={100} {...register('propertyType')} placeholder="Optional (e.g. House, Unit)" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="property-notes">Notes</Label>
            <Textarea id="property-notes" {...register('notes')} placeholder="Optional" rows={2} />
          </div>
        </>
      )}

      {showOtherInvestmentsSection && (
        <>
          <div className="space-y-2">
            <Label htmlFor="otherinv-name">Name <span className="text-destructive">*</span></Label>
            <Input id="otherinv-name" aria-invalid={!!errors.name} className={errors.name ? 'border-destructive' : ''} {...register('name')} placeholder="Investment name" />
            {errors.name && <p className="text-body text-destructive" role="alert">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="otherinv-value">Current value ($) <span className="text-destructive">*</span></Label>
            <Input id="otherinv-value" type="number" step="0.01" min={0} placeholder="0.00" aria-invalid={!!errors.value} className={errors.value ? 'border-destructive' : ''} {...register('value', { valueAsNumber: true })} />
            {errors.value && <p className="text-body text-destructive" role="alert">{errors.value.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="otherinv-notes">Notes</Label>
            <Textarea id="otherinv-notes" {...register('notes')} placeholder="Optional" rows={2} />
          </div>
        </>
      )}

      {showCashSection && (
        <>
          <div className="space-y-2">
            <Label htmlFor="cash-value">Balance ($) <span className="text-destructive">*</span></Label>
            <Input id="cash-value" type="number" step="0.01" min={0} placeholder="0.00" aria-invalid={!!errors.value} className={errors.value ? 'border-destructive' : ''} {...register('value', { valueAsNumber: true })} />
            {errors.value && <p className="text-body text-destructive" role="alert">{errors.value.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cash-notes">Notes</Label>
            <Textarea id="cash-notes" {...register('notes')} placeholder="Optional" rows={2} />
          </div>
        </>
      )}

      {showSuperannuationSection && (
        <>
          <div className="space-y-2">
            <Label htmlFor="super-name">Fund name <span className="text-destructive">*</span></Label>
            <Input id="super-name" aria-invalid={!!errors.name} className={errors.name ? 'border-destructive' : ''} {...register('name')} placeholder={`${superOrRetirementLabel} fund name`} />
            {errors.name && <p className="text-body text-destructive" role="alert">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="super-value">Balance ($) <span className="text-destructive">*</span></Label>
            <Controller
              name="value"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  id="super-value"
                  placeholder="0.00"
                  aria-invalid={!!errors.value}
                  className={errors.value ? 'border-destructive' : ''}
                  value={field.value}
                  onChange={field.onChange}
                  decimalPlaces={2}
                  locale={locale}
                />
              )}
            />
            {errors.value && <p className="text-body text-destructive" role="alert">{errors.value.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="super-notes">Notes</Label>
            <Textarea id="super-notes" {...register('notes')} placeholder="Optional" rows={2} />
          </div>
        </>
      )}

      {showStockSection && (
        <>
          <div className="space-y-2">
            <Label htmlFor="stock-ticker">
              Ticker <span className="text-destructive">*</span>
            </Label>
            <Input
              id="stock-ticker"
              placeholder="e.g. AAPL"
              aria-invalid={!!errors.ticker}
              {...register('ticker')}
              className={errors.ticker ? 'border-destructive' : ''}
            />
            {errors.ticker && (
              <p className="text-body text-destructive" role="alert">{errors.ticker.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-exchange">Exchange</Label>
            <SearchableSelect
              id="stock-exchange"
              value={watch('exchange') ?? ''}
              onValueChange={(value) => setValue('exchange', value)}
              options={[{ value: '', label: 'Optional' }, ...SUPPORTED_EXCHANGES.map((ex) => ({ value: ex, label: ex }))]}
              placeholder="Optional (auto from symbol)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-quantity">
              Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="stock-quantity"
              type="number"
              step="any"
              min={0}
              placeholder="0"
              aria-invalid={!!errors.quantity}
              className={errors.quantity ? 'border-destructive' : ''}
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-body text-destructive" role="alert">{errors.quantity.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-purchasePrice">Purchase price ($)</Label>
            <Input
              id="stock-purchasePrice"
              type="number"
              step="0.01"
              min={0}
              placeholder="Optional"
              {...register('purchasePrice', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-purchaseDate">Purchase date</Label>
            <Controller
              name="purchaseDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="stock-purchaseDate"
                  value={field.value || undefined}
                  onChange={(e) => field.onChange(e.target.value)}
                  shouldShowCalendarButton
                  allowClear
                  placeholder="Optional"
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-todaysPrice">Current price ($) <span className="text-destructive">*</span></Label>
            <Input
              id="stock-todaysPrice"
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              aria-invalid={!!errors.todaysPrice}
              className={errors.todaysPrice ? 'border-destructive' : ''}
              {...register('todaysPrice', { valueAsNumber: true })}
            />
            {errors.todaysPrice && <p className="text-body text-destructive" role="alert">{errors.todaysPrice.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Current value ($)</Label>
            <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-body">
              {formatNumber(stockValue, 'en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-caption text-muted-foreground">Quantity × Current price</p>
          </div>
          <div className="space-y-2">
            <Label>Unrealised profit/loss</Label>
            <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-body">
              {stockUnrealisedPL != null
                ? `${stockUnrealisedPL >= 0 ? '+' : '-'}$${formatNumber(Math.abs(stockUnrealisedPL), 'en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'}
            </div>
            <p className="text-caption text-muted-foreground">Current value − cost basis (enter purchase price to see)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-dateAdded">Date added</Label>
            <Controller
              name="dateAdded"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="stock-dateAdded"
                  value={field.value || undefined}
                  onChange={(e) => field.onChange(e.target.value)}
                  shouldShowCalendarButton
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-notes">Notes</Label>
            <Textarea id="stock-notes" {...register('notes')} placeholder="Optional" rows={2} />
          </div>
        </>
      )}

      {showRSUSection && (
        <>
          <div className="space-y-2">
            <Label htmlFor="rsu-ticker">
              Ticker <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rsu-ticker"
              placeholder="e.g. MSFT"
              aria-invalid={!!errors.ticker}
              {...register('ticker')}
              className={errors.ticker ? 'border-destructive' : ''}
            />
            {errors.ticker && (
              <p className="text-body text-destructive" role="alert">{errors.ticker.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-exchange">Exchange</Label>
            <SearchableSelect
              id="rsu-exchange"
              value={watch('exchange') ?? ''}
              onValueChange={(value) => setValue('exchange', value)}
              options={[{ value: '', label: 'Optional' }, ...SUPPORTED_EXCHANGES.map((ex) => ({ value: ex, label: ex }))]}
              placeholder="Optional"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-quantity">
              Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rsu-quantity"
              type="number"
              step="any"
              min={0}
              placeholder="0"
              aria-invalid={!!errors.quantity}
              className={errors.quantity ? 'border-destructive' : ''}
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-body text-destructive" role="alert">{errors.quantity.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-todaysPrice">
              Current price ($) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rsu-todaysPrice"
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              aria-invalid={!!errors.todaysPrice}
              className={errors.todaysPrice ? 'border-destructive' : ''}
              {...register('todaysPrice', { valueAsNumber: true })}
            />
            {errors.todaysPrice && (
              <p className="text-body text-destructive" role="alert">{errors.todaysPrice.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-grantPrice">Price at grant ($)</Label>
            <Controller
              name="grantPrice"
              control={control}
              render={({ field }) => (
                <CurrencyInput
                  id="rsu-grantPrice"
                  placeholder="Optional"
                  value={field.value}
                  onChange={field.onChange}
                  decimalPlaces={2}
                  locale={locale}
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-grantDate">Grant date</Label>
            <Controller
              name="grantDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="rsu-grantDate"
                  value={field.value || undefined}
                  onChange={(e) => field.onChange(e.target.value)}
                  shouldShowCalendarButton
                  allowClear
                  placeholder="Optional"
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-vestingDate">Vesting date</Label>
            <Controller
              name="vestingDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="rsu-vestingDate"
                  value={field.value || undefined}
                  onChange={(e) => field.onChange(e.target.value)}
                  shouldShowCalendarButton
                  allowClear
                  placeholder="Optional"
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Current value ($)</Label>
            <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-body">
              {formatNumber(rsuValue, 'en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-caption text-muted-foreground">Quantity × Current price</p>
          </div>
          <div className="space-y-2">
            <Label>Unrealised profit/loss</Label>
            <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-body">
              {rsuUnrealisedPL != null
                ? `${rsuUnrealisedPL >= 0 ? '+' : '-'}$${formatNumber(Math.abs(rsuUnrealisedPL), 'en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'}
            </div>
            <p className="text-caption text-muted-foreground">Current value − value at grant (enter grant price to see)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-dateAdded">Date added</Label>
            <Controller
              name="dateAdded"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="rsu-dateAdded"
                  value={field.value || undefined}
                  onChange={(e) => field.onChange(e.target.value)}
                  shouldShowCalendarButton
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-notes">Notes</Label>
            <Textarea id="rsu-notes" {...register('notes')} placeholder="Optional" rows={2} />
          </div>
        </>
      )}

      {showCryptoSection && (
        <>
          <div className="space-y-2">
            <Label htmlFor="crypto-ticker">
              Coin (symbol) <span className="text-destructive">*</span>
            </Label>
            <SearchableSelect
              id="crypto-ticker"
              value={watch('ticker') ?? ''}
              onValueChange={(value) => setValue('ticker', value)}
              options={SUPPORTED_CRYPTO_SYMBOLS.map((sym) => ({ value: sym, label: sym }))}
              placeholder="Search coin (e.g. BTC, ETH)"
              error={errors.ticker?.message}
            />
            {errors.ticker && (
              <p className="text-body text-destructive" role="alert">{errors.ticker.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="crypto-purchaseDate">Purchase date</Label>
            <Controller
              name="purchaseDate"
              control={control}
              render={({ field }) => (
                <DatePicker
                  id="crypto-purchaseDate"
                  value={field.value || undefined}
                  onChange={(e) => field.onChange(e.target.value)}
                  shouldShowCalendarButton
                  allowClear
                  placeholder="Optional"
                />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crypto-purchasePrice">Purchase price ($ per unit)</Label>
            <Input
              id="crypto-purchasePrice"
              type="number"
              step="0.01"
              min={0}
              placeholder="Optional"
              {...register('purchasePrice', { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crypto-quantity">
              Quantity <span className="text-destructive">*</span>
            </Label>
            <Input
              id="crypto-quantity"
              type="number"
              step="any"
              min={0}
              placeholder="0"
              aria-invalid={!!errors.quantity}
              className={errors.quantity ? 'border-destructive' : ''}
              {...register('quantity', { valueAsNumber: true })}
            />
            {errors.quantity && (
              <p className="text-body text-destructive" role="alert">{errors.quantity.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="crypto-value">
              Current value ($) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="crypto-value"
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              aria-invalid={!!errors.value}
              className={errors.value ? 'border-destructive' : ''}
              {...register('value', { valueAsNumber: true })}
            />
            {errors.value && (
              <p className="text-body text-destructive" role="alert">{errors.value.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Unrealised profit/loss</Label>
            <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-body">
              {cryptoUnrealisedPL != null
                ? `${cryptoUnrealisedPL >= 0 ? '+' : '-'}$${formatNumber(Math.abs(cryptoUnrealisedPL), 'en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'}
            </div>
            <p className="text-caption text-muted-foreground">
              {cryptoCostBasis != null ? 'Current value − cost basis' : 'Enter purchase price and quantity to see P/L'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="crypto-notes">Notes</Label>
            <Textarea id="crypto-notes" {...register('notes')} placeholder="Optional" rows={2} />
          </div>
        </>
      )}

      <div className="flex justify-end gap-2 pt-4">
        {!(asset && onDelete) && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        {asset && onDelete && (
          <Button type="button" variant="outline" onClick={onDelete} disabled={isLoading}>
            Delete
          </Button>
        )}
        <Button type="submit" disabled={submitDisabled}>
          {isLoading ? 'Saving...' : asset ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}


import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import type { Asset } from '@/types/domain';
import { SUPPORTED_EXCHANGES } from '@/constants/exchanges';
import { SUPPORTED_CRYPTO_SYMBOLS } from '@/constants/cryptoSymbols';

// Form schema: name optional at base level (required only for non-Stock/RSU via superRefine)
// Stock/RSU fields optional here; Task 8/9 add UI and validation for them
const assetSchema = z
  .object({
    name: z.string().max(100).trim().optional().or(z.literal('')),
    type: z.enum(['Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Superannuation', 'Stock', 'RSU', 'Other']),
    value: z.number().min(0, 'Value must be positive'),
    dateAdded: z.string().min(1, 'Date is required'),
    institution: z.string().optional(),
    notes: z.string().optional(),
    ticker: z.string().max(20).trim().optional().or(z.literal('')),
    exchange: z.string().trim().optional().or(z.literal('')),
    quantity: z.number().positive().optional(),
    purchasePrice: z.number().min(0).optional(),
    purchaseDate: z.string().optional().or(z.literal('')),
    todaysPrice: z.number().min(0).optional(),
    grantDate: z.string().optional().or(z.literal('')),
    vestingDate: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (data.type !== 'Stock' && data.type !== 'RSU' && data.type !== 'Crypto') {
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
      if (data.purchasePrice === undefined || data.purchasePrice === null || data.purchasePrice < 0) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Purchase price is required', path: ['purchasePrice'] });
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
      const vestingVal = data.vestingDate?.trim() ?? '';
      if (!vestingVal) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Vesting date is required', path: ['vestingDate'] });
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

const isTypeSpecific = (type: string) => type === 'Stock' || type === 'RSU' || type === 'Crypto';

interface AssetFormProps {
  asset?: Asset;
  onSubmit: (data: Omit<Asset, 'id' | 'change1D' | 'change1W'>) => void;
  onCancel: () => void;
  isLoading?: boolean;
  defaultType?: Asset['type'];
}

export function AssetForm({ asset, onSubmit, onCancel, isLoading, defaultType }: AssetFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
          ticker: asset.ticker ?? '',
          exchange: asset.exchange ?? '',
          quantity: asset.quantity,
          purchasePrice: asset.purchasePrice,
          purchaseDate: asset.purchaseDate ?? '',
          todaysPrice: asset.todaysPrice,
          grantDate: asset.grantDate ?? '',
          vestingDate: asset.vestingDate ?? '',
        }
      : {
          type: defaultType,
          dateAdded: new Date().toISOString().split('T')[0],
        },
  });

  const selectedType = watch('type') || '';

  const onSubmitForm = (data: AssetFormData) => {
    if (data.type === 'Stock') {
      const tickerVal = (data.ticker ?? '').trim();
      const qty = Number(data.quantity) || 0;
      const price = Number(data.purchasePrice) ?? 0;
      const value = qty * price;
      const dateAdded = (data.purchaseDate && data.purchaseDate.trim()) || data.dateAdded || new Date().toISOString().split('T')[0] || '';
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
        purchasePrice: price,
        purchaseDate: (data.purchaseDate ?? '').trim() || undefined,
      });
      return;
    }
    if (data.type === 'RSU') {
      const tickerVal = (data.ticker ?? '').trim();
      const qty = Number(data.quantity) || 0;
      const price = Number(data.todaysPrice) ?? 0;
      const value = qty * price;
      const dateAdded = (data.grantDate && data.grantDate.trim()) || data.dateAdded || new Date().toISOString().split('T')[0] || '';
      const vestingVal = (data.vestingDate ?? '').trim();
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
        vestingDate: vestingVal,
      });
      return;
    }
    if (data.type === 'Crypto') {
      const tickerVal = (data.ticker ?? '').trim();
      const qty = Number(data.quantity) || 0;
      const value = Number(data.value) ?? 0;
      const purchasePrice = data.purchasePrice != null ? Number(data.purchasePrice) : undefined;
      const dateAdded = (data.purchaseDate && data.purchaseDate.trim()) || data.dateAdded || new Date().toISOString().split('T')[0] || '';
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
    const nameVal = (data.name ?? '').trim();
    onSubmit({
      name: nameVal || 'Unknown',
      type: data.type,
      value: data.value,
      dateAdded: data.dateAdded,
      institution: data.institution,
      notes: data.notes,
    });
  };

  const showGenericFields = !isTypeSpecific(selectedType);
  const showStockSection = selectedType === 'Stock';
  const showRSUSection = selectedType === 'RSU';
  const showCryptoSection = selectedType === 'Crypto';

  const stockQty = watch('quantity');
  const stockPrice = watch('purchasePrice');
  const stockValue = showStockSection && typeof stockQty === 'number' && typeof stockPrice === 'number' && stockQty > 0 && stockPrice >= 0
    ? stockQty * stockPrice
    : 0;

  const rsuQty = watch('quantity');
  const rsuPrice = watch('todaysPrice');
  const rsuValue = showRSUSection && typeof rsuQty === 'number' && typeof rsuPrice === 'number' && rsuQty > 0 && rsuPrice >= 0
    ? rsuQty * rsuPrice
    : 0;

  const cryptoQty = watch('quantity');
  const cryptoPurchasePrice = watch('purchasePrice');
  const cryptoValue = watch('value');
  const cryptoCostBasis = showCryptoSection && typeof cryptoQty === 'number' && typeof cryptoPurchasePrice === 'number' && cryptoQty > 0 && cryptoPurchasePrice >= 0
    ? cryptoQty * cryptoPurchasePrice
    : null;
  const cryptoUnrealisedPL = cryptoCostBasis != null && typeof cryptoValue === 'number'
    ? cryptoValue - cryptoCostBasis
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
            { value: 'Investments', label: 'Investments' },
            { value: 'Vehicles', label: 'Vehicles' },
            { value: 'Crypto', label: 'Crypto' },
            { value: 'Cash', label: 'Cash' },
            { value: 'Superannuation', label: 'Superannuation' },
            { value: 'Stock', label: 'Stock' },
            { value: 'RSU', label: 'RSU' },
            { value: 'Other', label: 'Other' },
          ]}
          placeholder="Select asset type"
          error={errors.type?.message}
        />
      </div>

      {showGenericFields && (
        <>
          <div className="space-y-2">
            <Label htmlFor="name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              aria-invalid={errors.name ? 'true' : 'false'}
              aria-describedby={errors.name ? 'name-error' : undefined}
              className={errors.name ? 'border-destructive' : ''}
              {...register('name')}
              placeholder="Asset name"
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">
              Value ($) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              placeholder="0.00"
              clearOnFocus
              clearValue={0}
              aria-invalid={errors.value ? 'true' : 'false'}
              aria-describedby={errors.value ? 'value-error' : undefined}
              className={errors.value ? 'border-destructive' : ''}
              {...register('value', { valueAsNumber: true })}
            />
            {errors.value && (
              <p id="value-error" className="text-sm text-destructive" role="alert">
                {errors.value.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateAdded">
              Date Added <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              id="dateAdded"
              shouldShowCalendarButton
              {...(() => {
                const { disabled, ...registerProps } = register('dateAdded');
                return registerProps;
              })()}
            />
            {errors.dateAdded && (
              <p id="dateAdded-error" className="text-sm text-destructive" role="alert">
                {errors.dateAdded.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Institution</Label>
            <Input id="institution" {...register('institution')} placeholder="Optional" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register('notes')} placeholder="Optional notes" rows={3} />
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
              <p className="text-sm text-destructive" role="alert">{errors.ticker.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-exchange">Exchange</Label>
            <SearchableSelect
              id="stock-exchange"
              value={watch('exchange') ?? ''}
              onValueChange={(value) => setValue('exchange', value)}
              options={[{ value: '', label: 'Optional' }, ...SUPPORTED_EXCHANGES.map((ex) => ({ value: ex, label: ex }))]}
              placeholder="Optional"
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
              <p className="text-sm text-destructive" role="alert">{errors.quantity.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-purchasePrice">
              Purchase price ($) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="stock-purchasePrice"
              type="number"
              step="0.01"
              min={0}
              placeholder="0.00"
              aria-invalid={!!errors.purchasePrice}
              className={errors.purchasePrice ? 'border-destructive' : ''}
              {...register('purchasePrice', { valueAsNumber: true })}
            />
            {errors.purchasePrice && (
              <p className="text-sm text-destructive" role="alert">{errors.purchasePrice.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-purchaseDate">Purchase date</Label>
            <DatePicker
              id="stock-purchaseDate"
              {...(() => {
                const { disabled, ...rest } = register('purchaseDate');
                return rest;
              })()}
            />
          </div>
          <div className="space-y-2">
            <Label>Value ($)</Label>
            <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
              {stockValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Quantity × Purchase price</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock-dateAdded">Date added</Label>
            <DatePicker
              id="stock-dateAdded"
              {...(() => {
                const { disabled, ...rest } = register('dateAdded');
                return rest;
              })()}
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
              <p className="text-sm text-destructive" role="alert">{errors.ticker.message}</p>
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
              <p className="text-sm text-destructive" role="alert">{errors.quantity.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-todaysPrice">
              Today&apos;s price ($) <span className="text-destructive">*</span>
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
              <p className="text-sm text-destructive" role="alert">{errors.todaysPrice.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-grantDate">Grant date</Label>
            <DatePicker
              id="rsu-grantDate"
              {...(() => {
                const { disabled, ...rest } = register('grantDate');
                return rest;
              })()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-vestingDate">
              Vesting date <span className="text-destructive">*</span>
            </Label>
            <DatePicker
              id="rsu-vestingDate"
              {...(() => {
                const { disabled, ...rest } = register('vestingDate');
                return rest;
              })()}
            />
            {errors.vestingDate && (
              <p className="text-sm text-destructive" role="alert">{errors.vestingDate.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Value ($)</Label>
            <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
              {rsuValue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Quantity × Today&apos;s price</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rsu-dateAdded">Date added</Label>
            <DatePicker
              id="rsu-dateAdded"
              {...(() => {
                const { disabled, ...rest } = register('dateAdded');
                return rest;
              })()}
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
              <p className="text-sm text-destructive" role="alert">{errors.ticker.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="crypto-purchaseDate">Purchase date</Label>
            <DatePicker
              id="crypto-purchaseDate"
              {...(() => {
                const { disabled, ...rest } = register('purchaseDate');
                return rest;
              })()}
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
              <p className="text-sm text-destructive" role="alert">{errors.quantity.message}</p>
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
              <p className="text-sm text-destructive" role="alert">{errors.value.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Unrealised profit/loss</Label>
            <div className="rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
              {cryptoUnrealisedPL != null
                ? `${cryptoUnrealisedPL >= 0 ? '+' : ''}$${cryptoUnrealisedPL.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
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
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitDisabled}>
          {isLoading ? 'Saving...' : asset ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}


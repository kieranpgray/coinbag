import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import type { Asset } from '@/types/domain';

const assetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum(['Real Estate', 'Investments', 'Vehicles', 'Crypto', 'Cash', 'Other']),
  value: z.number().min(0, 'Value must be positive'),
  dateAdded: z.string().min(1, 'Date is required'),
  institution: z.string().optional(),
  notes: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

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
        }
      : {
          type: defaultType,
          dateAdded: new Date().toISOString().split('T')[0],
        },
  });

  const selectedType = watch('type') || ''; // Ensure always defined for controlled Select

  const onSubmitForm = (data: AssetFormData) => {
    // The contract expects YYYY-MM-DD format, not ISO datetime string
    // The date input already provides YYYY-MM-DD format, so use it directly
    onSubmit({
      name: data.name,
      type: data.type,
      value: data.value,
      dateAdded: data.dateAdded, // Already in YYYY-MM-DD format from date input
      institution: data.institution,
      notes: data.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input id="name" {...register('name')} placeholder="Asset name" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

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
            { value: 'Other', label: 'Other' },
          ]}
          placeholder="Select asset type"
          error={errors.type?.message}
        />
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
          {...register('value', { valueAsNumber: true })}
        />
        {errors.value && <p className="text-sm text-destructive">{errors.value.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateAdded">
          Date Added <span className="text-destructive">*</span>
        </Label>
        <Input id="dateAdded" type="date" {...register('dateAdded')} />
        {errors.dateAdded && (
          <p className="text-sm text-destructive">{errors.dateAdded.message}</p>
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

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : asset ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}


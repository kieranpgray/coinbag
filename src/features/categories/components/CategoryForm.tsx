import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { categoryCreateSchema } from '@/contracts/categories';

type CategoryFormData = z.infer<typeof categoryCreateSchema>;

interface CategoryFormProps {
  defaultName?: string;
  onSubmit: (data: CategoryFormData) => void | Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function CategoryForm({
  defaultName,
  onSubmit,
  isSubmitting,
  submitLabel = 'Save',
}: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryCreateSchema),
    defaultValues: {
      name: defaultName ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" placeholder="Category name" {...register('name')} />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}




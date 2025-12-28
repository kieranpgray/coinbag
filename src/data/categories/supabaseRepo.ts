import type { CategoriesRepository } from './repo';
import { createAuthenticatedSupabaseClient } from '@/lib/supabaseClient';
import { categoryCreateSchema, categoryUpdateSchema, categoryListSchema, categoryEntitySchema } from '@/contracts/categories';

/**
 * Supabase implementation of CategoriesRepository
 */
export class SupabaseCategoriesRepository implements CategoriesRepository {
  private readonly selectColumns =
    'id, name, userId:user_id, createdAt:created_at, updatedAt:updated_at';

  async list(getToken: () => Promise<string | null>) {
    try {
      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('categories')
        .select(this.selectColumns)
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase categories list error:', error);
        return {
          data: [],
          error: this.normalizeSupabaseError(error),
        };
      }

      // Validate response data
      const validation = categoryListSchema.safeParse(data || []);
      if (!validation.success) {
        console.error('Categories list validation error:', validation.error);
        return {
          data: [],
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      return { data: validation.data };
    } catch (error) {
      console.error('List categories error:', error);
      return {
        data: [],
        error: this.normalizeSupabaseError(error),
      };
    }
  }

  async get(id: string, getToken: () => Promise<string | null>) {
    try {
      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Category ID is required.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('categories')
        .select(this.selectColumns)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Category not found.',
              code: 'NOT_FOUND',
            },
          };
        }
        console.error('Supabase categories get error:', error);
        return { error: this.normalizeSupabaseError(error) };
      }

      // Validate response data
      const validation = categoryEntitySchema.safeParse(data);
      if (!validation.success) {
        console.error('Category validation error:', validation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      return { data: validation.data };
    } catch (error) {
      console.error('Get category error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async create(input: { name: string }, getToken: () => Promise<string | null>) {
    try {
      // Validate input
      const validation = categoryCreateSchema.safeParse(input);
      if (!validation.success) {
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: 'VALIDATION_ERROR',
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('categories')
        .insert([validation.data])
        .select(this.selectColumns)
        .single();

      if (error) {
        console.error('Supabase categories create error:', error);
        return { error: this.normalizeSupabaseError(error) };
      }

      // Validate response data
      const responseValidation = categoryEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Category create response validation error:', responseValidation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      return { data: responseValidation.data };
    } catch (error) {
      console.error('Create category error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async update(id: string, input: { name: string }, getToken: () => Promise<string | null>) {
    try {
      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Category ID is required.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      const validation = categoryUpdateSchema.safeParse(input);
      if (!validation.success) {
        return {
          error: {
            error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}`,
            code: 'VALIDATION_ERROR',
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      const { data, error } = await supabase
        .from('categories')
        .update(validation.data)
        .eq('id', id)
        .select(this.selectColumns)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Category not found.',
              code: 'NOT_FOUND',
            },
          };
        }
        console.error('Supabase categories update error:', error);
        return { error: this.normalizeSupabaseError(error) };
      }

      // Validate response data
      const responseValidation = categoryEntitySchema.safeParse(data);
      if (!responseValidation.success) {
        console.error('Category update response validation error:', responseValidation.error);
        return {
          error: {
            error: 'Invalid data received from server.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      return { data: responseValidation.data };
    } catch (error) {
      console.error('Update category error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  async remove(id: string, getToken: () => Promise<string | null>) {
    try {
      // Validate input
      if (!id) {
        return {
          error: {
            error: 'Category ID is required.',
            code: 'VALIDATION_ERROR',
          },
        };
      }

      const supabase = await createAuthenticatedSupabaseClient(getToken);

      // Step 1: Uncategorise all subscriptions that reference this category
      // Set their category_id to NULL before deleting the category
      const { error: uncategoriseError } = await supabase
        .from('subscriptions')
        .update({ category_id: null })
        .eq('category_id', id);

      if (uncategoriseError) {
        console.error('Error uncategorising subscriptions before category delete:', uncategoriseError);
        return {
          error: {
            error: 'Failed to uncategorise subscriptions before deleting category.',
            code: 'UNCATEGORISE_FAILED',
          },
        };
      }

      // Step 2: Delete the category
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            error: {
              error: 'Category not found.',
              code: 'NOT_FOUND',
            },
          };
        }
        console.error('Supabase categories delete error:', error);
        return { error: this.normalizeSupabaseError(error) };
      }

      return {};
    } catch (error) {
      console.error('Delete category error:', error);
      return { error: this.normalizeSupabaseError(error) };
    }
  }

  private normalizeSupabaseError(error: unknown): { error: string; code: string } {
    if (!error || typeof error !== 'object') {
      return {
        error: 'An unexpected error occurred.',
        code: 'UNKNOWN_ERROR',
      };
    }

    const err = error as Record<string, unknown> & {
      code?: unknown;
      message?: unknown;
      details?: unknown;
    };
    const errorCode = typeof err.code === 'string' ? err.code : undefined;

    // Handle known PostgreSQL/Supabase error codes
    if (errorCode === '23505') {
      return {
        error: 'A category with this name already exists.',
        code: 'DUPLICATE_ENTRY',
      };
    }

    if (errorCode === '23514') {
      return {
        error: 'Invalid category data.',
        code: 'VALIDATION_ERROR',
      };
    }

    if (errorCode === 'PGRST116') {
      return {
        error: 'Category not found.',
        code: 'NOT_FOUND',
      };
    }

    // Handle specific Supabase error patterns
    const message = typeof err.message === 'string' ? err.message : undefined;
    if (message?.includes('JWT')) {
      return {
        error: 'Authentication token expired. Please sign in again.',
        code: 'AUTH_EXPIRED',
      };
    }

    if (message?.includes('permission')) {
      return {
        error: 'You do not have permission to perform this action.',
        code: 'PERMISSION_DENIED',
      };
    }

    // Default error with more context
    return {
      error:
        (typeof err.message === 'string' && err.message) ||
        (typeof err.details === 'string' && err.details) ||
        'An unexpected error occurred.',
      code: 'UNKNOWN_ERROR',
    };
  }
}

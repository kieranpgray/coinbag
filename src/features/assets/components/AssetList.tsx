import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatPercentage, formatDate } from '@/lib/utils';
import { Pencil, Trash2, Plus } from 'lucide-react';
import type { Asset } from '@/types/domain';

interface AssetListProps {
  assets: Asset[];
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onAddAsset?: () => void;
}

export function AssetList({ assets, onEdit, onDelete, onAddAsset }: AssetListProps) {
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="text-right">1D Change</TableHead>
            <TableHead className="text-right">1W Change</TableHead>
            <TableHead>Institution</TableHead>
            <TableHead>Date Added</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-12">
                <div className="flex flex-col items-center gap-4">
                  <div className="text-muted-foreground">
                    No assets found. Start building your portfolio by adding your first asset.
                  </div>
                  <Button
                    onClick={onAddAsset}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Asset
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">{asset.name}</TableCell>
                <TableCell>{asset.type}</TableCell>
                <TableCell className="text-right">{formatCurrency(asset.value)}</TableCell>
                <TableCell className="text-right">
                  {asset.change1D !== undefined ? (
                    <span
                      className={asset.change1D >= 0 ? 'text-success' : 'text-error'}
                    >
                      {formatPercentage(asset.change1D)}
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {asset.change1W !== undefined ? (
                    <span
                      className={asset.change1W >= 0 ? 'text-success' : 'text-error'}
                    >
                      {formatPercentage(asset.change1W)}
                    </span>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{asset.institution || '-'}</TableCell>
                <TableCell>{formatDate(asset.dateAdded)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(asset)}
                      aria-label="Edit asset"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(asset)}
                      aria-label="Delete asset"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}


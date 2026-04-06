import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ConfirmDestructiveDialog } from '@/components/shared/ConfirmDestructiveDialog';
import { AssetForm } from './AssetForm';
import { AssetChangeLog } from './AssetChangeLog';
import type { Asset } from '@/types/domain';

interface EditAssetModalProps {
  asset: Asset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Asset>) => void;
  onDeleteRequested: () => void;
  onDisconnectBrokerageSync?: (assetId: string) => Promise<void>;
  isDisconnectingBrokerage?: boolean;
  isLoading?: boolean;
}

export function EditAssetModal({
  asset,
  open,
  onOpenChange,
  onSubmit,
  onDeleteRequested,
  onDisconnectBrokerageSync,
  isDisconnectingBrokerage,
  isLoading,
}: EditAssetModalProps) {
  const { t } = useTranslation('pages');
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  useEffect(() => {
    if (!open) setDisconnectOpen(false);
  }, [open]);

  const handleSubmit = (data: Omit<Asset, 'id' | 'change1D' | 'change1W'>) => {
    onSubmit(data);
  };

  const brokerageLabel = asset.institution?.trim() || asset.name?.trim() || '';
  const disconnectTitle = brokerageLabel
    ? t('snaptrade.disconnectTitle', { brokerage: brokerageLabel })
    : t('snaptrade.disconnectTitleFallback');

  const handleConfirmDisconnect = async () => {
    if (!onDisconnectBrokerageSync) return;
    try {
      await onDisconnectBrokerageSync(asset.id);
      setDisconnectOpen(false);
      onOpenChange(false);
    } catch {
      // Error surfaced by parent (e.g. toast)
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit asset</DialogTitle>
          <DialogDescription>Update the details for this asset.</DialogDescription>
        </DialogHeader>
        {asset.dataSource === 'snaptrade' && onDisconnectBrokerageSync && (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
            <p className="text-body-sm text-muted-foreground mb-2">
              {t('snaptrade.trustCredentialsNote')}
            </p>
            <button
              type="button"
              onClick={() => setDisconnectOpen(true)}
              disabled={isDisconnectingBrokerage || isLoading}
              className="text-body-sm text-destructive underline underline-offset-4 hover:no-underline disabled:opacity-50"
            >
              {t('snaptrade.disconnectCta')}
            </button>
          </div>
        )}
        <AssetForm
          asset={asset}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
          onDelete={onDeleteRequested}
          isLoading={isLoading}
        />
        <ConfirmDestructiveDialog
          open={disconnectOpen}
          onOpenChange={setDisconnectOpen}
          title={disconnectTitle}
          body={t('snaptrade.disconnectBody')}
          confirmLabel={t('snaptrade.disconnectConfirm')}
          onConfirm={() => void handleConfirmDisconnect()}
          isLoading={isDisconnectingBrokerage}
        />
        <div className="mt-6 pt-6 border-t border-border">
          <h3 className="text-body font-semibold mb-3">Change History</h3>
          <AssetChangeLog assetId={asset.id} />
        </div>
      </DialogContent>
    </Dialog>
  );
}


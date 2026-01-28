import { useState, useEffect } from 'react';
import { X, User, Calendar, DollarSign, Tag, FileText, Receipt } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ReceiptUpload } from './ReceiptUpload';
import { apiRequest, getReceipt } from '../lib/api';
import { formatCents } from '../lib/money';

interface PurchaseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: {
    id: string;
    amount: number;
    currency?: string;
    description: string;
    category: string | null;
    paidBy: {
      id: string;
      name: string;
      email: string;
    };
    date: string;
    createdAt: string;
    splits?: Array<{
      userId: string;
      userName: string;
      amount: number;
    }>;
  };
  roomId: string;
}

export function PurchaseDetailsModal({
  isOpen,
  onClose,
  purchase,
  roomId
}: PurchaseDetailsModalProps) {
  const [receipt, setReceipt] = useState<any>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [purchaseDetails, setPurchaseDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (isOpen && purchase.id) {
      loadReceipt();
      loadPurchaseDetails();
    }
  }, [isOpen, purchase.id]);

  const loadPurchaseDetails = async () => {
    setLoadingDetails(true);
    try {
      const data = await apiRequest<any>(`/rooms/${roomId}/purchases/${purchase.id}`);
      setPurchaseDetails(data);
    } catch (err) {
      console.error('Failed to load purchase details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadReceipt = async () => {
    setLoadingReceipt(true);
    try {
      const data = await getReceipt(roomId, purchase.id);
      setReceipt(data.receipt);
    } catch (err: any) {
      // 404 means no receipt exists
      if (!err.message?.includes('404')) {
        console.error('Failed to load receipt:', err);
      }
      setReceipt(null);
    } finally {
      setLoadingReceipt(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Purchase Details">
      <div className="space-y-6">
        {/* Purchase Info */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {formatCents(purchase.currency || 'USD', Math.round(purchase.amount * 100))}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {purchase.description || 'No description'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Paid by</p>
                <p className="font-medium text-gray-900">{purchase.paidBy.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-gray-500">Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(purchase.date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {purchase.category && (
              <div className="flex items-center gap-2 text-sm col-span-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium text-gray-900">{purchase.category}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Splits */}
        {!loadingDetails && purchaseDetails?.splits && purchaseDetails.splits.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Split Details
              {purchaseDetails.purchase?.splitMode && purchaseDetails.purchase.splitMode !== 'equal' && (
                <span className="text-xs text-gray-500">
                  ({purchaseDetails.purchase.splitMode === 'custom_amount' ? 'Custom Amount' : 'Custom %'})
                </span>
              )}
            </h4>
            <div className="space-y-2">
              {purchaseDetails.splits.map((split: any) => (
                <div
                  key={split.userId}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-900">
                    {split.displayName}
                  </span>
                  <span className="text-sm text-gray-600">
                    {formatCents(purchase.currency || 'USD', split.shareAmountCents)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingDetails && (
          <div className="flex items-center justify-center p-4">
            <LoadingSpinner />
          </div>
        )}

        {/* Receipt Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            Receipt
          </h4>
          {loadingReceipt ? (
            <div className="flex items-center justify-center p-8 bg-gray-50 rounded-lg">
              <LoadingSpinner />
            </div>
          ) : (
            <ReceiptUpload
              roomId={roomId}
              purchaseId={purchase.id}
              existingReceipt={receipt}
              onUploadSuccess={loadReceipt}
              onDeleteSuccess={() => setReceipt(null)}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}

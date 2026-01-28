import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, FileText, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { uploadReceipt, deleteReceipt } from '../lib/api';

interface ReceiptUploadProps {
  roomId: string;
  purchaseId: string;
  existingReceipt?: {
    id: string;
    originalFilename: string;
    fileSizeBytes: number;
    mimeType: string;
    publicUrl: string;
    createdAt: string;
  } | null;
  onUploadSuccess?: () => void;
  onDeleteSuccess?: () => void;
}

export function ReceiptUpload({
  roomId,
  purchaseId,
  existingReceipt,
  onUploadSuccess,
  onDeleteSuccess
}: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPEG, PNG, and WebP images are allowed');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      await uploadReceipt(roomId, purchaseId, file);
      onUploadSuccess?.();
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload receipt');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this receipt?')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteReceipt(roomId, purchaseId);
      onDeleteSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to delete receipt');
    } finally {
      setDeleting(false);
    }
  };

  if (existingReceipt) {
    return (
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
              <img
                src={existingReceipt.publicUrl}
                alt="Receipt thumbnail"
                className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setShowFullImage(true)}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <p className="text-sm font-medium text-gray-900 truncate">
                  {existingReceipt.originalFilename}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formatFileSize(existingReceipt.fileSizeBytes)} • {new Date(existingReceipt.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {deleting ? <LoadingSpinner size="sm" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFullImage(true)}
            className="flex-1"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            View Full Image
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-1"
          >
            {uploading ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Replace
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Full Image Modal */}
        {showFullImage && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setShowFullImage(false)}
          >
            <div className="relative max-w-5xl w-full max-h-[90vh]">
              <button
                onClick={() => setShowFullImage(false)}
                className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={existingReceipt.publicUrl}
                alt="Receipt"
                className="w-full h-full object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer"
      >
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700 mb-1">
          {uploading ? 'Uploading...' : 'Click to upload receipt'}
        </p>
        <p className="text-xs text-gray-500">
          JPEG, PNG, or WebP up to 5MB
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
      />

      {uploading && (
        <div className="flex items-center justify-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <LoadingSpinner size="sm" className="mr-2" />
          <span className="text-sm text-blue-700">Uploading receipt...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}

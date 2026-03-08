import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Download, Trash2, AlertCircle, User, Eye, File, Users, Bell, Loader2, Image, FileType } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useUserStatus } from '@/hooks/useUserStatus';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { FileViewersModal } from '@/components/ui/file-viewers-modal';
import { VaultAccessModal } from '@/components/VaultAccessModal';
import { springPresets } from '@/components/ui/spring-config';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  url: string;
  storage_path: string;
  uploaded_by: string;
  uploader_name: string;
  created_at: string;
}

interface FileView {
  id: string;
  file_id: string;
  user_id: string;
  user_name: string;
  viewed_at: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_TYPES: Record<string, { ext: string; icon: string; color: string }> = {
  // PDF
  'application/pdf': { ext: 'pdf', icon: 'pdf', color: 'text-destructive' },
  // Text files
  'text/plain': { ext: 'txt', icon: 'text', color: 'text-blue-500' },
  // Word documents
  'application/msword': { ext: 'doc', icon: 'word', color: 'text-blue-600' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', icon: 'word', color: 'text-blue-600' },
  // Images
  'image/jpeg': { ext: 'jpg', icon: 'image', color: 'text-green-500' },
  'image/png': { ext: 'png', icon: 'image', color: 'text-green-500' },
  'image/gif': { ext: 'gif', icon: 'image', color: 'text-purple-500' },
  'image/webp': { ext: 'webp', icon: 'image', color: 'text-green-500' },
};

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif', '.webp'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function getFileIcon(filename: string) {
  const ext = getFileExtension(filename);
  switch (ext) {
    case 'pdf':
      return { color: 'text-destructive', bg: 'bg-destructive/10', icon: FileText };
    case 'txt':
      return { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: FileType };
    case 'doc':
    case 'docx':
      return { color: 'text-blue-600', bg: 'bg-blue-600/10', icon: FileText };
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return { color: 'text-green-500', bg: 'bg-green-500/10', icon: Image };
    default:
      return { color: 'text-muted-foreground', bg: 'bg-muted', icon: File };
  }
}

export function VaultTab() {
  const { user, profile } = useAuth();
  const { isFounder } = useUserRole();
  const { isMember } = useUserStatus();
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [fileViews, setFileViews] = useState<Record<string, FileView[]>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [viewersModalFile, setViewersModalFile] = useState<UploadedFile | null>(null);
  const [restrictedFile, setRestrictedFile] = useState<UploadedFile | null>(null);

  // Fetch files from database
  const fetchFiles = async () => {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching files:', error);
      toast({
        title: 'Error loading files',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setFiles(data || []);
    }
    setIsLoading(false);
  };

  // Fetch file views
  const fetchFileViews = async () => {
    const { data, error } = await supabase
      .from('file_views')
      .select('*')
      .order('viewed_at', { ascending: false });

    if (error) {
      console.error('Error fetching file views:', error);
    } else if (data) {
      const grouped: Record<string, FileView[]> = {};
      data.forEach((view) => {
        if (!grouped[view.file_id]) {
          grouped[view.file_id] = [];
        }
        grouped[view.file_id].push(view);
      });
      setFileViews(grouped);
    }
  };

  useEffect(() => {
    fetchFiles();
    fetchFileViews();
  }, []);

  // Track file view
  const trackFileView = async (fileId: string) => {
    if (!user || !profile) return;
    
    try {
      await supabase.from('file_views').upsert({
        file_id: fileId,
        user_id: user.id,
        user_name: profile.display_name || user.email?.split('@')[0] || 'Unknown',
      }, { onConflict: 'file_id,user_id' });
      
      // Refresh views
      fetchFileViews();
    } catch (error) {
      console.error('Error tracking file view:', error);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, [user, profile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      processFiles(selectedFiles);
    }
  }, [user, profile]);

  const isValidFileType = (file: File): boolean => {
    const ext = '.' + getFileExtension(file.name);
    return ALLOWED_EXTENSIONS.includes(ext) || Object.keys(ALLOWED_TYPES).includes(file.type);
  };

  const processFiles = async (fileList: File[]) => {
    if (!user) {
      toast({
        title: 'Not authenticated',
        description: 'Please sign in to upload files.',
        variant: 'destructive',
      });
      return;
    }

    for (const file of fileList) {
      // Check file type
      if (!isValidFileType(file)) {
        toast({
          title: 'Invalid file type',
          description: 'Allowed: PDF, TXT, DOC, DOCX, JPG, PNG, GIF, WEBP',
          variant: 'destructive',
        });
        continue;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large!',
          description: 'Max limit 10MB.',
          variant: 'destructive',
        });
        continue;
      }

      setIsUploading(true);

      try {
        // Upload to storage
        const fileName = `${user.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        // Save metadata to database (no public URL stored)
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            name: file.name,
            size: file.size,
            url: '', // No longer storing public URLs
            storage_path: fileName,
            uploaded_by: user.id,
            uploader_name: profile?.display_name || user.email?.split('@')[0] || 'Unknown',
          });

        if (dbError) throw dbError;

        toast({
          title: 'File uploaded!',
          description: `${file.name} has been added to the vault.`,
        });

        // Refresh file list
        fetchFiles();
      } catch (error: any) {
        console.error('Upload error:', error);
        toast({
          title: 'Upload failed',
          description: error.message,
          variant: 'destructive',
        });
      }

      setIsUploading(false);
    }
  };

  const STORAGE_BUCKET = 'files' as const;

  // Generate signed URL for secure file access (short expiry)
  const getSignedUrl = async (
    storagePath: string,
    expiresInSeconds = 60,
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(storagePath, expiresInSeconds);

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (err) {
      console.error('Error in getSignedUrl:', err);
      return null;
    }
  };

  const handleDelete = async (file: UploadedFile) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([file.storage_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', file.id);

      if (dbError) throw dbError;

      toast({
        title: 'File deleted',
        description: 'The file has been removed from the vault.',
      });

      fetchFiles();
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: 'Delete failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Request founder review
  const handleRequestReview = async (file: UploadedFile) => {
    if (!user || !profile) return;

    const { error } = await supabase.from('founder_alerts').insert({
      type: 'vault',
      message: `Review requested for document: ${file.name}`,
      triggered_by: user.id,
      triggered_by_name: profile.display_name || user.email?.split('@')[0] || 'Unknown',
      file_id: file.id,
    });

    if (error) {
      toast({
        title: 'Failed to request review',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Review requested',
        description: 'CEO and CTO have been notified.',
      });
    }
  };

  const triggerDownloadFromBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const fetchBlobWithProgress = async (
    url: string,
    onProgress: (pct: number | null) => void,
  ): Promise<Blob> => {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Download failed (HTTP ${response.status})`);
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';

    // If streaming/progress isn't available, fall back to a plain blob
    if (!response.body || !contentLength) {
      onProgress(null);
      const blob = await response.blob();
      return new Blob([blob], { type: contentType });
    }

    const reader = response.body.getReader();
    const chunks: BlobPart[] = [];
    let received = 0;

    onProgress(0);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      chunks.push(value as unknown as BlobPart);
      received += value.length;
      onProgress(Math.min(100, Math.round((received / contentLength) * 100)));
    }

    onProgress(100);
    return new Blob(chunks, { type: contentType });
  };

  const handleDownload = async (file: UploadedFile) => {
    if (!file.storage_path) {
      toast({
        title: 'Download failed',
        description: 'Missing file path.',
        variant: 'destructive',
      });
      return;
    }

    if (downloadingFileId) return;

    // Track the view (non-blocking)
    trackFileView(file.id);

    setDownloadingFileId(file.id);
    setDownloadProgress(null);

    try {
      const signedUrl = await getSignedUrl(file.storage_path, 60);
      if (!signedUrl) {
        throw new Error('Could not generate a secure download link.');
      }

      const blob = await fetchBlobWithProgress(signedUrl, setDownloadProgress);
      triggerDownloadFromBlob(blob, file.name);

      toast({
        title: 'File downloaded successfully',
        description: file.name,
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: 'Download failed',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDownloadingFileId(null);
      setDownloadProgress(null);
    }
  };

  const handlePreview = async (file: UploadedFile) => {
    if (!file.storage_path) {
      toast({
        title: 'Preview failed',
        description: 'Missing file path.',
        variant: 'destructive',
      });
      return;
    }

    // Track the view (non-blocking)
    trackFileView(file.id);

    const signedUrl = await getSignedUrl(file.storage_path, 60);
    if (!signedUrl) {
      toast({
        title: 'Preview failed',
        description: 'Could not generate a secure preview link.',
        variant: 'destructive',
      });
      return;
    }

    window.open(signedUrl, '_blank', 'noopener,noreferrer');
  };

  // Check if user can see viewers (CEO, CTO, or uploader)
  const canSeeViewers = (file: UploadedFile) => {
    return isFounder || file.uploaded_by === user?.id;
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springPresets.snappy}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold">Document Vault</h1>
        <p className="text-muted-foreground">
          Securely store and share documents & images with your team. Max file size: 10MB.
        </p>
      </motion.div>

      {/* Upload Zone - members only */}
      {isMember && (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springPresets.snappy, delay: 0.1 }}
      >
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300",
            isDragging
              ? "border-primary bg-primary/5 scale-[1.02]"
              : "border-border hover:border-primary/50 hover:bg-card/50",
            isUploading && "opacity-50 pointer-events-none"
          )}
        >
          <input
            type="file"
            accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp"
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          
          <motion.div
            animate={{ y: isDragging ? -5 : 0 }}
            transition={springPresets.bouncy}
            className="flex flex-col items-center text-center"
          >
            <motion.div 
              className={cn(
                "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
                isDragging ? "bg-primary/20" : "bg-secondary"
              )}
              whileHover={{ scale: 1.05 }}
              transition={springPresets.button}
            >
              <Upload className={cn(
                "w-8 h-8 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </motion.div>
            <h3 className="text-lg font-medium mb-1">
              {isUploading ? 'Uploading...' : isDragging ? 'Drop your files here' : 'Drag & drop files'}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              PDF, TXT, DOC, DOCX, JPG, PNG, GIF, WEBP • or click to browse
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="w-3 h-3" />
              <span>Max file size: 10MB</span>
            </div>
          </motion.div>
        </label>
      </motion.div>

      {/* File List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...springPresets.snappy, delay: 0.2 }}
        className="space-y-3"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Uploaded Files
          <span className="text-sm font-normal text-muted-foreground">
            ({files.length})
          </span>
        </h2>

        {isLoading ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-muted-foreground">Loading files...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {files.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={springPresets.snappy}
                className="glass-card rounded-xl p-8 text-center"
              >
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No files uploaded yet</p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {files.map((file, index) => {
                  const fileStyle = getFileIcon(file.name);
                  const viewCount = fileViews[file.id]?.length || 0;
                  const showViewers = canSeeViewers(file);
                  const isDownloadingThis = downloadingFileId === file.id;
                  
                  return (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ ...springPresets.snappy, delay: index * 0.05 }}
                      layout
                      className="glass-card rounded-xl p-4 flex items-center gap-4 group"
                    >
                      <motion.div 
                        className={cn("w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0", fileStyle.bg)}
                        whileHover={{ scale: 1.05 }}
                        transition={springPresets.button}
                      >
                        <fileStyle.icon className={cn("w-6 h-6", fileStyle.color)} />
                      </motion.div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {file.uploader_name}
                          </span>
                          {showViewers && viewCount > 0 && (
                            <span className="flex items-center gap-1 text-primary">
                              <Eye className="w-3 h-3" />
                              {viewCount} view{viewCount !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {isDownloadingThis && (
                          <div className="mt-2 flex items-center gap-3">
                            {downloadProgress != null ? (
                              <>
                                <Progress value={downloadProgress} className="h-2 flex-1" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  Downloading... {Math.round(downloadProgress)}%
                                </span>
                              </>
                            ) : (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Downloading...</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {showViewers && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewersModalFile(file)}
                            className="h-9 w-9"
                            title="View who accessed this file"
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(file)}
                          className="h-9 w-9"
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(file)}
                          className="h-9 w-9"
                          title={isDownloadingThis ? 'Downloading...' : 'Download'}
                          disabled={isDownloadingThis}
                        >
                          {isDownloadingThis ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                        {/* Request Review Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRequestReview(file)}
                          className="h-9 w-9 hover:text-amber-500"
                          title="Request founder review"
                        >
                          <Bell className="w-4 h-4" />
                        </Button>
                        {file.uploaded_by === user?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(file)}
                            className="h-9 w-9 hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        )}
      </motion.div>


      {/* File Viewers Modal */}
      <FileViewersModal
        isOpen={!!viewersModalFile}
        onClose={() => setViewersModalFile(null)}
        fileName={viewersModalFile?.name || ''}
        viewers={viewersModalFile ? (fileViews[viewersModalFile.id] || []) : []}
      />
    </div>
  );
}

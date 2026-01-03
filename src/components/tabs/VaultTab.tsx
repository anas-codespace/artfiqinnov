import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Download, Trash2, AlertCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export function VaultTab() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

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

  useEffect(() => {
    fetchFiles();
  }, []);

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
      // Check if PDF
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Invalid file type',
          description: 'Only PDF files are allowed.',
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

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('files')
          .getPublicUrl(fileName);

        // Save metadata to database
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            name: file.name,
            size: file.size,
            url: urlData.publicUrl,
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

  const handleDelete = async (file: UploadedFile) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('files')
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
      toast({
        title: 'Delete failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDownload = (file: UploadedFile) => {
    window.open(file.url, '_blank');
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <h1 className="text-3xl font-bold">Document Vault</h1>
        <p className="text-muted-foreground">
          Securely store and share PDF documents with your team.
        </p>
      </motion.div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
            accept=".pdf"
            multiple
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />
          
          <motion.div
            animate={{ y: isDragging ? -5 : 0 }}
            className="flex flex-col items-center text-center"
          >
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-colors",
              isDragging ? "bg-primary/20" : "bg-secondary"
            )}>
              <Upload className={cn(
                "w-8 h-8 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            <h3 className="text-lg font-medium mb-1">
              {isUploading ? 'Uploading...' : isDragging ? 'Drop your files here' : 'Drag & drop PDF files'}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              or click to browse
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
        transition={{ delay: 0.2 }}
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
                className="glass-card rounded-xl p-8 text-center"
              >
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No files uploaded yet</p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ delay: index * 0.05 }}
                    layout
                    className="glass-card rounded-xl p-4 flex items-center gap-4 group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-destructive" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {file.uploader_name}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(file)}
                        className="h-9 w-9"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      {file.uploaded_by === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(file)}
                          className="h-9 w-9 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}

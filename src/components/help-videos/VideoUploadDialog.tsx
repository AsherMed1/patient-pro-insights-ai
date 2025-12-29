import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Upload, X, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VideoData {
  id?: string;
  title: string;
  description: string;
  video_url: string;
  thumbnail_url: string;
  category: string;
  duration: string;
  project_name: string | null;
  is_published: boolean;
  order_index: number;
}

interface VideoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video?: VideoData | null;
  categories: string[];
  projects: string[];
  onSuccess: () => void;
}

const DEFAULT_CATEGORIES = ['Getting Started', 'Appointments', 'Leads', 'Analytics', 'Settings', 'General'];

export const VideoUploadDialog: React.FC<VideoUploadDialogProps> = ({
  open,
  onOpenChange,
  video,
  categories,
  projects,
  onSuccess
}) => {
  const isEdit = !!video;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  
  const [title, setTitle] = useState(video?.title || '');
  const [description, setDescription] = useState(video?.description || '');
  const [videoUrl, setVideoUrl] = useState(video?.video_url || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(video?.thumbnail_url || '');
  const [category, setCategory] = useState(video?.category || 'General');
  const [duration, setDuration] = useState(video?.duration || '');
  const [projectName, setProjectName] = useState<string>(video?.project_name || '');
  const [isPublished, setIsPublished] = useState(video?.is_published ?? false);
  
  const [useExternalUrl, setUseExternalUrl] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...categories])];

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setThumbnailUrl('');
    setCategory('General');
    setDuration('');
    setProjectName('');
    setIsPublished(false);
    setUseExternalUrl(false);
    setExternalUrl('');
  };

  const handleVideoUpload = async (file: File) => {
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a valid video file');
      return;
    }

    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      toast.error('Video file must be under 500MB');
      return;
    }

    setIsUploadingVideo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('help-videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('help-videos')
        .getPublicUrl(filePath);

      setVideoUrl(publicUrl);
      toast.success('Video uploaded successfully');
    } catch (error: any) {
      console.error('Video upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleThumbnailUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('Thumbnail must be under 5MB');
      return;
    }

    setIsUploadingThumbnail(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}-thumb.${fileExt}`;
      const filePath = `thumbnails/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('help-videos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('help-videos')
        .getPublicUrl(filePath);

      setThumbnailUrl(publicUrl);
      toast.success('Thumbnail uploaded successfully');
    } catch (error: any) {
      console.error('Thumbnail upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    const finalVideoUrl = useExternalUrl ? externalUrl : videoUrl;
    if (!finalVideoUrl.trim()) {
      toast.error('Video URL is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const videoData = {
        title: title.trim(),
        description: description.trim() || null,
        video_url: finalVideoUrl.trim(),
        thumbnail_url: thumbnailUrl.trim() || null,
        category: category,
        duration: duration.trim() || null,
        project_name: projectName || null,
        is_published: isPublished,
      };

      if (isEdit && video?.id) {
        const { error } = await supabase
          .from('help_videos')
          .update(videoData)
          .eq('id', video.id);

        if (error) throw error;
        toast.success('Video updated successfully');
      } else {
        // Get next order_index
        const { data: maxOrder } = await supabase
          .from('help_videos')
          .select('order_index')
          .order('order_index', { ascending: false })
          .limit(1)
          .single();

        const { error } = await supabase
          .from('help_videos')
          .insert({
            ...videoData,
            order_index: (maxOrder?.order_index || 0) + 1
          });

        if (error) throw error;
        toast.success('Video created successfully');
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Video' : 'Add New Video'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the video content"
              rows={3}
            />
          </div>

          {/* Video Source Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="external-url"
              checked={useExternalUrl}
              onCheckedChange={setUseExternalUrl}
            />
            <Label htmlFor="external-url">Use external URL (YouTube, Vimeo, etc.)</Label>
          </div>

          {/* Video Upload or External URL */}
          {useExternalUrl ? (
            <div className="space-y-2">
              <Label htmlFor="external-url-input">External Video URL</Label>
              <Input
                id="external-url-input"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://www.youtube.com/embed/..."
              />
              <p className="text-xs text-muted-foreground">
                Use embed URLs for YouTube/Vimeo (e.g., youtube.com/embed/VIDEO_ID)
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Video File (MP4)</Label>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleVideoUpload(e.target.files[0])}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isUploadingVideo}
                  className="flex-1"
                >
                  {isUploadingVideo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Video
                    </>
                  )}
                </Button>
                {videoUrl && (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Video className="h-4 w-4" />
                    <span className="truncate max-w-[200px]">Video uploaded</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setVideoUrl('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Thumbnail Upload */}
          <div className="space-y-2">
            <Label>Thumbnail Image (optional)</Label>
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleThumbnailUpload(e.target.files[0])}
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={isUploadingThumbnail}
                className="flex-1"
              >
                {isUploadingThumbnail ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Upload Thumbnail
                  </>
                )}
              </Button>
              {thumbnailUrl && (
                <div className="flex items-center gap-2">
                  <img src={thumbnailUrl} alt="Thumbnail" className="h-10 w-16 object-cover rounded" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setThumbnailUrl('')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duration</Label>
              <Input
                id="duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 5:30"
              />
            </div>
          </div>

          {/* Project Filter */}
          <div className="space-y-2">
            <Label htmlFor="project">Restrict to Project (optional)</Label>
            <Select value={projectName} onValueChange={setProjectName}>
              <SelectTrigger>
                <SelectValue placeholder="All projects (no restriction)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All projects</SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj} value={proj}>{proj}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              If set, this video will only appear for users viewing this specific project.
            </p>
          </div>

          {/* Published Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="published"
              checked={isPublished}
              onCheckedChange={setIsPublished}
            />
            <Label htmlFor="published">Published (visible to users)</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              isEdit ? 'Update Video' : 'Add Video'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
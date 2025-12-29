import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Eye, EyeOff, Video, ArrowUp, ArrowDown, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoUploadDialog } from '@/components/help-videos/VideoUploadDialog';

interface HelpVideo {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  duration: string | null;
  project_name: string | null;
  is_published: boolean;
  order_index: number;
  views: number | null;
  created_at: string;
}

const HelpVideoManager: React.FC = () => {
  const [videos, setVideos] = useState<HelpVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [publishedFilter, setPublishedFilter] = useState('all');
  
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [editingVideo, setEditingVideo] = useState<HelpVideo | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<HelpVideo | null>(null);
  
  const [projects, setProjects] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchVideos();
    fetchProjects();
  }, []);

  const fetchVideos = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('help_videos')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching videos:', error);
      toast.error('Failed to load videos');
    } else {
      setVideos(data || []);
      // Extract unique categories
      const uniqueCategories = [...new Set(data?.map(v => v.category) || [])];
      setCategories(uniqueCategories);
    }
    setIsLoading(false);
  };

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('project_name')
      .eq('active', true)
      .order('project_name');
    
    if (data) {
      setProjects(data.map(p => p.project_name));
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || video.category === categoryFilter;
    const matchesPublished = publishedFilter === 'all' || 
      (publishedFilter === 'published' && video.is_published) ||
      (publishedFilter === 'unpublished' && !video.is_published);
    
    return matchesSearch && matchesCategory && matchesPublished;
  });

  const handleTogglePublish = async (video: HelpVideo) => {
    const { error } = await supabase
      .from('help_videos')
      .update({ is_published: !video.is_published })
      .eq('id', video.id);

    if (error) {
      toast.error('Failed to update video');
    } else {
      toast.success(video.is_published ? 'Video unpublished' : 'Video published');
      fetchVideos();
    }
  };

  const handleDelete = async () => {
    if (!deletingVideo) return;

    const { error } = await supabase
      .from('help_videos')
      .delete()
      .eq('id', deletingVideo.id);

    if (error) {
      toast.error('Failed to delete video');
    } else {
      toast.success('Video deleted');
      fetchVideos();
    }
    setDeletingVideo(null);
  };

  const handleMoveUp = async (video: HelpVideo, index: number) => {
    if (index === 0) return;
    
    const prevVideo = filteredVideos[index - 1];
    
    await Promise.all([
      supabase.from('help_videos').update({ order_index: prevVideo.order_index }).eq('id', video.id),
      supabase.from('help_videos').update({ order_index: video.order_index }).eq('id', prevVideo.id)
    ]);
    
    fetchVideos();
  };

  const handleMoveDown = async (video: HelpVideo, index: number) => {
    if (index === filteredVideos.length - 1) return;
    
    const nextVideo = filteredVideos[index + 1];
    
    await Promise.all([
      supabase.from('help_videos').update({ order_index: nextVideo.order_index }).eq('id', video.id),
      supabase.from('help_videos').update({ order_index: video.order_index }).eq('id', nextVideo.id)
    ]);
    
    fetchVideos();
  };

  const isEmbedUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('vimeo.com') || url.includes('loom.com');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Help Video Manager
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage training and help videos for the support widget
          </p>
        </div>
        <Button onClick={() => { setEditingVideo(null); setShowUploadDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Video
        </Button>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={publishedFilter} onValueChange={setPublishedFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="unpublished">Unpublished</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="text-center py-12">
            <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Videos Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || categoryFilter !== 'all' || publishedFilter !== 'all'
                ? 'No videos match your filters.'
                : 'Get started by adding your first video.'}
            </p>
            {!searchQuery && categoryFilter === 'all' && publishedFilter === 'all' && (
              <Button onClick={() => { setEditingVideo(null); setShowUploadDialog(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Order</TableHead>
                  <TableHead className="w-[80px]">Thumbnail</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVideos.map((video, index) => (
                  <TableRow key={video.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveUp(video, index)}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleMoveDown(video, index)}
                          disabled={index === filteredVideos.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {video.thumbnail_url ? (
                        <img 
                          src={video.thumbnail_url} 
                          alt={video.title}
                          className="w-16 h-10 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-10 bg-muted rounded flex items-center justify-center">
                          <Video className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="font-medium truncate">{video.title}</p>
                        {video.description && (
                          <p className="text-xs text-muted-foreground truncate">{video.description}</p>
                        )}
                        {isEmbedUrl(video.video_url) && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            External
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{video.category}</Badge>
                    </TableCell>
                    <TableCell>{video.duration || '-'}</TableCell>
                    <TableCell>
                      {video.project_name ? (
                        <Badge variant="outline">{video.project_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">All</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={video.is_published ? 'default' : 'secondary'}>
                        {video.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>{video.views || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePublish(video)}
                          title={video.is_published ? 'Unpublish' : 'Publish'}
                        >
                          {video.is_published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingVideo(video); setShowUploadDialog(true); }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingVideo(video)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Stats */}
        {!isLoading && videos.length > 0 && (
          <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
            <span>Total: {videos.length}</span>
            <span>Published: {videos.filter(v => v.is_published).length}</span>
            <span>Draft: {videos.filter(v => !v.is_published).length}</span>
          </div>
        )}
      </CardContent>

      {/* Upload/Edit Dialog */}
      <VideoUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        video={editingVideo}
        categories={categories}
        projects={projects}
        onSuccess={fetchVideos}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingVideo} onOpenChange={() => setDeletingVideo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingVideo?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default HelpVideoManager;
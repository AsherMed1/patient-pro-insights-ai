import React, { useState, useEffect } from 'react';
import { Play, Clock, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  category: string;
  duration: string | null;
}

interface VideoGalleryProps {
  searchQuery: string;
  projectName: string;
}

export const VideoGallery: React.FC<VideoGalleryProps> = ({ searchQuery, projectName }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      setIsLoading(true);
      let query = supabase
        .from('help_videos')
        .select('id, title, description, video_url, thumbnail_url, category, duration')
        .eq('is_published', true)
        .order('order_index', { ascending: true });

      query = query.or(`project_name.is.null,project_name.eq.${projectName}`);

      const { data, error } = await query;

      if (!error && data) {
        setVideos(data);
      }
      setIsLoading(false);
    };

    fetchVideos();
  }, [projectName]);

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedVideos = filteredVideos.reduce((acc, video) => {
    if (!acc[video.category]) {
      acc[video.category] = [];
    }
    acc[video.category].push(video);
    return acc;
  }, {} as Record<string, Video[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredVideos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <p className="text-muted-foreground">
          {searchQuery ? 'No videos found matching your search.' : 'No training videos available.'}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-4">
        {Object.entries(groupedVideos).map(([category, categoryVideos]) => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {category}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {categoryVideos.map((video) => (
                <button
                  key={video.id}
                  onClick={() => setSelectedVideo(video)}
                  className="group relative rounded-lg overflow-hidden bg-muted aspect-video hover:ring-2 hover:ring-primary transition-all"
                >
                  {video.thumbnail_url ? (
                    <img 
                      src={video.thumbnail_url} 
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                      <Play className="h-8 w-8 text-primary" />
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="h-5 w-5 text-primary ml-0.5" />
                    </div>
                  </div>

                  {/* Duration */}
                  {video.duration && (
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-[10px] rounded flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {video.duration}
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-2 space-y-1">
              {categoryVideos.map((video) => (
                <button
                  key={video.id + '-title'}
                  onClick={() => setSelectedVideo(video)}
                  className="w-full text-left"
                >
                  <p className="text-xs font-medium text-foreground hover:text-primary transition-colors line-clamp-1">
                    {video.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div className="absolute inset-0 bg-background z-10 flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-medium text-sm text-foreground line-clamp-1 pr-2">
              {selectedVideo.title}
            </h3>
            <button
              onClick={() => setSelectedVideo(null)}
              className="p-1 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 bg-black">
            <iframe
              src={selectedVideo.video_url}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          {selectedVideo.description && (
            <div className="p-3 border-t border-border">
              <p className="text-xs text-muted-foreground">
                {selectedVideo.description}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

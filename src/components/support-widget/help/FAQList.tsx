import React, { useState, useEffect } from 'react';
import { ChevronDown, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface FAQ {
  id: string;
  title: string;
  content: string;
  category: string;
  helpful_count: number;
  not_helpful_count: number;
}

interface FAQListProps {
  searchQuery: string;
  projectName: string;
}

export const FAQList: React.FC<FAQListProps> = ({ searchQuery, projectName }) => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchFaqs = async () => {
      setIsLoading(true);
      let query = supabase
        .from('help_articles')
        .select('id, title, content, category, helpful_count, not_helpful_count')
        .eq('is_published', true)
        .order('order_index', { ascending: true });

      // Filter by project or show global FAQs
      query = query.or(`project_name.is.null,project_name.eq.${projectName}`);

      const { data, error } = await query;

      if (!error && data) {
        setFaqs(data);
      }
      setIsLoading(false);
    };

    fetchFaqs();
  }, [projectName]);

  const filteredFaqs = faqs.filter(faq =>
    faq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedFaqs = filteredFaqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQ[]>);

  const handleVote = async (faqId: string, isHelpful: boolean) => {
    if (votedIds.has(faqId)) return;

    const field = isHelpful ? 'helpful_count' : 'not_helpful_count';
    const faq = faqs.find(f => f.id === faqId);
    if (!faq) return;

    await supabase
      .from('help_articles')
      .update({ [field]: (faq[field] || 0) + 1 })
      .eq('id', faqId);

    setVotedIds(prev => new Set(prev).add(faqId));
    setFaqs(prev => prev.map(f => 
      f.id === faqId ? { ...f, [field]: (f[field] || 0) + 1 } : f
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredFaqs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <p className="text-muted-foreground">
          {searchQuery ? 'No articles found matching your search.' : 'No help articles available.'}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {Object.entries(groupedFaqs).map(([category, categoryFaqs]) => (
        <div key={category}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {category}
          </h3>
          <div className="space-y-2">
            {categoryFaqs.map((faq) => (
              <div
                key={faq.id}
                className="border border-border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium text-sm text-foreground pr-2">
                    {faq.title}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform",
                      expandedId === faq.id && "rotate-180"
                    )}
                  />
                </button>
                
                {expandedId === faq.id && (
                  <div className="px-3 pb-3 border-t border-border">
                    <p className="text-sm text-muted-foreground py-3 whitespace-pre-wrap">
                      {faq.content}
                    </p>
                    
                    {/* Feedback */}
                    <div className="flex items-center gap-4 pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">Was this helpful?</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVote(faq.id, true)}
                          disabled={votedIds.has(faq.id)}
                          className={cn(
                            "p-1 rounded hover:bg-muted transition-colors",
                            votedIds.has(faq.id) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleVote(faq.id, false)}
                          disabled={votedIds.has(faq.id)}
                          className={cn(
                            "p-1 rounded hover:bg-muted transition-colors",
                            votedIds.has(faq.id) && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <ThumbsDown className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

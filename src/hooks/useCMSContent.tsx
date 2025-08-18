import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CMSContent {
  [key: string]: any;
}

export const useCMSContent = (keys: string[]) => {
  const [content, setContent] = useState<CMSContent>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', keys);

      if (error) throw error;

      const contentMap: CMSContent = {};
      data?.forEach((item) => {
        contentMap[item.key] = item.value;
      });

      setContent(contentMap);
    } catch (error: any) {
      console.error('Error fetching CMS content:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się załadować treści strony',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getContent = (key: string, fallback: any = {}) => {
    return content[key] || fallback;
  };

  return { content, loading, getContent };
};
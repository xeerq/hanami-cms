import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Service {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export const useServices = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch active services
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('*')
          .eq('is_active', true)
          .order('name');

        if (servicesError) throw servicesError;

        // Fetch active service categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('type', 'service')
          .eq('is_active', true)
          .order('name');

        if (categoriesError) throw categoriesError;

        setServices(servicesData || []);
        setCategories(categoriesData || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd podczas pobierania danych');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { services, categories, loading, error };
};
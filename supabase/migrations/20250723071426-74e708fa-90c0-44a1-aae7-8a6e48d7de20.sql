-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('product', 'service')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active categories" 
ON public.categories 
FOR SELECT 
USING ((is_active = true) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage categories" 
ON public.categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, type, description) VALUES
('Kosmetyki', 'product', 'Produkty kosmetyczne i pielęgnacyjne'),
('Olejki', 'product', 'Olejki aromaterapeutyczne i masażowe'),
('Suplementy', 'product', 'Suplementy diety'),
('Akcesoria', 'product', 'Akcesoria spa i masażowe'),
('Inne', 'product', 'Pozostałe produkty'),
('Masaże', 'service', 'Usługi masażowe'),
('Terapie', 'service', 'Terapie holistyczne'),
('Pielęgnacja', 'service', 'Zabiegi pielęgnacyjne'),
('Relaks', 'service', 'Zabiegi relaksacyjne');
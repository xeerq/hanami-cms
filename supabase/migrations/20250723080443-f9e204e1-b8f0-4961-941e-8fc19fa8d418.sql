-- Tabela dla stron
CREATE TABLE public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabela dla elementów globalnych (header, footer, kontakt)
CREATE TABLE public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tabela dla członków zespołu
CREATE TABLE public.team_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  position TEXT NOT NULL,
  bio TEXT,
  image_url TEXT,
  email TEXT,
  phone TEXT,
  social_links JSONB DEFAULT '{}',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Włącz RLS dla wszystkich tabel
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Polityki RLS dla pages
CREATE POLICY "Anyone can view published pages" 
ON public.pages 
FOR SELECT 
USING (is_published = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage pages" 
ON public.pages 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Polityki RLS dla site_settings
CREATE POLICY "Anyone can view site settings" 
ON public.site_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage site settings" 
ON public.site_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Polityki RLS dla team_members
CREATE POLICY "Anyone can view active team members" 
ON public.team_members 
FOR SELECT 
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage team members" 
ON public.team_members 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger dla automatycznego uaktualniania updated_at
CREATE TRIGGER update_pages_updated_at
BEFORE UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
BEFORE UPDATE ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Wstaw domyślne ustawienia strony
INSERT INTO public.site_settings (key, value, description) VALUES
('header', '{"title": "Salon Masażu", "subtitle": "Profesjonalne masaże w sercu miasta"}', 'Ustawienia nagłówka strony'),
('footer', '{"company": "Salon Masażu", "address": "ul. Przykładowa 123, 00-000 Warszawa", "phone": "+48 123 456 789", "email": "kontakt@salonmasazu.pl", "social": {"facebook": "", "instagram": ""}}', 'Ustawienia stopki strony'),
('contact', '{"address": "ul. Przykładowa 123, 00-000 Warszawa", "phone": "+48 123 456 789", "email": "kontakt@salonmasazu.pl", "hours": "Pon-Pt: 9:00-18:00, Sob: 9:00-15:00"}', 'Informacje kontaktowe');

-- Wstaw domyślne strony
INSERT INTO public.pages (slug, title, content, meta_description) VALUES
('about', 'O nas', '{"hero": {"title": "O naszym salonie", "subtitle": "Profesjonalne masaże w spokojnej atmosferze"}, "sections": [{"type": "text", "content": "Nasz salon masażu oferuje szeroką gamę profesjonalnych usług..."}]}', 'Poznaj nasz salon masażu i zespół profesjonalistów'),
('contact', 'Kontakt', '{"hero": {"title": "Skontaktuj się z nami", "subtitle": "Jesteśmy tutaj, aby Ci pomóc"}, "sections": [{"type": "contact_form", "title": "Napisz do nas"}]}', 'Skontaktuj się z naszym salonem masażu'),
('services', 'Usługi', '{"hero": {"title": "Nasze usługi", "subtitle": "Profesjonalne masaże dostosowane do Twoich potrzeb"}, "sections": [{"type": "services_list"}]}', 'Poznaj pełną ofertę naszych usług masażowych');
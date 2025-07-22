-- Utwórz tabelę łączącą terapeutów z usługami
CREATE TABLE public.therapist_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  therapist_id UUID NOT NULL,
  service_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(therapist_id, service_id)
);

-- Dodaj klucze obce (nie linkujemy bezpośrednio do auth.users, tylko do naszych tabel)
ALTER TABLE public.therapist_services 
ADD CONSTRAINT fk_therapist_services_therapist 
FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE;

ALTER TABLE public.therapist_services 
ADD CONSTRAINT fk_therapist_services_service 
FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

-- Włącz RLS
ALTER TABLE public.therapist_services ENABLE ROW LEVEL SECURITY;

-- Polisy RLS dla therapist_services
CREATE POLICY "Admins can manage therapist services" 
ON public.therapist_services 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view therapist services" 
ON public.therapist_services 
FOR SELECT 
USING (true);

-- Dodaj indeks dla lepszej wydajności
CREATE INDEX idx_therapist_services_therapist_id ON public.therapist_services(therapist_id);
CREATE INDEX idx_therapist_services_service_id ON public.therapist_services(service_id);
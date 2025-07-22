-- Insert sample services (without ON CONFLICT since there's no unique constraint on name)
INSERT INTO public.services (name, description, duration, price, category) 
SELECT 'Masaż relaksacyjny', 'Tradycyjny masaż inspirowany japońską filozofią zen', 60, 200, 'Masaże'
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Masaż relaksacyjny');

INSERT INTO public.services (name, description, duration, price, category) 
SELECT 'Masaż terapeutyczny', 'Profesjonalny masaż leczniczy dla zdrowia kręgosłupa', 90, 280, 'Masaże'
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Masaż terapeutyczny');

INSERT INTO public.services (name, description, duration, price, category) 
SELECT 'Masaż hot stone', 'Relaksujący masaż z użyciem rozgrzanych kamieni', 75, 350, 'Masaże'
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Masaż hot stone');

INSERT INTO public.services (name, description, duration, price, category) 
SELECT 'Peeling całego ciała', 'Głęboko oczyszczający peeling z naturalnymi składnikami', 45, 180, 'Pielęgnacja'
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Peeling całego ciała');

INSERT INTO public.services (name, description, duration, price, category) 
SELECT 'Zabieg nawilżający twarzy', 'Intensywnie nawilżający zabieg przeciwstarzeniowy', 60, 250, 'Pielęgnacja'
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Zabieg nawilżający twarzy');

INSERT INTO public.services (name, description, duration, price, category) 
SELECT 'Aromaterapia', 'Sesja relaksacyjna z użyciem olejków eterycznych', 45, 150, 'Relaks'
WHERE NOT EXISTS (SELECT 1 FROM public.services WHERE name = 'Aromaterapia');

-- Insert sample therapists
INSERT INTO public.therapists (name, specialization, experience, bio) 
SELECT 'Anna Kowalska', 'Masaże terapeutyczne i sportowe', '8 lat doświadczenia w masażu leczniczym', 'Certyfikowana masażystka specjalizująca się w terapii bólu kręgosłupa i rehabilitacji'
WHERE NOT EXISTS (SELECT 1 FROM public.therapists WHERE name = 'Anna Kowalska');

INSERT INTO public.therapists (name, specialization, experience, bio) 
SELECT 'Maria Nowak', 'Masaże relaksacyjne i aromaterapia', '5 lat doświadczenia w spa', 'Ekspertka w zakresie masaży relaksacyjnych i technik aromaterapeutycznych'
WHERE NOT EXISTS (SELECT 1 FROM public.therapists WHERE name = 'Maria Nowak');

INSERT INTO public.therapists (name, specialization, experience, bio) 
SELECT 'Katarzyna Wiśniewska', 'Pielęgnacja twarzy i ciała', '6 lat w kosmetologii', 'Kosmetologa z pasją do naturalnych metod pielęgnacji skóry'
WHERE NOT EXISTS (SELECT 1 FROM public.therapists WHERE name = 'Katarzyna Wiśniewska');

INSERT INTO public.therapists (name, specialization, experience, bio) 
SELECT 'Magdalena Dąbrowska', 'Masaże sportowe i głębokie', '10 lat doświadczenia', 'Specjalistka od masaży sportowych i terapii punktów spustowych'
WHERE NOT EXISTS (SELECT 1 FROM public.therapists WHERE name = 'Magdalena Dąbrowska');
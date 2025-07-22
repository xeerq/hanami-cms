-- Insert sample services
INSERT INTO public.services (name, description, duration, price, category) VALUES
('Masaż relaksacyjny', 'Tradycyjny masaż inspirowany japońską filozofią zen', 60, 200, 'Masaże'),
('Masaż terapeutyczny', 'Profesjonalny masaż leczniczy dla zdrowia kręgosłupa', 90, 280, 'Masaże'),
('Masaż hot stone', 'Relaksujący masaż z użyciem rozgrzanych kamieni', 75, 350, 'Masaże'),
('Peeling całego ciała', 'Głęboko oczyszczający peeling z naturalnymi składnikami', 45, 180, 'Pielęgnacja'),
('Zabieg nawilżający twarzy', 'Intensywnie nawilżający zabieg przeciwstarzeniowy', 60, 250, 'Pielęgnacja'),
('Aromaterapia', 'Sesja relaksacyjna z użyciem olejków eterycznych', 45, 150, 'Relaks')
ON CONFLICT (name) DO NOTHING;

-- Insert sample therapists
INSERT INTO public.therapists (name, specialization, experience, bio) VALUES
('Anna Kowalska', 'Masaże terapeutyczne i sportowe', '8 lat doświadczenia w masażu leczniczym', 'Certyfikowana masażystka specjalizująca się w terapii bólu kręgosłupa i rehabilitacji'),
('Maria Nowak', 'Masaże relaksacyjne i aromaterapia', '5 lat doświadczenia w spa', 'Ekspertka w zakresie masaży relaksacyjnych i technik aromaterapeutycznych'),
('Katarzyna Wiśniewska', 'Pielęgnacja twarzy i ciała', '6 lat w kosmetologii', 'Kosmetologa z pasją do naturalnych metod pielęgnacji skóry'),
('Magdalena Dąbrowska', 'Masaże sportowe i głębokie', '10 lat doświadczenia', 'Specjalistka od masaży sportowych i terapii punktów spustowych')
ON CONFLICT (name) DO NOTHING;
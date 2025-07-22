-- Enable RLS globally
ALTER DATABASE postgres SET row_level_security = on;

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create therapists table
CREATE TABLE public.therapists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  specialization TEXT,
  experience TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create services table
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL, -- in minutes
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  therapist_id UUID NOT NULL REFERENCES public.therapists(id),
  service_id UUID NOT NULL REFERENCES public.services(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(therapist_id, appointment_date, appointment_time)
);

-- Create products table for shop
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  shipping_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.therapists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for therapists (public read)
CREATE POLICY "Anyone can view active therapists" 
ON public.therapists FOR SELECT 
USING (is_active = true);

-- RLS Policies for services (public read)
CREATE POLICY "Anyone can view active services" 
ON public.services FOR SELECT 
USING (is_active = true);

-- RLS Policies for appointments
CREATE POLICY "Users can view their own appointments" 
ON public.appointments FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments" 
ON public.appointments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments" 
ON public.appointments FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for products (public read)
CREATE POLICY "Anyone can view active products" 
ON public.products FOR SELECT 
USING (is_active = true);

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" 
ON public.orders FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for order_items (through orders)
CREATE POLICY "Users can view their own order items" 
ON public.order_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
));

CREATE POLICY "Users can create their own order items" 
ON public.order_items FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.orders 
  WHERE orders.id = order_items.order_id 
  AND orders.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_therapists_updated_at
    BEFORE UPDATE ON public.therapists
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data for therapists
INSERT INTO public.therapists (name, specialization, experience, bio) VALUES
('Anna Kowalska', 'Masaże terapeutyczne, hot stone', '8 lat doświadczenia', 'Specjalistka z wieloletnim doświadczeniem w masażach terapeutycznych i technikach relaksacyjnych.'),
('Maria Nowak', 'Masaże relaksacyjne, pielęgnacja twarzy', '5 lat doświadczenia', 'Ekspertka w dziedzinie masaży relaksacyjnych i zabiegów kosmetycznych inspirowanych japońską tradycją.');

-- Insert sample data for services
INSERT INTO public.services (name, description, duration, price, category) VALUES
('Masaż relaksacyjny', 'Tradycyjny masaż inspirowany japońską filozofią zen. Delikatne ruchy i naturalne olejki przeniosą Cię w stan głębokiego relaksu.', 60, 200.00, 'Masaże'),
('Masaż terapeutyczny', 'Profesjonalny masaż leczniczy dla zdrowia kręgosłupa i stawów. Łączy techniki szwedzkie z metodami orientalnymi.', 90, 280.00, 'Masaże'),
('Masaż hot stone', 'Relaksujący masaż z użyciem rozgrzanych kamieni bazaltowych. Ciepło głęboko penetruje mięśnie.', 75, 350.00, 'Masaże'),
('Masaż aromaterapeutyczny', 'Masaż z użyciem wyselekcjonowanych olejków eterycznych dostosowanych do Twoich potrzeb.', 60, 220.00, 'Masaże'),
('Zabieg nawilżający twarzy', 'Intensywnie nawilżający zabieg z użyciem japońskich kosmetyków premium.', 45, 180.00, 'Pielęgnacja twarzy'),
('Masaż prenatalny', 'Delikatny masaż dedykowany przyszłym mamom. Bezpieczny i relaksujący podczas ciąży.', 50, 200.00, 'Specjalistyczne');

-- Insert sample data for products
INSERT INTO public.products (name, description, price, category, stock_quantity, image_url) VALUES
('Olejek do masażu Sakura', 'Luksusowy olejek do masażu o zapachu kwitnących wiśni', 89.00, 'Olejki', 15, '/lovable-uploads/6abfd03e-faab-45ef-8c3f-8eb2cf6b0ea7.png'),
('Krem regenerujący Hanami', 'Intensywnie nawilżający krem do ciała z ekstraktami roślin', 65.00, 'Kosmetyki', 20, '/lovable-uploads/3140ba04-33e9-4565-bb1c-d1c585d11e13.png'),
('Zestaw kamieni bazaltowych', 'Profesjonalne kamienie do masażu hot stone', 199.00, 'Akcesoria', 8, '/lovable-uploads/36929f8b-ac5b-4aed-9ac9-ad38a48028a6.png'),
('Świeca aromaterapeutyczna', 'Naturalna świeca sojowa o zapachu relaksującym', 45.00, 'Aromaterapia', 25, '/lovable-uploads/a3bc1f9a-ac00-4ccb-8ad5-7532935671d9.png'),
('Olejek eteryczny lawenda', '100% naturalny olejek eteryczny z lawendy', 39.00, 'Olejki', 0, '/lovable-uploads/6abfd03e-faab-45ef-8c3f-8eb2cf6b0ea7.png'),
('Masażer bambusowy', 'Tradycyjny bambusowy masażer do punktowego masażu', 79.00, 'Akcesoria', 12, '/lovable-uploads/3140ba04-33e9-4565-bb1c-d1c585d11e13.png');
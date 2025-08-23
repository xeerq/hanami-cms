-- Create a storage bucket for service and product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-service-images', 'product-service-images', true);

-- Create policies for the bucket
CREATE POLICY "Allow public read access to product and service images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-service-images');

CREATE POLICY "Allow authenticated users to upload product and service images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'product-service-images' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN ('products', 'services')
);

CREATE POLICY "Allow authenticated users to update their uploaded images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'product-service-images' AND 
  auth.role() = 'authenticated'
);
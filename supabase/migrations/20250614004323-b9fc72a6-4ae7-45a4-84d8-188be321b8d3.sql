
-- First, let's handle existing NULL user_id values
-- We'll delete rows with NULL user_id since they can't be associated with any user
DELETE FROM public.processing_history WHERE user_id IS NULL;

-- Also delete any orphaned processing_logs that reference deleted processing records
DELETE FROM public.processing_logs 
WHERE processing_id NOT IN (SELECT id FROM public.processing_history);

-- Now we can safely make user_id NOT NULL
ALTER TABLE public.processing_history ALTER COLUMN user_id SET NOT NULL;

-- Drop existing policies for processing_history
DROP POLICY IF EXISTS "Users can view their own processing history" ON public.processing_history;
DROP POLICY IF EXISTS "Users can create processing records" ON public.processing_history;
DROP POLICY IF EXISTS "Users can update their own processing records" ON public.processing_history;

-- Create new secure policies for processing_history (require authentication)
CREATE POLICY "Authenticated users can view their own processing history" 
  ON public.processing_history 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create processing records" 
  ON public.processing_history 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own processing records" 
  ON public.processing_history 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Drop existing policies for processing_logs
DROP POLICY IF EXISTS "Users can view logs for their processing" ON public.processing_logs;
DROP POLICY IF EXISTS "System can create logs" ON public.processing_logs;

-- Create new secure policies for processing_logs (require authentication)
CREATE POLICY "Authenticated users can view logs for their processing" 
  ON public.processing_logs 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.processing_history 
    WHERE id = processing_logs.processing_id 
    AND auth.uid() = user_id
  ));

CREATE POLICY "Authenticated users can create logs" 
  ON public.processing_logs 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.processing_history 
    WHERE id = processing_logs.processing_id 
    AND auth.uid() = user_id
  ));

-- Update storage policies to require authentication (drop existing and recreate)
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- Create new secure storage policies (require authentication)
CREATE POLICY "Authenticated users can upload their own documents" 
  ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view their own documents" 
  ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update their own documents" 
  ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete their own documents" 
  ON storage.objects 
  FOR DELETE 
  USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1] AND auth.uid() IS NOT NULL);

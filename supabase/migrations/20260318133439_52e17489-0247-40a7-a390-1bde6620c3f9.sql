
-- Create storage bucket for task materials
INSERT INTO storage.buckets (id, name, public) VALUES ('task_materials', 'task_materials', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for task_materials bucket
CREATE POLICY "Authenticated users can upload task materials"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task_materials');

CREATE POLICY "Anyone can view task materials"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task_materials');

CREATE POLICY "Authenticated users can delete task materials"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task_materials');

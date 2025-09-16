-- Create voucher templates table
CREATE TABLE public.voucher_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  design_config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voucher_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all voucher templates"
ON public.voucher_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active templates"
ON public.voucher_templates
FOR SELECT
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

-- Add template_id to vouchers table
ALTER TABLE public.vouchers ADD COLUMN template_id UUID REFERENCES public.voucher_templates(id);

-- Create index for performance
CREATE INDEX idx_voucher_templates_active ON public.voucher_templates(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_voucher_templates_updated_at
BEFORE UPDATE ON public.voucher_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default template
INSERT INTO public.voucher_templates (name, description, design_config, is_default, is_active)
VALUES (
  'Klasyczny Hanami SPA',
  'Tradycyjny szablon bonów Hanami SPA',
  '{
    "layout": "classic",
    "colors": {
      "primary": "#000000",
      "secondary": "#666666",
      "accent": "#8B4513"
    },
    "fonts": {
      "header": "Times New Roman",
      "body": "Times New Roman",
      "sizes": {
        "title": "16px",
        "subtitle": "12px",
        "content": "13px",
        "footer": "11px"
      }
    },
    "spacing": {
      "padding": "30px",
      "margins": "20px",
      "lineHeight": "1.4"
    },
    "elements": {
      "showLogo": true,
      "showBorder": true,
      "borderStyle": "solid",
      "borderWidth": "2px"
    }
  }',
  true,
  true
);
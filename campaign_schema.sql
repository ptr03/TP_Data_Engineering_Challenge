-- campaign_schema.sql
-- Normalized schema for campaigns + daily metrics

CREATE TABLE IF NOT EXISTS public.campaigns (
  campaign_id text PRIMARY KEY,
  campaign_name text NOT NULL,
  campaign_type text NOT NULL,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.campaign_metrics (
  id bigserial PRIMARY KEY,
  campaign_id text NOT NULL REFERENCES public.campaigns(campaign_id) ON DELETE CASCADE,
  date date NOT NULL,
  impressions bigint default 0,
  clicks bigint default 0,
  cost numeric(14,2) default 0,
  conversions bigint default 0,
  conversion_value numeric(14,2) default 0,
  created_at timestamptz default now(),
  CONSTRAINT uk_campaign_metrics_campaign_date UNIQUE (campaign_id, date)
);

CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON public.campaign_metrics(date);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign ON public.campaign_metrics(campaign_id);

-- Trigger to update updated_at on campaigns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER trigger_update_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

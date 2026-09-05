-- Migration: add ad_scripts JSONB column to store multiple ad script snippets
-- Run this in Supabase SQL editor

ALTER TABLE ad_settings
ADD COLUMN IF NOT EXISTS ad_scripts JSONB DEFAULT '[]'::jsonb;

-- Backfill existing ad_url into ad_scripts if ad_scripts is empty
UPDATE ad_settings
SET ad_scripts = jsonb_build_array(ad_url)
WHERE (ad_url IS NOT NULL AND ad_url <> '') AND (ad_scripts IS NULL OR jsonb_array_length(ad_scripts) = 0);

-- Keep ad_url for backward compatibility. Consider removing later after rollout.

-- Fix OTP expiry to recommended settings
-- This updates the auth configuration to use shorter OTP expiry times
UPDATE auth.config SET value = '3600' WHERE parameter = 'OTP_EXPIRY';
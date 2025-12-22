-- Add Stripe account information to profiles table
ALTER TABLE public.profiles 
ADD COLUMN stripe_account_id TEXT,
ADD COLUMN stripe_account_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN bank_account_last4 TEXT,
ADD COLUMN bank_routing_number_last4 TEXT;

-- Update withdrawal_requests table to include more details
ALTER TABLE public.withdrawal_requests 
ADD COLUMN bank_account_last4 TEXT,
ADD COLUMN expected_arrival_date DATE;
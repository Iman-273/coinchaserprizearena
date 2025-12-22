-- Fix security vulnerability: Completely rebuild orders table RLS policies
-- Drop all existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Only platform admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Admin can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admin can update orders" ON public.orders;
DROP POLICY IF EXISTS "Platform admins can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Platform admins can update orders" ON public.orders;

-- Create secure policies that restrict access to platform admins only
CREATE POLICY "Platform admins can view orders" 
ON public.orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND platform_access = true
  )
);

CREATE POLICY "Platform admins can insert orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND platform_access = true
  )
);

CREATE POLICY "Platform admins can update orders" 
ON public.orders 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND platform_access = true
  )
);

-- Add delete policy for completeness
CREATE POLICY "Platform admins can delete orders" 
ON public.orders 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND platform_access = true
  )
);
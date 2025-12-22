-- Fix security vulnerability: Restrict orders table access to admins only
-- Remove the overly permissive policy that allows all users to view orders
DROP POLICY IF EXISTS "Users can view all orders" ON public.orders;

-- Create a new restrictive policy that only allows users with platform_access to view orders
-- This assumes platform_access indicates admin status
CREATE POLICY "Only platform admins can view orders" 
ON public.orders 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND platform_access = true
  )
);

-- Also restrict insert/update policies to be more explicit about admin access
DROP POLICY IF EXISTS "Admin can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admin can update orders" ON public.orders;

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
-- Add missing RLS policies for orders table
CREATE POLICY "Users can view all orders" ON public.orders
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert orders" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update orders" ON public.orders
  FOR UPDATE USING (true);

-- Add missing RLS policies for products table  
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Admin can insert products" ON public.products
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update products" ON public.products
  FOR UPDATE USING (true);

CREATE POLICY "Admin can delete products" ON public.products
  FOR DELETE USING (true);
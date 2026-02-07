-- Add DELETE policy for admin_pins so founders can delete their PIN during recovery
CREATE POLICY "Founders can delete their PIN" 
ON public.admin_pins 
FOR DELETE 
USING (auth.uid() = user_id AND is_admin(auth.uid()));
-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by everyone (so users can see who to send messages to)
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create messages table with token-based privacy
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_alias TEXT NOT NULL,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mood_emoji TEXT,
  spotify_track_id TEXT,
  spotify_track_name TEXT,
  spotify_artist TEXT,
  spotify_album_art TEXT,
  spotify_uri TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Recipients can view their messages
CREATE POLICY "Recipients can view their messages"
ON public.messages FOR SELECT
USING (auth.uid() = recipient_id);

-- Senders can view messages they sent
CREATE POLICY "Senders can view their sent messages"
ON public.messages FOR SELECT
USING (auth.uid() = sender_id);

-- Users can create messages
CREATE POLICY "Users can create messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Recipients can delete messages
CREATE POLICY "Recipients can delete messages"
ON public.messages FOR DELETE
USING (auth.uid() = recipient_id);

-- Create reactions table
CREATE TABLE public.reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_token UUID NOT NULL REFERENCES messages(token_id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'funny', 'touching', 'surprising', 'appreciated', 'intriguing')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on reactions
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Anyone involved in the message can view reactions
CREATE POLICY "Message participants can view reactions"
ON public.reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages 
    WHERE messages.token_id = reactions.message_token 
    AND (messages.sender_id = auth.uid() OR messages.recipient_id = auth.uid())
  )
);

-- Only recipients can create reactions
CREATE POLICY "Recipients can create reactions"
ON public.reactions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages 
    WHERE messages.token_id = message_token 
    AND messages.recipient_id = auth.uid()
  )
);

-- Create replies table for anonymous two-way chat
CREATE TABLE public.replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_token UUID NOT NULL REFERENCES messages(token_id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('original_sender', 'recipient')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on replies
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;

-- Message participants can view replies
CREATE POLICY "Message participants can view replies"
ON public.replies FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages 
    WHERE messages.token_id = replies.message_token 
    AND (messages.sender_id = auth.uid() OR messages.recipient_id = auth.uid())
  )
);

-- Message participants can create replies
CREATE POLICY "Message participants can create replies"
ON public.replies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messages 
    WHERE messages.token_id = message_token 
    AND (messages.sender_id = auth.uid() OR messages.recipient_id = auth.uid())
  )
);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.reactions;

-- Enable realtime for replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.replies;
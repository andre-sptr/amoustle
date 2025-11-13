import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import SpotifySearch from "@/components/SpotifySearch";

interface Track {
  id: string;
  name: string;
  artist: string;
  album_art: string;
  uri: string;
  preview_url: string | null;
}

const Compose = () => {
  const navigate = useNavigate();
  const { recipientId } = useParams();
  const [recipientName, setRecipientName] = useState("");
  const [alias, setAlias] = useState("");
  const [content, setContent] = useState("");
  const [moodEmoji, setMoodEmoji] = useState("💙");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(false);

  const moodEmojis = ["💙", "💌", "🌊", "✨", "🫶", "💭", "🌸", "🦋"];

  useEffect(() => {
    checkAuth();
    fetchRecipient();
  }, [recipientId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchRecipient = async () => {
    if (!recipientId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", recipientId)
        .single();

      if (error) throw error;
      setRecipientName(data.display_name);
    } catch (error) {
      toast.error("Failed to load recipient");
      navigate("/");
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!alias.trim()) {
      toast.error("Please enter an alias");
      return;
    }

    if (!content.trim()) {
      toast.error("Please write a message");
      return;
    }

    setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { error } = await supabase.from("messages").insert({
        sender_id: session.user.id,
        recipient_id: recipientId,
        sender_alias: alias.trim(),
        content: content.trim(),
        mood_emoji: moodEmoji,
        spotify_track_id: selectedTrack?.id || null,
        spotify_track_name: selectedTrack?.name || null,
        spotify_artist: selectedTrack?.artist || null,
        spotify_album_art: selectedTrack?.album_art || null,
        spotify_uri: selectedTrack?.uri || null,
      });

      if (error) throw error;

      toast.success("Your bottle has been sent! 🌊");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-wave relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-ocean/5 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-secondary/10 to-transparent animate-wave" />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-6 transition-smooth hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="max-w-2xl mx-auto">
            <Card className="p-8 glass-bottle">
              <h1 className="text-3xl font-bold text-primary mb-2">
                Send a Bottle to {recipientName}
              </h1>
              <p className="text-muted-foreground mb-8">
                Your identity will remain anonymous. Choose your alias wisely.
              </p>

              <form onSubmit={handleSend} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="alias">Your Alias</Label>
                  <Input
                    id="alias"
                    type="text"
                    placeholder="A secret friend, Moonlight whisper, etc."
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    required
                    maxLength={50}
                    className="transition-smooth"
                  />
                  <p className="text-xs text-muted-foreground">
                    This is how {recipientName} will know you (not your real name)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Mood Emoji</Label>
                  <div className="flex gap-2 flex-wrap">
                    {moodEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setMoodEmoji(emoji)}
                        className={`text-3xl p-2 rounded-lg transition-bounce hover:scale-110 ${
                          moodEmoji === emoji
                            ? "bg-primary/20 ring-2 ring-primary"
                            : "bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Your Message</Label>
                  <Textarea
                    id="content"
                    placeholder="Share your thoughts, feelings, or just say hello..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    rows={8}
                    maxLength={2000}
                    className="resize-none transition-smooth"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {content.length}/2000
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Tambah Lagu (Opsional)</Label>
                  <SpotifySearch
                    selectedTrack={selectedTrack}
                    onSelectTrack={setSelectedTrack}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lagu akan muncul dengan player di pesan 🎧
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-ocean hover:bg-ocean-dark transition-smooth"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Bottle"}
                  <Send className="h-4 w-4 ml-2" />
                </Button>
              </form>
            </Card>

            <p className="mt-6 text-center text-sm text-muted-foreground italic">
              "Let your heart drift across the sea."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Compose;

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  token_id: string;
  sender_id: string;
  sender_alias: string;
  recipient_id: string;
  content: string;
  mood_emoji: string;
  spotify_track_name: string | null;
  spotify_artist: string | null;
  spotify_album_art: string | null;
  spotify_uri: string | null;
  created_at: string;
}

interface Reply {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
}

const Thread = () => {
  const navigate = useNavigate();
  const { tokenId } = useParams();
  const [message, setMessage] = useState<Message | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [newReply, setNewReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchThread();

    // Subscribe to new replies
    const channel = supabase
      .channel(`thread-${tokenId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "replies",
          filter: `message_token=eq.${tokenId}`,
        },
        (payload) => {
          console.log("New reply received:", payload);
          fetchReplies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tokenId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(session.user.id);
  };

  const fetchThread = async () => {
    try {
      const { data: messageData, error: messageError } = await supabase
        .from("messages")
        .select("*")
        .eq("token_id", tokenId)
        .single();

      if (messageError) throw messageError;
      setMessage(messageData);

      await fetchReplies();
    } catch (error: any) {
      toast.error("Gagal memuat percakapan");
      navigate("/inbox");
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async () => {
    const { data, error } = await supabase
      .from("replies")
      .select("*")
      .eq("message_token", tokenId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching replies:", error);
    } else {
      setReplies(data || []);
    }
  };

  const handleSendReply = async () => {
    if (!newReply.trim() || !message || !currentUserId) return;

    setSending(true);
    try {
      const senderType = currentUserId === message.sender_id ? "original_sender" : "recipient";

      const { error } = await supabase.from("replies").insert({
        message_token: message.token_id,
        sender_type: senderType,
        content: newReply.trim(),
      });

      if (error) throw error;

      setNewReply("");
      toast.success("Balasan terkirim! 💌");
    } catch (error: any) {
      toast.error("Gagal mengirim balasan");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-wave flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!message) return null;

  const isRecipient = currentUserId === message.recipient_id;

  return (
    <div className="min-h-screen bg-wave relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-ocean/5 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-secondary/10 to-transparent animate-wave" />
      </div>

      <div className="relative z-10">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/inbox")}
            className="mb-6 transition-smooth hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Kembali
          </Button>

          <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-primary text-center mb-8">
              Percakapan 💬
            </h1>

            {/* Original Message */}
            <Card className="p-6 glass-bottle">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">{message.mood_emoji}</span>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">
                    {isRecipient ? `Dari: ${message.sender_alias}` : "Pesan Anda"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(message.created_at), "PPp")}
                  </p>
                </div>
              </div>

              <p className="text-foreground whitespace-pre-wrap mb-4">{message.content}</p>

              {/* Spotify Player */}
              {message.spotify_uri && (
                <div className="mt-4">
                  <iframe
                    src={`https://open.spotify.com/embed/track/${message.spotify_uri.split(':')[2]}?utm_source=generator`}
                    width="100%"
                    height="152"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="rounded-lg"
                  />
                </div>
              )}
            </Card>

            {/* Replies */}
            {replies.map((reply) => {
              const isMyReply = 
                (reply.sender_type === "original_sender" && currentUserId === message.sender_id) ||
                (reply.sender_type === "recipient" && currentUserId === message.recipient_id);

              return (
                <Card
                  key={reply.id}
                  className={`p-4 glass-bottle ${
                    isMyReply ? "ml-8 bg-primary/5" : "mr-8"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-semibold text-muted-foreground">
                      {isMyReply ? "Anda" : "Mereka"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(reply.created_at), "PPp")}
                    </span>
                  </div>
                  <p className="text-foreground whitespace-pre-wrap">{reply.content}</p>
                </Card>
              );
            })}

            {/* Reply Input */}
            <Card className="p-4 glass-bottle sticky bottom-4">
              <div className="space-y-3">
                <Textarea
                  placeholder="Tulis balasan Anda..."
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  className="resize-none transition-smooth"
                />
                <div className="flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">{newReply.length}/1000</p>
                  <Button
                    onClick={handleSendReply}
                    disabled={sending || !newReply.trim()}
                    className="bg-ocean hover:bg-ocean-dark transition-smooth"
                  >
                    {sending ? "Mengirim..." : "Kirim"}
                    <Send className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Thread;

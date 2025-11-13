import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Heart, Laugh, Frown, Zap, ThumbsUp, Lightbulb, Trash2, MessageCircle } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  token_id: string;
  sender_id: string;
  recipient_id: string;
  sender_alias: string;
  content: string;
  mood_emoji: string;
  spotify_track_name: string | null;
  spotify_artist: string | null;
  spotify_uri: string | null;
  created_at: string;
}

interface Reaction {
  id: string;
  reaction_type: string;
}

const reactionIcons = {
  like: Heart,
  funny: Laugh,
  touching: Frown,
  surprising: Zap,
  appreciated: ThumbsUp,
  intriguing: Lightbulb,
};

const reactionLabels = {
  like: "Like",
  funny: "Funny",
  touching: "Touching",
  surprising: "Surprising",
  appreciated: "Appreciated",
  intriguing: "Intriguing",
};

const Inbox = () => {
  const navigate = useNavigate();
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [sentMessages, setSentMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchMessages();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(session.user.id);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  };

  const fetchMessages = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch received messages
      const { data: receivedData, error: receivedError } = await supabase
        .from("messages")
        .select("*")
        .eq("recipient_id", session.user.id)
        .order("created_at", { ascending: false });

      if (receivedError) throw receivedError;
      setReceivedMessages(receivedData || []);

      // Fetch sent messages
      const { data: sentData, error: sentError } = await supabase
        .from("messages")
        .select("*")
        .eq("sender_id", session.user.id)
        .order("created_at", { ascending: false });

      if (sentError) throw sentError;
      setSentMessages(sentData || []);

      // Combine all message tokens
      const allMessages = [...(receivedData || []), ...(sentData || [])];
      
      if (allMessages.length > 0) {
        const tokens = allMessages.map((m) => m.token_id);
        
        // Fetch reactions for all messages
        const { data: reactionsData, error: reactionsError } = await supabase
          .from("reactions")
          .select("*")
          .in("message_token", tokens);

        if (reactionsError) throw reactionsError;

        const reactionsByToken: Record<string, Reaction[]> = {};
        reactionsData?.forEach((reaction) => {
          if (!reactionsByToken[reaction.message_token]) {
            reactionsByToken[reaction.message_token] = [];
          }
          reactionsByToken[reaction.message_token].push(reaction);
        });
        setReactions(reactionsByToken);

        // Fetch reply counts for all messages
        const { data: repliesData, error: repliesError } = await supabase
          .from("replies")
          .select("message_token")
          .in("message_token", tokens);

        if (repliesError) throw repliesError;

        const countsByToken: Record<string, number> = {};
        repliesData?.forEach((reply) => {
          countsByToken[reply.message_token] = (countsByToken[reply.message_token] || 0) + 1;
        });
        setReplyCounts(countsByToken);
      }
    } catch (error: any) {
      toast.error("Gagal memuat pesan");
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (messageToken: string, reactionType: string) => {
    try {
      const { error } = await supabase.from("reactions").insert({
        message_token: messageToken,
        reaction_type: reactionType,
      });

      if (error) throw error;
      toast.success("Reaction sent! 💙");
      fetchMessages();
    } catch (error: any) {
      toast.error(error.message || "Failed to send reaction");
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
      toast.success("Message deleted");
      fetchMessages();
    } catch (error: any) {
      toast.error("Failed to delete message");
    }
  };

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
            onClick={() => navigate("/")}
            className="mb-6 transition-smooth hover:scale-105"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold text-primary mb-8 text-center">
              Kotak Pesan 💌
            </h1>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <Tabs defaultValue="received" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="received">Diterima ({receivedMessages.length})</TabsTrigger>
                  <TabsTrigger value="sent">Terkirim ({sentMessages.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="received">
                  {receivedMessages.length === 0 ? (
                    <Card className="p-12 text-center glass-bottle">
                      <p className="text-muted-foreground">
                        Belum ada pesan. Botol pesan akan muncul di sini. 🌊
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {receivedMessages.map((message) => (
                        <Card
                          key={message.id}
                          className="p-6 glass-bottle hover:scale-[1.02] transition-bounce animate-float"
                          style={{
                            animationDelay: `${Math.random() * 2}s`,
                          }}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">{message.mood_emoji}</span>
                                <h3 className="text-lg font-semibold text-foreground">
                                  Dari: {message.sender_alias}
                                </h3>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(message.created_at), "PPp")}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(message.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <p className="text-foreground whitespace-pre-wrap mb-4">{message.content}</p>

                          {message.spotify_uri && (
                            <div className="mb-4">
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

                          <div className="border-t border-border/50 pt-4 space-y-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/thread/${message.token_id}`)}
                              className="w-full transition-smooth mb-3"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Balas Pesan {replyCounts[message.token_id] ? `(${replyCounts[message.token_id]})` : ''}
                            </Button>

                            <p className="text-xs text-muted-foreground mb-3">Reaksi:</p>
                            <div className="flex gap-2 flex-wrap">
                              {Object.entries(reactionIcons).map(([type, Icon]) => {
                                const hasReacted = reactions[message.token_id]?.some(
                                  (r) => r.reaction_type === type
                                );
                                return (
                                  <Button
                                    key={type}
                                    variant={hasReacted ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => handleReaction(message.token_id, type)}
                                    className="transition-bounce hover:scale-110"
                                    disabled={hasReacted}
                                  >
                                    <Icon className="h-4 w-4 mr-1" />
                                    {reactionLabels[type as keyof typeof reactionLabels]}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="sent">
                  {sentMessages.length === 0 ? (
                    <Card className="p-12 text-center glass-bottle">
                      <p className="text-muted-foreground">
                        Belum ada pesan terkirim. 📨
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {sentMessages.map((message) => (
                        <Card
                          key={message.id}
                          className="p-6 glass-bottle hover:scale-[1.02] transition-bounce animate-float"
                          style={{
                            animationDelay: `${Math.random() * 2}s`,
                          }}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-2xl">{message.mood_emoji}</span>
                                <h3 className="text-lg font-semibold text-foreground">
                                  Pesan Anda
                                </h3>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(message.created_at), "PPp")}
                              </p>
                            </div>
                          </div>

                          <p className="text-foreground whitespace-pre-wrap mb-4">{message.content}</p>

                          {message.spotify_uri && (
                            <div className="mb-4">
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

                          <div className="border-t border-border/50 pt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/thread/${message.token_id}`)}
                              className="w-full transition-smooth"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Lihat Percakapan {replyCounts[message.token_id] ? `(${replyCounts[message.token_id]})` : ''}
                            </Button>
                            
                            {reactions[message.token_id] && reactions[message.token_id].length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs text-muted-foreground mb-2">Reaksi diterima:</p>
                                <div className="flex gap-2 flex-wrap">
                                  {reactions[message.token_id].map((reaction) => {
                                    const Icon = reactionIcons[reaction.reaction_type as keyof typeof reactionIcons];
                                    return (
                                      <div key={reaction.id} className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Icon className="h-4 w-4" />
                                        {reactionLabels[reaction.reaction_type as keyof typeof reactionLabels]}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inbox;

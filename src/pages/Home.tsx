import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Waves, LogOut, Send, Inbox } from "lucide-react";
import { toast } from "sonner";
import Notifications from "@/components/Notifications";

interface Profile {
  id: string;
  display_name: string;
}

const Home = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchProfiles();
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

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("display_name");

      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-wave relative overflow-hidden">
      {currentUserId && <Notifications userId={currentUserId} />}
      {/* Animated ocean background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-ocean/5 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-secondary/10 to-transparent animate-wave" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Waves className="h-8 w-8 text-primary animate-float" />
              <h1 className="text-2xl font-bold text-primary">Message in a Bottle</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/inbox")}
                className="transition-smooth"
              >
                <Inbox className="h-4 w-4 mr-2" />
                Inbox
              </Button>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="transition-smooth"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Send your feelings adrift 🌊
              </h2>
              <p className="text-lg text-muted-foreground">
                Choose someone to send an anonymous message to
              </p>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profiles
                  .filter((profile) => profile.id !== currentUserId)
                  .map((profile) => (
                    <Card
                      key={profile.id}
                      className="p-6 glass-bottle hover:scale-105 transition-bounce cursor-pointer group"
                      onClick={() => navigate(`/compose/${profile.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-smooth">
                            {profile.display_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">Send a bottle</p>
                        </div>
                        <Send className="h-5 w-5 text-secondary group-hover:scale-110 transition-bounce" />
                      </div>
                    </Card>
                  ))}
              </div>
            )}

            {!loading && profiles.filter((p) => p.id !== currentUserId).length === 0 && (
              <Card className="p-12 text-center glass-bottle">
                <p className="text-muted-foreground">
                  No other users yet. Invite your friends to join! 💙
                </p>
              </Card>
            )}

            {/* Wave Feed Statistics */}
            <div className="mt-16 text-center space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Wave Feed
              </h3>
              <div className="flex justify-center gap-8 text-sm text-muted-foreground">
                <span>🌊 {profiles.length} sailors aboard</span>
                <span>💌 Messages floating across the sea</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Home;

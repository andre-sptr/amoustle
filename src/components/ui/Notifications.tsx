import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RealtimeChannel } from "@supabase/supabase-js";

interface NotificationsProps {
  userId: string;
}

const Notifications = ({ userId }: NotificationsProps) => {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    console.log("Setting up notifications for user:", userId);

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel("messages-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          console.log("New message received:", payload);
          toast("💌 Pesan baru diterima!", {
            description: "Seseorang mengirim botol untuk Anda",
          });
        }
      )
      .subscribe();

    // Subscribe to reactions
    const reactionsChannel = supabase
      .channel("reactions-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "reactions",
        },
        async (payload) => {
          console.log("New reaction:", payload);
          
          // Check if this reaction is for the user's sent message
          const { data: message } = await supabase
            .from("messages")
            .select("sender_id, token_id")
            .eq("token_id", payload.new.message_token)
            .single();

          if (message && message.sender_id === userId) {
            const reactionLabels: Record<string, string> = {
              like: "menyukai",
              funny: "tertawa dengan",
              touching: "terharu dengan",
              surprising: "terkejut dengan",
              appreciated: "menghargai",
              intriguing: "tertarik dengan",
            };

            const label = reactionLabels[payload.new.reaction_type] || "bereaksi terhadap";
            toast(`❤️ Seseorang ${label} botol Anda!`, {
              description: "Pesan Anda mendapat perhatian",
            });
          }
        }
      )
      .subscribe();

    // Subscribe to replies
    const repliesChannel = supabase
      .channel("replies-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "replies",
        },
        async (payload) => {
          console.log("New reply:", payload);
          
          // Check if this reply is for the user's message
          const { data: message } = await supabase
            .from("messages")
            .select("sender_id, recipient_id")
            .eq("token_id", payload.new.message_token)
            .single();

          if (message && (message.sender_id === userId || message.recipient_id === userId)) {
            toast("💬 Balasan baru!", {
              description: "Seseorang membalas pesan Anda",
            });
          }
        }
      )
      .subscribe();

    return () => {
      console.log("Cleaning up notification subscriptions");
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
      supabase.removeChannel(repliesChannel);
    };
  }, [userId]);

  return null;
};

export default Notifications;

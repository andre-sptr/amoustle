import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Music, Search, X } from "lucide-react";
import { toast } from "sonner";

interface Track {
  id: string;
  name: string;
  artist: string;
  album_art: string;
  uri: string;
  preview_url: string | null;
}

interface SpotifySearchProps {
  onSelectTrack: (track: Track) => void;
  selectedTrack: Track | null;
}

const SpotifySearch = ({ onSelectTrack, selectedTrack }: SpotifySearchProps) => {
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Masukkan nama lagu atau artis");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("spotify-search", {
        body: { query },
      });

      if (error) throw error;

      setTracks(data.tracks || []);
      if (data.tracks.length === 0) {
        toast.info("Tidak ada lagu ditemukan");
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast.error("Gagal mencari lagu");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrack = (track: Track) => {
    onSelectTrack(track);
    setShowSearch(false);
    setTracks([]);
    setQuery("");
    toast.success("Lagu ditambahkan! 🎵");
  };

  if (!showSearch && !selectedTrack) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowSearch(true)}
        className="w-full transition-smooth"
      >
        <Music className="h-4 w-4 mr-2" />
        Tambah Lagu dari Spotify
      </Button>
    );
  }

  if (selectedTrack) {
    return (
      <Card className="p-4 glass-bottle">
        <div className="flex items-center gap-3">
          {selectedTrack.album_art && (
            <img
              src={selectedTrack.album_art}
              alt={selectedTrack.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{selectedTrack.name}</h4>
            <p className="text-xs text-muted-foreground truncate">{selectedTrack.artist}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSelectTrack(null as any)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 glass-bottle space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Cari lagu atau artis..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          className="transition-smooth"
        />
        <Button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="transition-smooth"
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowSearch(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {loading && (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      )}

      {tracks.length > 0 && (
        <div className="max-h-64 overflow-y-auto space-y-2">
          {tracks.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => handleSelectTrack(track)}
              className="w-full p-3 flex items-center gap-3 rounded-lg hover:bg-muted/50 transition-smooth text-left"
            >
              {track.album_art && (
                <img
                  src={track.album_art}
                  alt={track.name}
                  className="w-12 h-12 rounded object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{track.name}</h4>
                <p className="text-xs text-muted-foreground truncate">{track.artist}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
};

export default SpotifySearch;

import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAudioPlayer } from "expo-audio";

const SongPreview = ({
  song,
  onRemove,
}: {
  song: any;
  onRemove: () => void;
}) => {
  const player = useAudioPlayer(song.previewUrl);

  const togglePlayback = () => {
    console.log(
      "🎵 Botón presionado. Estado actual:",
      player.playing ? "Sonando" : "Pausado"
    );

    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <View className="bg-zinc-900/90 p-3 pr-4 rounded-2xl flex-row items-center border border-[#5E17EB]/50 relative overflow-hidden shadow-lg shadow-[#5E17EB]/20">
      <View className="relative mr-3">
        <Image
          source={{ uri: song.artworkUrl100 }}
          className="w-16 h-16 rounded-xl bg-zinc-800"
        />
        <View className="absolute inset-0 justify-center items-center z-50">
          <TouchableOpacity
            onPress={togglePlayback}
            className="w-10 h-10 bg-black/40 rounded-full items-center justify-center border border-white/20"
            activeOpacity={0.7}
          >
            {player.playing ? (
              <Ionicons name="pause" size={20} color="white" />
            ) : (
              <Ionicons
                name="play"
                size={20}
                color="white"
                style={{ marginLeft: 2 }}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-lg" numberOfLines={1}>
          {song.trackName}
        </Text>
        <Text className="text-zinc-300 text-sm" numberOfLines={1}>
          {song.artistName}
        </Text>
        <Text className="text-[#5E17EB] text-xs mt-1 font-medium">
          {player.playing ? "Reproduciendo..." : "Vista previa"}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => {
          player.pause();
          onRemove();
        }}
        className="bg-black/40 p-2 rounded-full ml-2 z-50"
      >
        <Ionicons name="close" size={16} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default SongPreview;

import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Define the structure of your Mood/Thread data
interface MoodProps {
  mood: {
    id: string;
    user: {
      name: string;
      username: string;
      pfp: string | null;
    };
    content: string;
    timestamp: string;
    music?: {
      title: string;
      artist: string;
      artwork: string;
    } | null;
    stats: {
      likes: number;
      replies: number;
      reshared: boolean;
    };
  };
}

const MoodCard = ({ mood }: MoodProps) => {
  return (
    <View className="flex-row px-4 py-4 border-b border-zinc-900">
      {/* Left side: Avatar and Thread Line */}
      <View className="items-center mr-3">
        <Image
          source={
            mood.user.pfp
              ? { uri: mood.user.pfp }
              : require("@/assets/noPfp.jpg")
          }
          className="w-12 h-12 rounded-full border border-zinc-800"
        />
        {/* Visual thread line that mimics Twitter/Threads */}
        <View className="w-[1.5px] flex-1 bg-zinc-800 mt-2 rounded-full opacity-50" />
      </View>

      {/* Right side: Content */}
      <View className="flex-1">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <Text className="text-white font-bold text-[15px] mr-1">
              {mood.user.name}
            </Text>
            <Text className="text-zinc-500 text-sm">
              @{mood.user.username} • {mood.timestamp}
            </Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={18} color="#71717a" />
          </TouchableOpacity>
        </View>

        <Text className="text-zinc-200 text-[15px] mt-1 leading-5">
          {mood.content}
        </Text>

        {/* Music Integration Card */}
        {mood.music && (
          <TouchableOpacity
            activeOpacity={0.8}
            className="bg-zinc-900/40 rounded-2xl p-3 mt-3 flex-row items-center border border-white/5"
          >
            <Image
              source={{ uri: mood.music.artwork }}
              className="w-12 h-12 rounded-lg"
            />
            <View className="ml-3 flex-1">
              <Text className="text-white font-bold text-sm" numberOfLines={1}>
                {mood.music.title}
              </Text>
              <Text className="text-zinc-500 text-xs" numberOfLines={1}>
                {mood.music.artist}
              </Text>
            </View>
            <View className="bg-[#5E17EB]/20 p-2 rounded-full">
              <Ionicons name="play" size={16} color="#5E17EB" />
            </View>
          </TouchableOpacity>
        )}

        {/* Interaction Stats */}
        <View className="flex-row justify-between mt-4 pr-10">
          <TouchableOpacity className="flex-row items-center">
            <Ionicons name="chatbubble-outline" size={18} color="#71717a" />
            <Text className="text-zinc-500 ml-2 text-xs">
              {mood.stats.replies}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center">
            <Ionicons
              name="repeat-outline"
              size={20}
              color={mood.stats.reshared ? "#10b981" : "#71717a"}
            />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center">
            <Ionicons name="heart-outline" size={20} color="#71717a" />
            <Text className="text-zinc-500 ml-2 text-xs">
              {mood.stats.likes}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity>
            <Ionicons name="share-social-outline" size={18} color="#71717a" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default MoodCard;

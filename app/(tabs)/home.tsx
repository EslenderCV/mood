import { View, FlatList, RefreshControl } from "react-native";
import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import TopBar from "@/components/TopBar";
import MoodCard from "@/components/MoodCard";

const Home = () => {
  const [refreshing, setRefreshing] = useState(false);

  // Mock data representing Mood threads
  const [moods] = useState([
    {
      id: "1",
      user: {
        name: "Eslender Cruz",
        username: "eslendercruz",
        pfp: null, // This will trigger your noPfp.jpg
      },
      content:
        "This Kendrick Lamar track is literally on repeat all day. The production is insane. 🎧",
      timestamp: "2h",
      music: {
        title: "Money Trees",
        artist: "Kendrick Lamar",
        artwork:
          "https://i.scdn.co/image/ab67616d0000b273d28d2ebdedb220e479743797",
      },
      stats: { likes: 24, replies: 5, reshared: false },
    },
    {
      id: "2",
      user: {
        name: "Kanye West",
        username: "ye",
        pfp: "https://hips.hearstapps.com/hmg-prod/images/kanye-west-attends-the-christian-dior-show-as-part-of-the-paris-fashion-week-womenswear-fall-winter-2015-2016-on-march-6-2015-in-paris-france-photo-by-dominique-charriau-wireimage-square.jpg",
      },
      content: "The future of music is here.",
      timestamp: "5h",
      music: null,
      stats: { likes: 1205, replies: 432, reshared: true },
    },
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    // You would fetch real data from Appwrite here
    setTimeout(() => setRefreshing(false), 2000);
  };

  return (
    <SafeAreaView className="bg-black h-full">
      <TopBar />
      <FlatList
        data={moods}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MoodCard mood={item} />}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5E17EB"
          />
        }
      />
    </SafeAreaView>
  );
};

export default Home;

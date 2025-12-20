import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState, useRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";

// Mock de Mensajes Iniciales
const INITIAL_MESSAGES = [
  {
    id: "1",
    text: "Hey! Did you listen to the new album?",
    sender: "other",
    time: "10:00 AM",
  },
  {
    id: "2",
    text: "Yeah! It's absolute fire 🔥",
    sender: "me",
    time: "10:05 AM",
  },
  {
    id: "3",
    text: "Check this track out, it's my fav:",
    sender: "other",
    time: "10:06 AM",
  },
  {
    id: "4",
    type: "song",
    song: {
      title: "Money Trees",
      artist: "Kendrick Lamar",
      cover: "https://i.scdn.co/image/ab67616d0000b2731ea0c62b2339cbf493a999ad",
    },
    sender: "other",
    time: "10:06 AM",
  },
  { id: "5", text: "Vibra durísima 🇩🇴", sender: "me", time: "10:10 AM" },
];

const ChatDetail = () => {
  const router = useRouter();
  const { name, avatar } = useLocalSearchParams();
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = () => {
    if (!inputText.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      text: inputText,
      sender: "me",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([...messages, newMsg]);
    setInputText("");
    // Scroll al final
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender === "me";

    return (
      <View
        className={`mb-4 flex-row ${isMe ? "justify-end" : "justify-start"}`}
      >
        {!isMe && (
          <Image
            source={{ uri: avatar as string }}
            className="w-8 h-8 rounded-full bg-zinc-800 mr-2 self-end mb-1"
          />
        )}

        <View
          className={`max-w-[75%] p-3 rounded-2xl ${
            isMe
              ? "bg-[#5E17EB] rounded-tr-none"
              : "bg-zinc-800 rounded-tl-none"
          }`}
        >
          {/* Si es una canción compartida */}
          {item.type === "song" ? (
            <TouchableOpacity className="flex-row items-center bg-black/20 p-2 rounded-xl">
              <Image
                source={{ uri: item.song.cover }}
                className="w-12 h-12 rounded-lg"
              />
              <View className="ml-3 mr-2">
                <Text className="text-white font-bold text-sm">
                  {item.song.title}
                </Text>
                <Text className="text-white/70 text-xs">
                  {item.song.artist}
                </Text>
              </View>
              <Ionicons name="play-circle" size={28} color="white" />
            </TouchableOpacity>
          ) : (
            <Text className="text-white text-[15px]">{item.text}</Text>
          )}

          <Text
            className={`text-[10px] mt-1 text-right ${
              isMe ? "text-white/70" : "text-zinc-500"
            }`}
          >
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      {/* Header Chat */}
      <View className="px-4 py-3 flex-row items-center border-b border-zinc-900 justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Image
            source={{ uri: avatar as string }}
            className="w-10 h-10 rounded-full bg-zinc-800 border border-white/10"
          />
          <View className="ml-3">
            <Text className="text-white font-bold text-base">{name}</Text>
            <Text className="text-[#5E17EB] text-xs font-medium">En línea</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons name="call-outline" size={24} color="#5E17EB" />
        </TouchableOpacity>
      </View>

      {/* Lista de Mensajes */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={{ padding: 16 }}
        className="flex-1"
      />

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={10}
      >
        <View className="px-4 py-2 bg-black border-t border-zinc-900 flex-row items-center pb-6">
          <TouchableOpacity className="mr-3">
            <Ionicons name="add-circle" size={28} color="#71717A" />
          </TouchableOpacity>
          <View className="flex-1 bg-zinc-900 rounded-full px-4 py-2 border border-zinc-800 flex-row items-center">
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message..."
              placeholderTextColor="#71717A"
              className="flex-1 text-white h-10"
            />
            <TouchableOpacity onPress={sendMessage}>
              <Text
                className={`font-bold ${
                  inputText ? "text-[#5E17EB]" : "text-zinc-600"
                }`}
              >
                Send
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChatDetail;

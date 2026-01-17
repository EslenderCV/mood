import React, { useState, useEffect } from "react";
import {
  Modal,
  TouchableWithoutFeedback,
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Image,
} from "react-native";
import { useLanguage } from "@/context/LanguageContext";
import { getUser } from "@/lib/appwrite";
import { router } from "expo-router";

interface ViewersModalProps {
  visible: boolean;
  onClose: () => void;
  viewerIds: string[];
}

const ViewersModal = ({ visible, onClose, viewerIds }: ViewersModalProps) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    const fetchViewers = async () => {
      if (!visible || !viewerIds || viewerIds.length === 0) {
        setUsers([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const promises = viewerIds.map((id: string) => getUser(id));
        const results = await Promise.all(promises);
        setUsers(results.filter((u) => u !== null));
      } catch (error) {
        console.log("Error fetching viewers", error);
      } finally {
        setLoading(false);
      }
    };
    fetchViewers();
  }, [visible, viewerIds]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/50">
          <TouchableWithoutFeedback>
            <View className="bg-[#18181B] rounded-t-[32px] h-[60%] w-full overflow-hidden">
              <View className="w-12 h-1.5 bg-zinc-700 rounded-full self-center mt-4 mb-4" />
              <Text className="text-white text-center font-bold text-lg mb-4 border-b border-zinc-800 pb-4">
                {t("story.seenBy")} {users.length}
              </Text>
              {loading ? (
                <ActivityIndicator
                  color="#5E17EB"
                  size="large"
                  className="mt-10"
                />
              ) : (
                <FlatList
                  data={users}
                  keyExtractor={(item) => item.$id}
                  contentContainerStyle={{ padding: 20 }}
                  ListEmptyComponent={
                    <Text className="text-zinc-500 text-center mt-10">
                      {t("story.noViews")}
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        onClose();
                        router.push(`/user/${item.$id}` as any);
                      }}
                      className="flex-row items-center mb-5"
                    >
                      <Image
                        source={
                          item.avatar || item.pfp
                            ? { uri: item.avatar || item.pfp }
                            : require("@/assets/noPfp.jpg")
                        }
                        className="w-12 h-12 rounded-full bg-zinc-800 mr-4"
                      />
                      <View>
                        <Text className="text-white font-bold text-base">
                          {item.username}
                        </Text>
                        {item.name && (
                          <Text className="text-zinc-400 text-xs">
                            {item.name}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ViewersModal;

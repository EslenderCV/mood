import React, { useState, useEffect, useRef } from "react";
import { View, Modal, FlatList, Dimensions, ViewToken } from "react-native";
import FullScreenPostItem from "./FullScreenPostItem";

const { height } = Dimensions.get("window");

const PlayerPostModal = ({
  visible,
  onClose,
  initialIndex,
  postsList,
  currentUser,
  onOption,
}: any) => {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setActiveIndex(initialIndex);
  }, [visible, initialIndex]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <FlatList
          data={postsList}
          keyExtractor={(item) => item.$id}
          renderItem={({ item, index }) => (
            <FullScreenPostItem
              item={item}
              isActive={index === activeIndex}
              currentUser={currentUser}
              onOption={onOption}
              onClose={onClose}
            />
          )}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: height,
            offset: height * index,
            index,
          })}
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
        />
      </View>
    </Modal>
  );
};

export default PlayerPostModal;

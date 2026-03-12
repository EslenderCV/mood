import React from "react";
import PostModal from "@/components/postModal/PostModal";
import CreatorModal from "@/components/home/CreatorModal";
import StoryCreationModal from "@/components/home/StoryCreationModal";
import StoryViewer from "@/components/home/StoryViewer";
import DirectShareSheet from "@/components/home/DirectShareSheet";
import MoodShareCard from "@/components/MoodShareCard";
import OptionsModal from "@/components/OptionsModal";
import ShareModal from "@/components/ShareModal";
import { createStory, deletePost } from "@/lib/appwrite";

// Helpers internos que solo se usan en los modales
const RANDOM_SEARCH_TERMS = [
  "global top 50",
  "viral hits",
  "pop hits",
  "lo-fi beats",
  "rock classics",
];

const searchSongsWrapper = async (query: string) => {
  try {
    const response = await fetch(
      `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=15`,
    );
    const data = await response.json();
    return data.data.map((track: any) => ({
      id: track.id.toString(),
      title: track.title,
      artist: track.artist.name,
      cover: track.album.cover_medium || track.album.cover_big,
      preview: track.preview,
      duration: track.duration,
    }));
  } catch {
    return [];
  }
};

interface HomeModalsProps {
  logic: any; // Tipamos como any por practicidad, o usa ReturnType<typeof useHomeLogic>
  isDark: boolean;
}

const HomeModals = ({ logic, isDark }: HomeModalsProps) => {
  // Función interna para manejar borrado
  const handleDeleteAction = () => {
    if (logic.selectedPost) {
      deletePost(logic.selectedPost.$id).then(() => logic.onRefresh());
      logic.toggleModal("isOptions", false);
    }
  };

  return (
    <>
      <PostModal />

      <CreatorModal
        visible={logic.modals.isCreator}
        onClose={() => logic.toggleModal("isCreator", false)}
        onMusic={() => {
          logic.toggleModal("isCreator", false);
          setTimeout(() => {
            logic.setStoryInitialSongData(null);
            logic.toggleModal("isCreation", true);
          }, 300);
        }}
        onGallery={() => {
          if (logic.handleMoodMediaPick) logic.handleMoodMediaPick();
        }}
      />

      <StoryCreationModal
        visible={logic.modals.isCreation}
        onClose={() => logic.toggleModal("isCreation", false)}
        currentUser={logic.user}
        onSuccess={() => logic.fetchAuxiliaryData()}
        initialSongData={logic.storyInitialSongData}
        createStory={createStory}
        searchSongsWrapper={searchSongsWrapper}
        RANDOM_SEARCH_TERMS={RANDOM_SEARCH_TERMS}
      />

      <StoryViewer
        visible={logic.modals.isStoryViewer}
        onClose={() => {
          logic.toggleModal("isStoryViewer", false);
          logic.fetchAuxiliaryData();
        }}
        group={logic.activeStoryGroup}
        currentUserId={logic.user?.$id}
        onAddMore={() => {
          logic.setStoryInitialSongData(null);
          logic.toggleModal("isCreation", true);
        }}
        onRefreshFeed={() => logic.fetchAuxiliaryData()}
        moodOfficialId={logic.MOOD_OFFICIAL_ID}
      />

      <DirectShareSheet
        visible={logic.modals.isShareSelector}
        onClose={() => logic.toggleModal("isShareSelector", false)}
        contacts={logic.shareContacts}
        isDark={isDark}
        isLoadingContacts={logic.isLoadingContacts}
        onSearch={logic.handleShareSearch}
        onSend={logic.handleSendShare}
        onAddToStory={logic.handleAddStoryFromPost}
        onViralCard={() => {
          logic.toggleModal("isShareSelector", false);
          setTimeout(() => logic.toggleModal("isViral", true), 300);
        }}
        onSystemShare={logic.handleSystemShare}
        onCopyLink={logic.handleCopyLink}
      />

      <MoodShareCard
        isVisible={logic.modals.isViral}
        onClose={() => logic.toggleModal("isViral", false)}
        post={logic.getViralPostData()}
      />

      <OptionsModal
        isVisible={logic.modals.isOptions}
        onClose={() => logic.toggleModal("isOptions", false)}
        onDelete={handleDeleteAction}
        onReport={() => logic.toggleModal("isOptions", false)}
        isOwner={
          logic.user?.$id ===
          (logic.selectedPost?.postedBy?.$id ||
            logic.selectedPost?.creator?.$id)
        }
      />

      <ShareModal
        isVisible={logic.modals.isShare}
        onClose={() => logic.toggleModal("isShare", false)}
        postId={logic.sharePostId}
      />
    </>
  );
};

export default HomeModals;

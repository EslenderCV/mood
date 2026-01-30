import React from "react";
// Importamos los modales originales
import DirectShareSheet from "@/components/home/DirectShareSheet";
import StoryCreationModal from "@/components/home/StoryCreationModal";
import OptionsModal from "@/components/OptionsModal";
import ShareModal from "@/components/ShareModal";
import MoodShareCard from "@/components/MoodShareCard";

interface PostModalsProps {
  // Visibilidad
  visibilities: {
    isShareSelector: boolean;
    isCreation: boolean;
    isOptions: boolean;
    isShare: boolean;
    isViral: boolean;
  };
  // Setters de Visibilidad
  onClose: {
    shareSelector: () => void;
    creation: () => void;
    options: () => void;
    share: () => void;
    viral: () => void;
  };
  // Datos y Acciones
  shareContacts: any[];
  isDark: boolean;
  isLoadingContacts: boolean;
  onSearchContacts: (text: string) => void;
  onSendShare: (users: string[], msg: string) => void;
  onAddToStory: () => void;
  onViralCardOpen: () => void;
  onSystemShare: () => void;
  onCopyLink: () => void;
  currentUser: any;
  storyInitialSongData: any;
  createStory: any;
  searchSongsWrapper: any;
  RANDOM_SEARCH_TERMS: string[];
  onDelete: () => void;
  onReport: () => void;
  isOwner: boolean;
  postId: string;
  viralPostData: any;
}

export const PostModals = (props: PostModalsProps) => {
  return (
    <>
      <DirectShareSheet
        visible={props.visibilities.isShareSelector}
        onClose={props.onClose.shareSelector}
        contacts={props.shareContacts}
        isDark={props.isDark}
        isLoadingContacts={props.isLoadingContacts}
        onSearch={props.onSearchContacts}
        onSend={props.onSendShare}
        onAddToStory={props.onAddToStory}
        onViralCard={props.onViralCardOpen}
        onSystemShare={props.onSystemShare}
        onCopyLink={props.onCopyLink}
      />

      <StoryCreationModal
        visible={props.visibilities.isCreation}
        onClose={props.onClose.creation}
        currentUser={props.currentUser}
        onSuccess={props.onClose.creation}
        initialSongData={props.storyInitialSongData}
        createStory={props.createStory}
        searchSongsWrapper={props.searchSongsWrapper}
        RANDOM_SEARCH_TERMS={props.RANDOM_SEARCH_TERMS}
      />

      <OptionsModal
        isVisible={props.visibilities.isOptions}
        onClose={props.onClose.options}
        onDelete={props.onDelete}
        onReport={props.onReport}
        isOwner={props.isOwner}
      />

      <ShareModal
        isVisible={props.visibilities.isShare}
        onClose={props.onClose.share}
        postId={props.postId}
      />

      <MoodShareCard
        isVisible={props.visibilities.isViral}
        onClose={props.onClose.viral}
        post={props.viralPostData}
      />
    </>
  );
};

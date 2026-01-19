import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";
import { BottomSheetModal } from "@gorhom/bottom-sheet";

interface CommentsModalContextType {
  openComments: (postId: string) => void;
  closeComments: () => void;
  postId: string | null;
  // 🛠️ CORRECCIÓN: Permitimos 'null' explícitamente en el tipo del Ref
  sheetRef: React.RefObject<BottomSheetModal | null>;
}

const CommentsModalContext = createContext<
  CommentsModalContextType | undefined
>(undefined);

export const CommentsModalProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [postId, setPostId] = useState<string | null>(null);

  // Inicializamos el ref correctamente
  const sheetRef = useRef<BottomSheetModal>(null);

  const openComments = useCallback((id: string) => {
    setPostId(id);
    sheetRef.current?.present();
  }, []);

  const closeComments = useCallback(() => {
    sheetRef.current?.dismiss();
    setPostId(null);
  }, []);

  return (
    <CommentsModalContext.Provider
      value={{ openComments, closeComments, postId, sheetRef }}
    >
      {children}
    </CommentsModalContext.Provider>
  );
};

export const useCommentsModal = () => {
  const context = useContext(CommentsModalContext);
  if (!context)
    throw new Error(
      "useCommentsModal must be used within a CommentsModalProvider",
    );
  return context;
};

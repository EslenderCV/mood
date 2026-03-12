import React, { createContext, useContext, useState, ReactNode } from "react";

type ModalContextType = {
  isPostModalVisible: boolean;
  setPostModalVisible: (visible: boolean) => void;
};

const ModalContext = createContext<ModalContextType>({
  isPostModalVisible: false,
  setPostModalVisible: () => {},
});

export const ModalProvider = ({ children }: { children: ReactNode }) => {
  const [isPostModalVisible, setPostModalVisible] = useState(false);

  return (
    <ModalContext.Provider value={{ isPostModalVisible, setPostModalVisible }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);

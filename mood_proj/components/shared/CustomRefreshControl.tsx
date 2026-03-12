import React from "react";
import { RefreshControl, RefreshControlProps } from "react-native";

// Color Morado Mood
const MOOD_PURPLE = "#5E17EB";
// Fondo oscuro para el círculo en Android
const DARK_BG = "#121212"; 

export const CustomRefreshControl = (props: RefreshControlProps) => {
  return (
    <RefreshControl
      // --- CONFIGURACIÓN IOS ---
      tintColor={MOOD_PURPLE} 
      titleColor={MOOD_PURPLE}
      style={{ backgroundColor: 'transparent' }} // Asegura que no tenga fondo gris
      
      // --- CONFIGURACIÓN ANDROID ---
      colors={[MOOD_PURPLE]} 
      progressBackgroundColor={DARK_BG} 
      
      // Props heredadas
      {...props}
    />
  );
};
import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const CustomSplashScreen = () => {
  return (
    <View style={styles.container}>
      <Image 
        // Usamos EXACTAMENTE la misma imagen que en app.json
        source={require('@/assets/images/splash-full.png')} 
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Fondo negro puro
    justifyContent: 'center',
    alignItems: 'center',
    // Aseguramos que ocupe toda la pantalla
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99999,
  },
  image: {
    // La imagen debe llenar el contenedor manteniendo su aspecto
    width: width,
    height: height,
  },
});

export default CustomSplashScreen;
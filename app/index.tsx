import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Redirect, router } from 'expo-router';
import { useGlobalContext } from '@/context/GlobalProvider';
import { LinearGradient } from 'expo-linear-gradient';
// import { BlurView } from 'expo-blur'; 
import { useLanguage } from '@/context/LanguageContext';

const { width, height } = Dimensions.get('window');

// --- COMPONENTE PARA ANIMACIÓN AL PULSAR BOTONES ---
const ScalePressable = ({ children, onPress, style }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
    if (onPress) onPress();
  };

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} style={style}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const Index = () => {
  const { loading, loggedIn } = useGlobalContext();
  const { t } = useLanguage();
  
  // Valores de Animación
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const slideTextAnim = useRef(new Animated.Value(30)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // SECUENCIA DE ENTRADA LENTA
    Animated.sequence([
      Animated.delay(300),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 30,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1200, 
          useNativeDriver: true,
        }),
        Animated.timing(slideTextAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      // Latido infinito
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  }, []);

  if (loading)
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }]}>
        {/* Spinner o logo simple de carga si fuera necesario */}
      </View>
    );

  if (!loading && loggedIn) return <Redirect href="/home" />;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* --- FONDO PANTALLA COMPLETA NÍTIDO --- */}
      <Image 
        source={require('@/assets/onBoardingBG.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <SafeAreaView style={styles.contentContainer}>
        
        {/* --- HEADER --- */}
        <Animated.View style={[styles.headerContainer, { opacity: fadeAnim, transform: [{ translateY: slideTextAnim }] }]}>
          <Text style={styles.title}>Welcome to</Text>
        </Animated.View>

        {/* --- CENTER: LOGO + TEXTO GRANDE --- */}
        <View style={styles.centerWrapper}>
            
            {/* CONTENEDOR DEL LOGO */}
            {/* Eliminamos la capa separada 'glowLayer'. El brillo se maneja en los estilos de este contenedor */}
            <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }] }]}>
                <View style={styles.clippingContainer}>
                    <Animated.Image
                        source={require('@/assets/fullLogo_Negro.png')}
                        style={[styles.logoImage, { transform: [{ scale: pulseAnim }] }]}
                        resizeMode="contain" 
                    />
                </View>
            </Animated.View>

            {/* TEXTO EN DOS LINEAS */}
            <Animated.Text style={[styles.vibeTogetherText, { opacity: fadeAnim }]}>
              Vibe{'\n'}Together
            </Animated.Text>
        </View>

        {/* --- FOOTER --- */}
        <Animated.View style={[styles.bottomContainer, { opacity: fadeAnim, transform: [{ translateY: slideTextAnim }] }]}>
          <Text style={styles.tagline}>
            Discover, Share and connect through music
          </Text>

          {/* Get Started Button */}
          <ScalePressable 
            onPress={() => router.push('/signUp' as any)} 
            style={styles.buttonShadow}
          >
            <LinearGradient
              colors={['#6d28d9', '#5E17EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </LinearGradient>
          </ScalePressable>

          {/* Login Link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <ScalePressable onPress={() => router.push('/signIn' as any)}>
              <Text style={styles.loginLink}>Log in</Text>
            </ScalePressable>
          </View>
        </Animated.View>

      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', 
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between', 
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30, 
  },
  
  // Header
  headerContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },

  // Center Logo Area
  centerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -40, 
    position: 'relative', 
  },

  logoContainer: {
    width: 220, 
    height: 220, 
    backgroundColor: 'transparent', 
    borderRadius: 45,
    
    // SOMBRA / GLOW
    // Esto funciona perfecto en iOS para dar el brillo morado.
    shadowColor: "#5E17EB",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, // Intensidad del brillo
    shadowRadius: 40,   // Difusión del brillo

    // FIX PARA ANDROID:
    // En Android, 'elevation' con fondo transparente crea un cuadro negro/gris feo.
    // Lo desactivamos (0) para que se vea limpio el PNG transparente.
    elevation: 0, 
  },

  clippingContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    borderRadius: 45,
    overflow: 'hidden',
    backgroundColor: 'transparent', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoImage: {
    width: '100%', 
    height: '100%',
  },
  
  vibeTogetherText: {
    fontSize: 42, 
    fontWeight: '800', 
    color: '#FFFFFF', 
    textAlign: 'center',
    marginTop: 30, 
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    lineHeight: 46,
  },

  // Footer
  bottomContainer: {
    alignItems: 'center',
  },
  tagline: {
    color: '#D4D4D8',
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 35, 
    opacity: 0.9,
    paddingHorizontal: 20,
  },
  buttonShadow: {
    width: '100%',
    marginBottom: 20,
    shadowColor: "#5E17EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButton: {
    width: '100%',
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  loginText: {
    color: '#A1A1AA',
    fontSize: 15,
  },
  loginLink: {
    color: '#8B5CF6',
    fontSize: 15,
    fontWeight: 'bold',
    marginLeft: 5,
    padding: 5,
  },
});

export default Index;
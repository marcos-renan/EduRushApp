import LottieView from "lottie-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "../theme/app-theme";

type EnergyChipProps = {
  value: number;
};

const SLOT_HEIGHT = 16;

export function EnergyChip({ value }: EnergyChipProps) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  const { colors } = useAppTheme();

  const [displayValue, setDisplayValue] = useState(safeValue);
  const [incomingValue, setIncomingValue] = useState<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [showPulse, setShowPulse] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const previousValueRef = useRef(safeValue);

  const slide = useRef(new Animated.Value(0)).current;
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const previousValue = previousValueRef.current;

    if (safeValue === previousValue) {
      return;
    }

    previousValueRef.current = safeValue;
    const nextDirection: 1 | -1 = safeValue > previousValue ? 1 : -1;

    setDisplayValue(previousValue);
    setDirection(nextDirection);
    setIncomingValue(safeValue);
    slide.setValue(0);

    Animated.timing(slide, {
      toValue: 1,
      duration: 190,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setDisplayValue(safeValue);
      setIncomingValue(null);
      slide.setValue(0);
    });

    setShowPulse(true);
    setPulseKey((prev) => prev + 1);

    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current);
    }

    pulseTimerRef.current = setTimeout(() => {
      setShowPulse(false);
    }, 650);
  }, [safeValue, slide]);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) {
        clearTimeout(pulseTimerRef.current);
      }
    };
  }, []);

  const outgoingTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [0, direction === 1 ? -SLOT_HEIGHT : SLOT_HEIGHT],
  });

  const incomingTranslateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [direction === 1 ? SLOT_HEIGHT : -SLOT_HEIGHT, 0],
  });

  return (
    <View style={[styles.chip, { backgroundColor: colors.cardMutedBackground, borderColor: colors.border }]}>
      <View style={styles.iconWrap}>
        <Image source={require("../../assets/icons/energy.png")} style={styles.icon} />
        {showPulse ? (
          <View pointerEvents="none" style={styles.pulseWrap}>
            <LottieView
              key={`energy-pulse-${pulseKey}`}
              source={require("../../assets/animations/energy.json")}
              autoPlay
              loop={false}
              style={styles.pulse}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.slotViewport}>
        {incomingValue === null ? (
          <Text style={[styles.valueText, { color: colors.primary }]}>{displayValue}</Text>
        ) : (
          <>
            <Animated.Text
              style={[
                styles.valueText,
                { color: colors.primary, transform: [{ translateY: outgoingTranslateY }] },
              ]}
            >
              {displayValue}
            </Animated.Text>
            <Animated.Text
              style={[
                styles.valueText,
                styles.incomingValue,
                { color: colors.primary, transform: [{ translateY: incomingTranslateY }] },
              ]}
            >
              {incomingValue}
            </Animated.Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 30,
    minWidth: 66,
    borderRadius: 999,
    borderWidth: 1,
    paddingLeft: 6,
    paddingRight: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  iconWrap: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 15,
    height: 15,
    resizeMode: "contain",
  },
  pulseWrap: {
    position: "absolute",
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  pulse: {
    width: 36,
    height: 36,
  },
  slotViewport: {
    height: SLOT_HEIGHT,
    minWidth: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  valueText: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: SLOT_HEIGHT,
  },
  incomingValue: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
  },
});

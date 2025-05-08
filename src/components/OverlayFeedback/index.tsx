import { useEffect } from 'react'
import { useWindowDimensions } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated'
import { BlurMask, Canvas, Rect } from '@shopify/react-native-skia'

import { THEME } from '../../styles/theme'

const STATUS = [
  'transparent',
  THEME.COLORS.BRAND_LIGHT,
  THEME.COLORS.DANGER_LIGHT,
]

type Props = {
  status: number
}

export function OverlayFeedback({ status = 0 }: Props) {
  const { width, height } = useWindowDimensions()

  const opacity = useSharedValue(0)

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    }
  })

  const color = STATUS[status]

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 400, easing: Easing.bounce }),
      withTiming(0)
    )
  }, [status])

  return (
    <Animated.View
      style={[
        {
          width,
          height: height + 40, // 40 is header height
          position: 'absolute',
        },
        animatedStyle,
      ]}
    >
      <Canvas style={{ flex: 1 }}>
        <Rect x={0} y={0} width={width} height={height} color={color}>
          <BlurMask blur={50} />
        </Rect>
      </Canvas>
    </Animated.View>
  )
}

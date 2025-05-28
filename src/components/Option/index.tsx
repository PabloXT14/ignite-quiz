import { useEffect } from 'react'
import {
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native'
import { Canvas, Skia, Path, BlurMask } from '@shopify/react-native-skia'
import { useSharedValue, withTiming } from 'react-native-reanimated'

import { styles } from './styles'
import { THEME } from '../../styles/theme'

type Props = TouchableOpacityProps & {
  checked: boolean
  title: string
}

const CHECK_SIZE = 28
const CHECK_STROKE = 2
const RADIUS = (CHECK_SIZE - CHECK_STROKE) / 2

export function Option({ checked, title, ...rest }: Props) {
  const percentage = useSharedValue(0)

  const path = Skia.Path.Make() // O Path é como uma caneta que usamos para desenhar o que quisermos na tela com o react-native-skia.
  path.addCircle(CHECK_SIZE, CHECK_SIZE, RADIUS)

  useEffect(() => {
    if (checked) {
      percentage.value = withTiming(1, { duration: 400 })
    } else {
      percentage.value = withTiming(0, { duration: 400 })
    }
  }, [checked])

  return (
    <TouchableOpacity
      style={[styles.container, checked && styles.checked]}
      {...rest}
    >
      <Text style={styles.title}>{title}</Text>

      <Canvas style={{ width: CHECK_SIZE * 2, height: CHECK_SIZE * 2 }}>
        <Path
          path={path}
          color={THEME.COLORS.GREY_500}
          style="stroke"
          strokeWidth={CHECK_STROKE}
        />

        <Path
          path={path}
          color={THEME.COLORS.BRAND_LIGHT}
          style="stroke"
          strokeWidth={CHECK_STROKE}
          start={0}
          end={percentage}
        >
          <BlurMask blur={1} style="solid" />
        </Path>
      </Canvas>
    </TouchableOpacity>
  )
}

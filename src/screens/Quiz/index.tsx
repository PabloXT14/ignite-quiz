import { useEffect, useState } from 'react'
import { Alert, Text, View } from 'react-native'
import Animated, {
  Easing,
  Extrapolate,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
import { GestureDetector, Gesture } from 'react-native-gesture-handler'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Audio } from 'expo-av'

import { styles } from './styles'
import { THEME } from '../../styles/theme'

import { QUIZ } from '../../data/quiz'
import { historyAdd } from '../../storage/quizHistoryStorage'

import { Loading } from '../../components/Loading'
import { Question } from '../../components/Question'
import { QuizHeader } from '../../components/QuizHeader'
import { ConfirmButton } from '../../components/ConfirmButton'
import { OutlineButton } from '../../components/OutlineButton'
import { ProgressBar } from '../../components/ProgressBar'
import { OverlayFeedback } from '../../components/OverlayFeedback'

import wrong from '@/assets/wrong.mp3'
import correct from '@/assets/correct.mp3'

interface Params {
  id: string
}

type QuizProps = (typeof QUIZ)[0]

const CARD_INCLINATION = 10
const CARD_SKIP_AREA = -200

export function Quiz() {
  const [points, setPoints] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [quiz, setQuiz] = useState<QuizProps>({} as QuizProps)
  const [alternativeSelected, setAlternativeSelected] = useState<null | number>(
    null
  )

  const [shouldAdvance, setShouldAdvance] = useState(false)

  const [statusReply, setStatusReply] = useState(0)

  const shake = useSharedValue(0)
  const scrollY = useSharedValue(0)
  const cardPosition = useSharedValue(0)

  const shakeAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(
            shake.value,
            [0, 0.5, 1, 1.5, 2, 2.5, 3],
            [0, -15, 0, 15, 0, -15, 0]
          ),
        },
        // Alternative 2
        // { translateX: shake.value },
      ],
    }
  })

  const { navigate } = useNavigation()

  const route = useRoute()
  const { id } = route.params as Params

  async function playSound(isCorrect: boolean) {
    const file = isCorrect ? correct : wrong

    // Loading sound
    const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: true })

    // Garante that sound will play from start
    await sound.setPositionAsync(0)

    // Play sound
    await sound.playAsync()
  }

  function shakeAnimation() {
    shake.value = withSequence(
      withTiming(3, { duration: 400, easing: Easing.bounce }),
      withTiming(0, undefined, finished => {
        'worklet' // Para rodar o código a seguir na thread de animação

        if (finished) {
          runOnJS(handleNextQuestion)()
        }
      })
    )

    // Alternative 2
    // shake.value = withSequence(
    //   withTiming(10, { duration: 100 }),
    //   withTiming(-10, { duration: 100 }),
    //   withTiming(0, { duration: 100 })
    // )
  }

  function handleSkipConfirm() {
    Alert.alert('Pular', 'Deseja realmente pular a questão?', [
      { text: 'Sim', onPress: () => handleNextQuestion() },
      { text: 'Não', onPress: () => {} },
    ])
  }

  async function handleFinished() {
    await historyAdd({
      id: new Date().getTime().toString(),
      title: quiz.title,
      level: quiz.level,
      points,
      questions: quiz.questions.length,
    })

    navigate('finish', {
      points: String(points),
      total: String(quiz.questions.length),
    })
  }

  function handleNextQuestion() {
    if (currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prevState => prevState + 1)
    } else {
      handleFinished()
    }
  }

  async function handleConfirm() {
    if (alternativeSelected === null) {
      return handleSkipConfirm()
    }

    if (quiz.questions[currentQuestion].correct === alternativeSelected) {
      setPoints(prevState => prevState + 1) // Ao adicionar pontos, executamos o handleNextQuestion em seguida através de um useEffect
      setShouldAdvance(true)

      await playSound(true)

      setStatusReply(1)
    } else {
      await playSound(false)

      setStatusReply(2)
      shakeAnimation() // Dentro dessa animação executamos o handleNextQuestion
    }

    setAlternativeSelected(null)
  }

  function handleStop() {
    Alert.alert('Parar', 'Deseja parar agora?', [
      {
        text: 'Não',
        style: 'cancel',
      },
      {
        text: 'Sim',
        style: 'destructive',
        onPress: () => navigate('home'),
      },
    ])

    return true
  }

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: event => {
      // contentOffset = posicao do scroll no eixo x e y

      scrollY.value = event.contentOffset.y
    },
  })

  const fixedProgressBarStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      paddingTop: 50,
      backgroundColor: THEME.COLORS.GREY_500,
      width: '110%',
      left: '-5%',
      zIndex: 1,
      opacity: interpolate(scrollY.value, [50, 90], [0, 1], Extrapolate.CLAMP),
      transform: [
        {
          translateY: interpolate(
            scrollY.value,
            [50, 90],
            [-40, 0],
            Extrapolate.CLAMP
          ),
        },
      ],
    }
  })

  const headerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(scrollY.value, [60, 90], [1, 0], Extrapolate.CLAMP),
    }
  })

  const dragStyle = useAnimatedStyle(() => {
    const rotateZ = cardPosition.value / CARD_INCLINATION

    return {
      transform: [
        { translateX: cardPosition.value },
        { rotateZ: `${rotateZ}deg` },
      ],
    }
  })

  // Pan = gesto de arrastar
  const onPan = Gesture.Pan()
    .activateAfterLongPress(100)
    .onUpdate(event => {
      const isMovingLeft = event.translationX < 0

      if (isMovingLeft) {
        cardPosition.value = event.translationX
      }
    })
    .onEnd(event => {
      const canSkipCard = event.translationX <= CARD_SKIP_AREA

      if (canSkipCard) {
        // para executar código javascript na thread de animação (pois a animação ocorre na thread diferente da thread de javascript do componente/app)
        runOnJS(handleSkipConfirm)()
      }

      cardPosition.value = withTiming(0)
    })

  useEffect(() => {
    const quizSelected = QUIZ.filter(item => item.id === id)[0]
    setQuiz(quizSelected)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (shouldAdvance) {
      handleNextQuestion()
      setShouldAdvance(false)
    }
  }, [points])

  if (isLoading) {
    return <Loading />
  }

  return (
    <View style={styles.container}>
      <OverlayFeedback status={statusReply} />

      <Animated.View style={fixedProgressBarStyle}>
        <Text style={styles.title}>{quiz.title}</Text>

        <ProgressBar
          total={quiz.questions.length}
          current={currentQuestion + 1}
        />
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.question}
        onScroll={scrollHandler}
        scrollEventThrottle={16} // for smooth scroll on ios
      >
        <Animated.View style={[styles.header, headerStyle]}>
          <QuizHeader
            title={quiz.title}
            currentQuestion={currentQuestion + 1}
            totalOfQuestions={quiz.questions.length}
          />
        </Animated.View>

        <GestureDetector gesture={onPan}>
          <Animated.View style={[shakeAnimatedStyle, dragStyle]}>
            <Question
              key={quiz.questions[currentQuestion].title}
              question={quiz.questions[currentQuestion]}
              alternativeSelected={alternativeSelected}
              setAlternativeSelected={setAlternativeSelected}
              onUnmount={() => setStatusReply(0)}
            />
          </Animated.View>
        </GestureDetector>

        <View style={styles.footer}>
          <OutlineButton title="Parar" onPress={handleStop} />
          <ConfirmButton onPress={handleConfirm} />
        </View>
      </Animated.ScrollView>
    </View>
  )
}

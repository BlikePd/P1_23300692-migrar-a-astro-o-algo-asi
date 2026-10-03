import { AnimatedToastStack } from "./motion/animated-toast-stack"
import { useToastStore } from "../store/toastStore"

export default function Toaster() {
  const toasts = useToastStore((state) => state.toasts)
  const dismiss = useToastStore((state) => state.dismiss)

  return (
    <AnimatedToastStack
      toasts={toasts}
      onDismiss={dismiss}
      position="bottom-right"
      placement="fixed"
      maxVisible={4}
      classNames={{ root: "toast-reset" }}
    />
  )
}

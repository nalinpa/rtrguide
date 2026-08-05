import { createUI } from "@blacksands/ui";
import { createComponents } from "@blacksands/components";
import { tokens } from "@/lib/ui/tokens";

export const uiKit = createUI(tokens);
export const components = createComponents(tokens, uiKit);

export const {
  AppButton,
  AppText,
  AppIcon,
  AppIconButton,
  CardShell,
  Pill,
  Row,
  Stack,
  Section,
  ErrorCard,
  LoadingState,
  RatingStars,
  OfflineBanner,
  CheckInAction,
  Screen,
} = uiKit;

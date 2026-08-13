import { createUI } from "@blacksands/ui";
import { createComponents, boundingRegionFrom } from "@blacksands/components";
import { tokens } from "@/lib/ui/tokens";

export { boundingRegionFrom };

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

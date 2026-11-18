/**
 * Consumer-facing legal copy used across forms. Placeholder language — have
 * counsel review TCPA / CCPA / finance wording before launch.
 */
import { DEFAULT_DEALER_PROFILE } from "./site.config";

/** TCPA: unchecked-by-default, separate from other consent, not a condition of purchase. */
export const SMS_CONSENT_TEXT = `By checking this box, I agree to receive recurring automated text messages from ${DEFAULT_DEALER_PROFILE.name} about my inquiry and offers at the mobile number provided. Consent is not a condition of purchase. Msg & data rates may apply. Msg frequency varies. Reply STOP to cancel or HELP for help.`;

export const CONTACT_CONSENT_TEXT =
  "By submitting, you agree that we may contact you about your request by email or phone. See our Privacy Policy for how we use your information.";

export const PREQUAL_CONSENT_TEXT =
  "I authorize the dealership and its lending partners to review the information I provide to determine pre-qualification. A pre-qualification request does not affect my credit score. Final approval may require a full credit application.";

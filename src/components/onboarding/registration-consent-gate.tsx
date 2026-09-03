import { RegistrationConsentPopup } from '@/components/onboarding/registration-consent-popup'

/**
 * Drops the sign-up consent card over the page until the profile carries a
 * consent stamp. Rendered by every surface a freshly signed-up person can
 * reach, in place of the redirect to a separate page that used to be here.
 */
export function RegistrationConsentGate({
  agreed,
  isCoordinator,
}: {
  agreed: boolean
  isCoordinator: boolean
}) {
  if (agreed) return null
  return <RegistrationConsentPopup isCoordinator={isCoordinator} />
}

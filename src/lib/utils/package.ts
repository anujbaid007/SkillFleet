export type PackageResult = { error?: string; success?: string }

// create_package / settle_package_payment / upgrade RPC status codes.
export function mapPackageResult(status: string): PackageResult {
  switch (status) {
    case 'ok':
      return { success: 'Done.' }
    case 'failed':
      return { error: 'Payment failed. You can retry from My Packages.' }
    case 'not_parent':
      return { error: 'Only parent accounts can buy packages.' }
    case 'not_linked':
      return { error: 'This student is not linked to your account.' }
    case 'tier_not_found':
      return { error: 'That package tier is no longer available.' }
    case 'already_has_package':
      return { error: 'This child already has an active package. Upgrade it instead of buying another.' }
    case 'not_found':
      return { error: 'Package not found.' }
    case 'not_owner':
      return { error: 'This package belongs to another account.' }
    case 'already_paid':
      return { error: 'This package is already paid for.' }
    case 'package_not_active':
      return { error: 'This package is not active.' }
    case 'not_higher':
      return { error: 'Choose a tier with more slots than your current package.' }
    case 'no_upgrade':
      return { error: 'No upgrade is pending for this package.' }
    default:
      return { error: `Unexpected status: ${status}` }
  }
}

// book_with_package RPC status codes.
export function mapRedeemResult(status: string): PackageResult {
  switch (status) {
    case 'ok':
      return { success: 'Slot redeemed — booking confirmed!' }
    case 'not_parent':
      return { error: 'Only parent accounts can redeem package slots.' }
    case 'package_not_found':
    case 'not_owner':
      return { error: 'Package not found.' }
    case 'package_not_active':
      return { error: 'This package is not active.' }
    case 'package_expired':
      return { error: 'This package has expired.' }
    case 'no_slots':
      return { error: 'No slots left in this package.' }
    case 'offering_not_found':
      return { error: 'Offering not found.' }
    case 'offering_not_live':
      return { error: 'This offering is not currently open for booking.' }
    case 'age_ineligible':
      return { error: "This offering isn't available for the child's age." }
    case 'already_booked':
      return { error: 'This offering is already booked for this child.' }
    default:
      return { error: `Unexpected status: ${status}` }
  }
}

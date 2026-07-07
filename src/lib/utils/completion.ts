export type CompletionResult = { error?: string; success?: string }

export function mapCompletionResult(result: string): CompletionResult {
  switch (result) {
    case 'ok':
      return { success: 'Booking marked complete. Points awarded to student.' }
    case 'not_admin':
      return { error: 'Permission denied.' }
    case 'not_found':
      return { error: 'Booking not found.' }
    case 'already_completed':
      return { error: 'Booking is already marked complete.' }
    case 'cancelled':
      return { error: 'Cannot complete a cancelled booking.' }
    case 'already_scored':
      return { error: 'Scores have already been applied for this booking.' }
    default:
      return { error: `Unexpected status: ${result}` }
  }
}

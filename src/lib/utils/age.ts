export function calculateAge(dateOfBirth: string, today: Date = new Date()): number {
  const dob = new Date(dateOfBirth)
  let age = today.getFullYear() - dob.getFullYear()
  const monthDiff = today.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--
  }
  return age
}

export function isAgeEligible(age: number, minAge: number | null, maxAge: number | null): boolean {
  if (minAge !== null && age < minAge) return false
  if (maxAge !== null && age > maxAge) return false
  return true
}

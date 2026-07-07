export interface OfferingFormData {
  title: string
  type: string
  price_rupees: string
  min_age: string
  max_age: string
}

export interface OfferingErrors {
  title?: string
  type?: string
  price?: string
  age_range?: string
}

const VALID_TYPES = ['workshop', 'trip', 'event', 'competition', 'internship']

export function validateOffering(data: OfferingFormData): OfferingErrors {
  const errors: OfferingErrors = {}

  if (!data.title.trim()) {
    errors.title = 'Title is required.'
  }

  if (!VALID_TYPES.includes(data.type)) {
    errors.type = 'Select a valid type.'
  }

  if (data.price_rupees) {
    const n = Number(data.price_rupees)
    if (isNaN(n) || n < 0) {
      errors.price = 'Price must be a non-negative number.'
    }
  }

  const minAge = Number(data.min_age)
  const maxAge = Number(data.max_age)
  if (data.min_age && data.max_age && minAge > maxAge) {
    errors.age_range = 'Min age must not exceed max age.'
  }

  return errors
}

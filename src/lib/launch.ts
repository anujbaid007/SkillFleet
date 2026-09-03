/*
  Launch switches for the soft-launch phase.

  While these are on, people can browse the whole catalogue and their profile,
  but nothing can be booked and the starter assessment is held back. Each is
  read in exactly the places that would otherwise start the flow, so flipping
  one to false and deploying is all it takes to open it.
*/
export const ASSESSMENT_COMING_SOON = true
export const BOOKINGS_COMING_SOON = true

/*
  Where a student lands after signing in. During the championship season that
  is ISC rather than the dashboard; the sidebar keeps its usual order either
  way. Other roles never reach this: the platform layout sends admins,
  vendors and coordinators to their own consoles first.
*/
export const LANDING_AFTER_LOGIN = '/isc'

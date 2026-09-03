/*
  The moment a request is being served, for server components that compare
  dates. Every page that uses it is already dynamic, so reading the clock per
  request is the intended behaviour; naming it keeps that intent visible
  rather than leaving a bare Date.now() in render, which the React purity
  rule rightly treats as suspect in client code.
*/
export function requestNowMs(): number {
  return Date.now()
}

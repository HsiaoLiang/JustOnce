// Stands in for the server action in src/server/actions/bookings.ts, so the real booking widget
// (calendar, price quote, handover options) works on a static site without sending anything.

export type RequestState = { error?: string } | undefined;

export async function requestBooking(_prev: RequestState, _formData: FormData): Promise<RequestState> {
  return { error: "This is a portfolio demo, so booking requests aren't sent. Run the full app locally to try the whole flow." };
}

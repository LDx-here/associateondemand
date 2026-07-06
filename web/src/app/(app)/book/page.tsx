import { CalendarClock } from "lucide-react";

const bookingUrl = process.env.NEXT_PUBLIC_BOOKING_URL?.trim() ?? "";

export default function BookPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sky-800">
          <CalendarClock className="h-5 w-5" aria-hidden />
          <h1 className="text-2xl font-semibold text-slate-900">Schedule a consultation</h1>
        </div>
        <p className="text-sm text-slate-600">
          Brief overflow-counsel or scope call with Recover My Value. Limited availability — pick a
          time that works for both of us.
        </p>
      </header>

      {bookingUrl ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <iframe
            title="Schedule consultation"
            src={bookingUrl}
            className="h-[640px] w-full border-0"
          />
        </div>
      ) : (
        <section className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
          <p className="font-medium">Booking link not configured yet</p>
          <p className="mt-2 text-amber-900">
            Set <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_BOOKING_URL</code> in Vercel
            to your Google Calendar Appointment Schedule or Cal.com link, then redeploy. See{" "}
            <code className="rounded bg-amber-100 px-1">docs/runbooks/phase0-b2b-overflow-launch.md</code>{" "}
            for setup steps.
          </p>
        </section>
      )}
    </div>
  );
}

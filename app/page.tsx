import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-5xl w-full text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          C06 National Location Identification System
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Vietnam&apos;s National Location Identification Platform
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Link
            href="/commune"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              Commune Officer{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                &rarr;
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Review and process survey submissions from mobile app
            </p>
          </Link>

          <Link
            href="/supervisor"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              Supervisor{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                &rarr;
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Review and approve submissions from commune officers
            </p>
          </Link>

          <Link
            href="/central"
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <h2 className="mb-3 text-2xl font-semibold">
              Central Admin{" "}
              <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
                &rarr;
              </span>
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-50">
              Nationwide oversight, ID generation, and analytics
            </p>
          </Link>
        </div>

        <div className="mt-12">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
          >
            Login to System
          </Link>
        </div>
      </div>
    </main>
  );
}

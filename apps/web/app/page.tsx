export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Turn career goals into meaningful human connections
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600">
          Tulay helps freelancers, career shifters, and independent workers find people who can help them achieve specific goals, and opportunities to help others in return.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <a
            href="/onboarding"
            className="rounded-md bg-blue-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Get Started
          </a>
          <a href="/find-help" className="text-sm font-semibold leading-6 text-gray-900">
            Find Help <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default function FindHelp() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">Find Help</h1>
      <p className="text-gray-600 mb-8">Community members and suggested matches based on complementary needs and offers.</p>
      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
        <p className="text-sm text-yellow-800"><strong>Demo Mode:</strong> Showing example profiles.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1,2,3].map(i => (
          <div key={i} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <h3 className="font-semibold mb-2">Demo User {i}</h3>
            <p className="text-sm text-gray-600 mb-2"><strong>Goal:</strong> Learn and grow in their career</p>
            <p className="text-sm text-gray-600 mb-2"><strong>Needs:</strong> Guidance, feedback</p>
            <p className="text-sm text-gray-600 mb-4"><strong>Can offer:</strong> Experience, advice</p>
            <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-500 text-sm">
              Propose Introduction
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

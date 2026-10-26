export default function Collaborations() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold mb-6">My Collaborations</h1>
      <p className="text-gray-600 mb-8">Track your introductions and collaborative efforts.</p>
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-500 mb-4">No collaborations yet</p>
        <a href="/find-help" className="text-blue-600 hover:text-blue-500 font-medium">Find someone to connect with</a>
      </div>
    </div>
  )
}

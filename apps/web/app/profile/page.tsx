export default function Profile() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
          <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Career Goal</label>
          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3}></textarea>
        </div>
        <button className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-500">
          Save Profile
        </button>
      </div>
    </div>
  )
}

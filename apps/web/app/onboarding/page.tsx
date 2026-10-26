export default function Onboarding() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Create Your Profile</h1>
      <p className="text-gray-600 mb-8">Tell us about yourself so we can find the right connections for you.</p>
      <form className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
          <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Your name" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">What are you trying to accomplish? *</label>
          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3} placeholder="e.g., Land my first freelance client" required></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">What specific help do you need?</label>
          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3} placeholder="e.g., Portfolio review, interview practice"></textarea>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">What skills can you offer in return?</label>
          <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3} placeholder="e.g., Design feedback, social media help"></textarea>
        </div>
        <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-500">
          Create Profile
        </button>
      </form>
    </div>
  )
}

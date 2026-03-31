export default function Signup() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow w-full max-w-sm">
        <h2 className="text-2xl font-semibold mb-6">Create account</h2>
        <input className="w-full border rounded px-3 py-2 mb-4" type="text" placeholder="Full name" />
        <input className="w-full border rounded px-3 py-2 mb-4" type="email" placeholder="Email" />
        <input className="w-full border rounded px-3 py-2 mb-4" type="password" placeholder="Password" />
        <input className="w-full border rounded px-3 py-2 mb-6" type="password" placeholder="Confirm password" />
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Sign Up</button>
        <p className="text-sm text-center mt-4 text-gray-500">
          Already have an account? <a href="/login" className="text-blue-600 hover:underline">Login</a>
        </p>
      </div>
    </div>
  )
}

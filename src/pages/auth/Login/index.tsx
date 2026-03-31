export default function Login() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow w-full max-w-sm">
        <h2 className="text-2xl font-semibold mb-6">Login</h2>
        <input className="w-full border rounded px-3 py-2 mb-4" type="email" placeholder="Email" />
        <input className="w-full border rounded px-3 py-2 mb-6" type="password" placeholder="Password" />
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Sign In</button>
        <p className="text-sm text-center mt-4 text-gray-500">
          <a href="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</a>
        </p>
        <p className="text-sm text-center mt-2 text-gray-500">
          No account? <a href="/signup" className="text-blue-600 hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  )
}

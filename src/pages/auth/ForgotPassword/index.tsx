export default function ForgotPassword() {
  return (
    <div className="flex flex-1 items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow w-full max-w-sm">
        <h2 className="text-2xl font-semibold mb-2">Forgot password</h2>
        <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>
        <input className="w-full border rounded px-3 py-2 mb-6" type="email" placeholder="Email" />
        <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">Send reset link</button>
        <p className="text-sm text-center mt-4 text-gray-500">
          <a href="/login" className="text-blue-600 hover:underline">Back to login</a>
        </p>
      </div>
    </div>
  )
}
